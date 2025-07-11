const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { query, validationResult, body } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');

const structureEventData = (eventRow) => {
    return {
        id: eventRow.event_id,
        name: eventRow.event_name,
        description: eventRow.description,
        start_date: eventRow.start_date,
        duration_in_minutes: eventRow.duration_in_minutes,
        price: eventRow.price,
        enabled_for_enrollment: eventRow.enabled_for_enrollment,
        max_assistance: eventRow.max_assistance,
        event_location: {
            id: eventRow.el_id,
            name: eventRow.el_name,
            full_address: eventRow.el_full_address,
            max_capacity: eventRow.el_max_capacity,
            latitude: eventRow.el_latitude,
            longitude: eventRow.el_longitude,
            location: {
                id: eventRow.loc_id,
                name: eventRow.loc_name,
                latitude: eventRow.loc_latitude,
                longitude: eventRow.loc_longitude,
                province: {
                    id: eventRow.prov_id,
                    name: eventRow.prov_name,
                    full_name: eventRow.prov_full_name,
                    latitude: eventRow.prov_latitude,
                    longitude: eventRow.prov_longitude,
                }
            }
        },
        creator_user: {
            id: eventRow.user_id,
            first_name: eventRow.user_first_name,
            last_name: eventRow.user_last_name,
            username: eventRow.user_username,
        },
        tags: eventRow.tags || []
    };
};

router.get(
    '/',
    [
        query('limit').optional().isInt({ min: 1 }).toInt().default(15),
        query('offset').optional().isInt({ min: 0 }).toInt().default(0),
        query('name').optional().isString().trim(),
        query('startdate').optional().isISO8601().toDate().withMessage('Start date must be a valid date in YYYY-MM-DD format.'),
        query('tag').optional().isString().trim()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { limit, offset, name, startdate, tag } = req.query;

        let whereClauses = [];
        let queryParams = [];
        let paramIndex = 1;

        if (name) {
            whereClauses.push(`e.name ILIKE $${paramIndex++}`);
            queryParams.push(`%${name}%`);
        }
        if (startdate) {
            whereClauses.push(`DATE(e.start_date) = DATE($${paramIndex++})`);
            queryParams.push(startdate);
        }
        if (tag) {
            whereClauses.push(`EXISTS (
                SELECT 1
                FROM event_tags et_filter
                JOIN tags t_filter ON et_filter.id_tag = t_filter.id
                WHERE et_filter.id_event = e.id AND t_filter.name ILIKE $${paramIndex++}
            )`);
            queryParams.push(`%${tag}%`);
        }

        const whereCondition = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const eventsQueryText = `
            SELECT
                e.id AS event_id, e.name AS event_name, e.description, e.start_date, e.duration_in_minutes, e.price,
                e.enabled_for_enrollment, e.max_assistance,
                el.id AS el_id, el.name AS el_name, el.full_address AS el_full_address, el.max_capacity AS el_max_capacity,
                el.latitude AS el_latitude, el.longitude AS el_longitude,
                l.id AS loc_id, l.name AS loc_name, l.latitude AS loc_latitude, l.longitude AS loc_longitude,
                p.id AS prov_id, p.name AS prov_name, p.full_name AS prov_full_name, p.latitude AS prov_latitude, p.longitude AS prov_longitude,
                u.id AS user_id, u.first_name AS user_first_name, u.last_name AS user_last_name, u.username AS user_username
            FROM events e
            JOIN event_locations el ON e.id_event_location = el.id
            JOIN locations l ON el.id_location = l.id
            JOIN provinces p ON l.id_province = p.id
            JOIN users u ON e.id_creator_user = u.id
            ${whereCondition}
            ORDER BY e.start_date DESC, e.id ASC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        const countQueryText = `
            SELECT COUNT(DISTINCT e.id)
            FROM events e
            JOIN event_locations el ON e.id_event_location = el.id
            JOIN locations l ON el.id_location = l.id
            JOIN provinces p ON l.id_province = p.id
            JOIN users u ON e.id_creator_user = u.id
            ${whereCondition}
        `;

        const finalQueryParams = [...queryParams, limit, offset];
        const countQueryParams = [...queryParams];

        try {
            const eventsResult = await db.query(eventsQueryText, finalQueryParams);
            const totalResult = await db.query(countQueryText, countQueryParams);
            const total = parseInt(totalResult.rows[0].count, 10);

            const eventIds = eventsResult.rows.map(event => event.event_id);
            let tagsByEventId = {};
            if (eventIds.length > 0) {
                const tagsQuery = await db.query(`
                    SELECT et.id_event, t.id, t.name
                    FROM event_tags et
                    JOIN tags t ON et.id_tag = t.id
                    WHERE et.id_event = ANY($1::int[])`, [eventIds]);

                tagsByEventId = tagsQuery.rows.reduce((acc, row) => {
                    if (!acc[row.id_event]) {
                        acc[row.id_event] = [];
                    }
                    acc[row.id_event].push({ id: row.id, name: row.name });
                    return acc;
                }, {});
            }

            const collection = eventsResult.rows.map(row => {
                const event = structureEventData(row);
                event.tags = tagsByEventId[row.event_id] || [];
                return event;
            });

            const nextPageOffset = offset + limit;
            const nextPage = (nextPageOffset < total) ? `/api/event?limit=${limit}&offset=${nextPageOffset}` +
                             (name ? `&name=${encodeURIComponent(name)}` : '') +
                             (startdate ? `&startdate=${startdate.toISOString().split('T')[0]}` : '') +
                             (tag ? `&tag=${encodeURIComponent(tag)}` : '')
                             : null;

            res.status(200).json({
                collection,
                pagination: { limit, offset, nextPage, total }
            });
        } catch (error) {
            console.error('Error fetching events:', error);
            res.status(500).json({ message: 'Server error while fetching events.' });
        }
    }
);

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    if (isNaN(parseInt(id, 10))) {
        return res.status(400).json({ message: "Event ID must be an integer." });
    }

    try {
        const eventQueryText = `
            SELECT
                e.id AS event_id, e.name AS event_name, e.description, e.start_date, e.duration_in_minutes, e.price,
                e.enabled_for_enrollment, e.max_assistance, e.id_creator_user,
                el.id AS el_id, el.name AS el_name, el.full_address AS el_full_address, el.max_capacity AS el_max_capacity,
                el.latitude AS el_latitude, el.longitude AS el_longitude, el.id_location AS el_id_location,
                el.id_creator_user AS el_id_creator_user,
                l.id AS loc_id, l.name AS loc_name, l.id_province AS loc_id_province,
                l.latitude AS loc_latitude, l.longitude AS loc_longitude,
                p.id AS prov_id, p.name AS prov_name, p.full_name AS prov_full_name,
                p.latitude AS prov_latitude, p.longitude AS prov_longitude,
                u.id AS user_id, u.first_name AS user_first_name, u.last_name AS user_last_name, u.username AS user_username,
                el_creator.id AS el_creator_id, el_creator.first_name AS el_creator_first_name,
                el_creator.last_name AS el_creator_last_name, el_creator.username AS el_creator_username
            FROM events e
            JOIN event_locations el ON e.id_event_location = el.id
            JOIN users el_creator ON el.id_creator_user = el_creator.id
            JOIN locations l ON el.id_location = l.id
            JOIN provinces p ON l.id_province = p.id
            JOIN users u ON e.id_creator_user = u.id
            WHERE e.id = $1
        `;
        const eventResult = await db.query(eventQueryText, [id]);

        if (eventResult.rows.length === 0) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        const eventRow = eventResult.rows[0];

        const tagsQuery = await db.query(
            'SELECT t.id, t.name FROM tags t JOIN event_tags et ON t.id = et.id_tag WHERE et.id_event = $1',
            [id]
        );

        const response = {
            id: eventRow.event_id,
            name: eventRow.event_name,
            description: eventRow.description,
            id_event_location: eventRow.el_id,
            start_date: eventRow.start_date,
            duration_in_minutes: eventRow.duration_in_minutes,
            price: eventRow.price,
            enabled_for_enrollment: eventRow.enabled_for_enrollment,
            max_assistance: eventRow.max_assistance,
            id_creator_user: eventRow.id_creator_user,
            event_location: {
                id: eventRow.el_id,
                id_location: eventRow.el_id_location,
                name: eventRow.el_name,
                full_address: eventRow.el_full_address,
                max_capacity: eventRow.el_max_capacity,
                latitude: eventRow.el_latitude,
                longitude: eventRow.el_longitude,
                id_creator_user: eventRow.el_id_creator_user,
                location: {
                    id: eventRow.loc_id,
                    name: eventRow.loc_name,
                    id_province: eventRow.loc_id_province,
                    latitude: eventRow.loc_latitude,
                    longitude: eventRow.loc_longitude,
                    province: {
                        id: eventRow.prov_id,
                        name: eventRow.prov_name,
                        full_name: eventRow.prov_full_name,
                        latitude: eventRow.prov_latitude,
                        longitude: eventRow.prov_longitude,
                        display_order: null
                    }
                },
                creator_user: {
                    id: eventRow.el_creator_id,
                    first_name: eventRow.el_creator_first_name,
                    last_name: eventRow.el_creator_last_name,
                    username: eventRow.el_creator_username,
                    password: "******"
                }
            },
            tags: tagsQuery.rows.map(tag => ({ id: tag.id, name: tag.name })),
            creator_user: {
                id: eventRow.user_id,
                first_name: eventRow.user_first_name,
                last_name: eventRow.user_last_name,
                username: eventRow.user_username,
                password: "******"
            }
        };
        res.status(200).json(response);
    } catch (error) {
        console.error(`Error fetching event with ID ${id}:`, error);
        res.status(500).json({ message: 'Server error while fetching event details.' });
    }
});

router.post(
    '/',
    protect,
    [
        body('name').trim().isLength({ min: 3 }).withMessage('Name must be at least 3 characters long.'),
        body('description').trim().isLength({ min: 3 }).withMessage('Description must be at least 3 characters long.'),
        body('id_event_location').isInt({ min: 1 }).withMessage('Valid event_location ID is required.'),
        body('start_date').isISO8601().toDate().withMessage('Valid start_date is required.'),
        body('duration_in_minutes').isInt({ gt: 0 }).withMessage('Duration must be greater than 0.'),
        body('price').isDecimal({ decimal_digits: '0,2' }).custom(value => value >= 0).withMessage('Price must be a non-negative decimal.'),
        body('enabled_for_enrollment').optional().isBoolean().withMessage('enabled_for_enrollment must be a boolean.'),
        body('max_assistance').isInt({ gt: 0 }).withMessage('max_assistance must be greater than 0.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array()[0].msg });
        }

        const {
            name, description, id_event_location, start_date, duration_in_minutes,
            price, enabled_for_enrollment = true, max_assistance
        } = req.body;
        const id_creator_user = req.user.id;

        try {
            const eventLocationResult = await db.query('SELECT max_capacity FROM event_locations WHERE id = $1', [id_event_location]);
            if (eventLocationResult.rows.length === 0) {
                return res.status(400).json({ success: false, message: 'Event location not found.' });
            }
            const { max_capacity: location_max_capacity } = eventLocationResult.rows[0];

            if (parseInt(max_assistance, 10) > parseInt(location_max_capacity, 10)) {
                return res.status(400).json({ success: false, message: 'max_assistance cannot exceed the max_capacity of the event location.' });
            }

            const newEvent = await db.query(
                `INSERT INTO events (name, description, id_event_location, start_date, duration_in_minutes, price, enabled_for_enrollment, max_assistance, id_creator_user)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
                [name, description, id_event_location, start_date, duration_in_minutes, price, enabled_for_enrollment, max_assistance, id_creator_user]
            );

            const eventDetailQuery = `
                SELECT
                    e.id AS event_id, e.name AS event_name, e.description, e.start_date, e.duration_in_minutes, e.price,
                    e.enabled_for_enrollment, e.max_assistance, e.id_creator_user,
                    el.id AS el_id, el.name AS el_name, el.full_address AS el_full_address, el.max_capacity AS el_max_capacity,
                    el.latitude AS el_latitude, el.longitude AS el_longitude, el.id_location AS el_id_location,
                    el.id_creator_user AS el_id_creator_user,
                    l.id AS loc_id, l.name AS loc_name, l.id_province AS loc_id_province,
                    l.latitude AS loc_latitude, l.longitude AS loc_longitude,
                    p.id AS prov_id, p.name AS prov_name, p.full_name AS prov_full_name,
                    p.latitude AS prov_latitude, p.longitude AS prov_longitude,
                    u.id AS user_id, u.first_name AS user_first_name, u.last_name AS user_last_name, u.username AS user_username,
                    el_creator.id AS el_creator_id, el_creator.first_name AS el_creator_first_name,
                    el_creator.last_name AS el_creator_last_name, el_creator.username AS el_creator_username
                FROM events e
                JOIN event_locations el ON e.id_event_location = el.id
                JOIN users el_creator ON el.id_creator_user = el_creator.id
                JOIN locations l ON el.id_location = l.id
                JOIN provinces p ON l.id_province = p.id
                JOIN users u ON e.id_creator_user = u.id
                WHERE e.id = $1
            `;
            const eventResult = await db.query(eventDetailQuery, [newEvent.rows[0].id]);
            const eventRow = eventResult.rows[0];
            const tagsQuery = await db.query(
                'SELECT t.id, t.name FROM tags t JOIN event_tags et ON t.id = et.id_tag WHERE et.id_event = $1',
                [newEvent.rows[0].id]
            );
            const response = {
                id: eventRow.event_id, name: eventRow.event_name, description: eventRow.description,
                id_event_location: eventRow.el_id, start_date: eventRow.start_date,
                duration_in_minutes: eventRow.duration_in_minutes, price: eventRow.price,
                enabled_for_enrollment: eventRow.enabled_for_enrollment, max_assistance: eventRow.max_assistance,
                id_creator_user: eventRow.id_creator_user,
                event_location: {
                    id: eventRow.el_id, id_location: eventRow.el_id_location, name: eventRow.el_name,
                    full_address: eventRow.el_full_address, max_capacity: eventRow.el_max_capacity,
                    latitude: eventRow.el_latitude, longitude: eventRow.el_longitude,
                    id_creator_user: eventRow.el_id_creator_user,
                    location: {
                        id: eventRow.loc_id, name: eventRow.loc_name, id_province: eventRow.loc_id_province,
                        latitude: eventRow.loc_latitude, longitude: eventRow.loc_longitude,
                        province: {
                            id: eventRow.prov_id, name: eventRow.prov_name, full_name: eventRow.prov_full_name,
                            latitude: eventRow.prov_latitude, longitude: eventRow.prov_longitude, display_order: null
                        }
                    },
                    creator_user: {
                        id: eventRow.el_creator_id, first_name: eventRow.el_creator_first_name,
                        last_name: eventRow.el_creator_last_name, username: eventRow.el_creator_username, password: "******"
                    }
                },
                tags: tagsQuery.rows.map(tag => ({ id: tag.id, name: tag.name })),
                creator_user: {
                    id: eventRow.user_id, first_name: eventRow.user_first_name, last_name: eventRow.user_last_name,
                    username: eventRow.user_username, password: "******"
                }
            };
            res.status(201).json(response);
        } catch (error) {
            console.error('Error creating event:', error);
            if (error.code === '23503') {
                 return res.status(400).json({ success: false, message: 'Invalid id_event_location or other foreign key constraint failed.' });
            }
            res.status(500).json({ success: false, message: 'Server error while creating event.' });
        }
    }
);

router.put(
    '/:id',
    protect,
    [
        body('name').optional().trim().isLength({ min: 3 }).withMessage('Name must be at least 3 characters long.'),
        body('description').optional().trim().isLength({ min: 3 }).withMessage('Description must be at least 3 characters long.'),
        body('id_event_location').optional().isInt({ min: 1 }).withMessage('Valid event_location ID is required.'),
        body('start_date').optional().isISO8601().toDate().withMessage('Valid start_date is required.'),
        body('duration_in_minutes').optional().isInt({ gt: 0 }).withMessage('Duration must be greater than 0.'),
        body('price').optional().isDecimal({ decimal_digits: '0,2' }).custom(value => value >= 0).withMessage('Price must be a non-negative decimal.'),
        body('enabled_for_enrollment').optional().isBoolean().withMessage('enabled_for_enrollment must be a boolean.'),
        body('max_assistance').optional().isInt({ gt: 0 }).withMessage('max_assistance must be greater than 0.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array()[0].msg });
        }

        const eventId = req.params.id;
        const userId = req.user.id;
        const updates = req.body;

        try {
            const eventCheck = await db.query('SELECT * FROM events WHERE id = $1 AND id_creator_user = $2', [eventId, userId]);
            if (eventCheck.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Event not found or user not authorized to update this event.' });
            }
            const currentEvent = eventCheck.rows[0];

            let newMaxAssistance = updates.max_assistance !== undefined ? parseInt(updates.max_assistance, 10) : parseInt(currentEvent.max_assistance, 10);
            let eventLocationId = updates.id_event_location !== undefined ? updates.id_event_location : currentEvent.id_event_location;

            const eventLocationResult = await db.query('SELECT max_capacity FROM event_locations WHERE id = $1', [eventLocationId]);
            if (eventLocationResult.rows.length === 0) {
                return res.status(400).json({ success: false, message: 'Event location not found for validation.' });
            }
            const { max_capacity: location_max_capacity } = eventLocationResult.rows[0];

            if (newMaxAssistance > parseInt(location_max_capacity, 10)) {
                 return res.status(400).json({ success: false, message: 'max_assistance cannot exceed the max_capacity of the event location.' });
            }

            const fieldsToUpdate = [];
            const values = [];
            let paramCount = 1;

            for (const key in updates) {
                if (Object.prototype.hasOwnProperty.call(updates, key) && updates[key] !== undefined) {
                    if (['name', 'description', 'id_event_location', 'start_date', 'duration_in_minutes', 'price', 'enabled_for_enrollment', 'max_assistance'].includes(key)) {
                        fieldsToUpdate.push(`${key} = $${paramCount++}`);
                        values.push(updates[key]);
                    }
                }
            }

            if (fieldsToUpdate.length === 0) {
                return res.status(400).json({ success: false, message: 'No valid fields provided for update.' });
            }

            values.push(eventId);
            values.push(userId);

            const queryText = `UPDATE events SET ${fieldsToUpdate.join(', ')}, updated_at = CURRENT_TIMESTAMP
                               WHERE id = $${paramCount++} AND id_creator_user = $${paramCount++} RETURNING id`;

            const updateResult = await db.query(queryText, values);

            if (updateResult.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Event not found or user not authorized (update failed).' });
            }

            const eventDetailQuery = `
                SELECT
                    e.id AS event_id, e.name AS event_name, e.description, e.start_date, e.duration_in_minutes, e.price,
                    e.enabled_for_enrollment, e.max_assistance, e.id_creator_user,
                    el.id AS el_id, el.name AS el_name, el.full_address AS el_full_address, el.max_capacity AS el_max_capacity,
                    el.latitude AS el_latitude, el.longitude AS el_longitude, el.id_location AS el_id_location,
                    el.id_creator_user AS el_id_creator_user,
                    l.id AS loc_id, l.name AS loc_name, l.id_province AS loc_id_province,
                    l.latitude AS loc_latitude, l.longitude AS loc_longitude,
                    p.id AS prov_id, p.name AS prov_name, p.full_name AS prov_full_name,
                    p.latitude AS prov_latitude, p.longitude AS prov_longitude,
                    u.id AS user_id, u.first_name AS user_first_name, u.last_name AS user_last_name, u.username AS user_username,
                    el_creator.id AS el_creator_id, el_creator.first_name AS el_creator_first_name,
                    el_creator.last_name AS el_creator_last_name, el_creator.username AS el_creator_username
                FROM events e
                JOIN event_locations el ON e.id_event_location = el.id
                JOIN users el_creator ON el.id_creator_user = el_creator.id
                JOIN locations l ON el.id_location = l.id
                JOIN provinces p ON l.id_province = p.id
                JOIN users u ON e.id_creator_user = u.id
                WHERE e.id = $1
            `;
            const eventResult = await db.query(eventDetailQuery, [updateResult.rows[0].id]);
            const eventRow = eventResult.rows[0];
            const tagsQuery = await db.query(
                'SELECT t.id, t.name FROM tags t JOIN event_tags et ON t.id = et.id_tag WHERE et.id_event = $1',
                [updateResult.rows[0].id]
            );
             const response = {
                id: eventRow.event_id, name: eventRow.event_name, description: eventRow.description,
                id_event_location: eventRow.el_id, start_date: eventRow.start_date,
                duration_in_minutes: eventRow.duration_in_minutes, price: eventRow.price,
                enabled_for_enrollment: eventRow.enabled_for_enrollment, max_assistance: eventRow.max_assistance,
                id_creator_user: eventRow.id_creator_user,
                event_location: {
                    id: eventRow.el_id, id_location: eventRow.el_id_location, name: eventRow.el_name,
                    full_address: eventRow.el_full_address, max_capacity: eventRow.el_max_capacity,
                    latitude: eventRow.el_latitude, longitude: eventRow.el_longitude,
                    id_creator_user: eventRow.el_id_creator_user,
                    location: {
                        id: eventRow.loc_id, name: eventRow.loc_name, id_province: eventRow.loc_id_province,
                        latitude: eventRow.loc_latitude, longitude: eventRow.loc_longitude,
                        province: {
                            id: eventRow.prov_id, name: eventRow.prov_name, full_name: eventRow.prov_full_name,
                            latitude: eventRow.prov_latitude, longitude: eventRow.prov_longitude, display_order: null
                        }
                    },
                    creator_user: {
                        id: eventRow.el_creator_id, first_name: eventRow.el_creator_first_name,
                        last_name: eventRow.el_creator_last_name, username: eventRow.el_creator_username, password: "******"
                    }
                },
                tags: tagsQuery.rows.map(tag => ({ id: tag.id, name: tag.name })),
                creator_user: {
                    id: eventRow.user_id, first_name: eventRow.user_first_name, last_name: eventRow.user_last_name,
                    username: eventRow.user_username, password: "******"
                }
            };
            res.status(200).json(response);
        } catch (error) {
            console.error('Error updating event:', error);
             if (error.code === '23503') {
                 return res.status(400).json({ success: false, message: 'Invalid id_event_location or other foreign key constraint failed during update.' });
            }
            res.status(500).json({ success: false, message: 'Server error while updating event.' });
        }
    }
);

router.delete('/:id', protect, async (req, res) => {
    const eventId = req.params.id;
    const userId = req.user.id;

    try {
        const eventCheck = await db.query('SELECT id FROM events WHERE id = $1 AND id_creator_user = $2', [eventId, userId]);
        if (eventCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found or user not authorized to delete this event.' });
        }

        const enrollmentCheck = await db.query('SELECT COUNT(*) FROM event_enrollments WHERE id_event = $1', [eventId]);
        if (parseInt(enrollmentCheck.rows[0].count, 10) > 0) {
            return res.status(400).json({ success: false, message: 'Cannot delete event. There are users registered for this event.' });
        }

        const deleteResult = await db.query('DELETE FROM events WHERE id = $1 RETURNING *', [eventId]);

        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found during deletion attempt.' });
        }

        res.status(200).json({ success: true, message: 'Event deleted successfully.', data: deleteResult.rows[0] });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ success: false, message: 'Server error while deleting event.' });
    }
});

router.post(
    '/:id/enrollment',
    protect,
    async (req, res) => {
        const eventId = req.params.id;
        const userId = req.user.id;

        try {
            const eventResult = await db.query(
                'SELECT * FROM events WHERE id = $1',
                [eventId]
            );
            if (eventResult.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Event not found.' });
            }
            const event = eventResult.rows[0];

            if (!event.enabled_for_enrollment) {
                return res.status(400).json({ success: false, message: 'Event is not enabled for enrollment.' });
            }

            const now = new Date();
            const eventStartDate = new Date(event.start_date);
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const eventStartDay = new Date(eventStartDate.getFullYear(), eventStartDate.getMonth(), eventStartDate.getDate());

            if (eventStartDate <= now || eventStartDay <= today) {
                return res.status(400).json({ success: false, message: 'Cannot enroll in an event that has already started or is scheduled for today.' });
            }

            const existingEnrollment = await db.query(
                'SELECT id FROM event_enrollments WHERE id_event = $1 AND id_user = $2',
                [eventId, userId]
            );
            if (existingEnrollment.rows.length > 0) {
                return res.status(400).json({ success: false, message: 'User is already registered for this event.' });
            }

            const currentEnrollmentsCountResult = await db.query(
                'SELECT COUNT(*) FROM event_enrollments WHERE id_event = $1',
                [eventId]
            );
            const currentEnrollmentsCount = parseInt(currentEnrollmentsCountResult.rows[0].count, 10);
            if (currentEnrollmentsCount >= event.max_assistance) {
                return res.status(400).json({ success: false, message: 'Event has reached its maximum assistance capacity.' });
            }

            const registrationDateTime = new Date();
            const newEnrollmentResult = await db.query(
                'INSERT INTO event_enrollments (id_event, id_user, registration_date_time) VALUES ($1, $2, $3) RETURNING *',
                [eventId, userId, registrationDateTime]
            );

            res.status(201).json({
                success: true,
                message: 'Successfully enrolled in the event.',
                enrollment: newEnrollmentResult.rows[0]
            });
        } catch (error) {
            console.error('Error during event enrollment:', error);
            res.status(500).json({ success: false, message: 'Server error during event enrollment.' });
        }
    }
);

router.delete(
    '/:id/enrollment',
    protect,
    async (req, res) => {
        const eventId = req.params.id;
        const userId = req.user.id;

        try {
            const eventResult = await db.query('SELECT start_date FROM events WHERE id = $1', [eventId]);
            if (eventResult.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Event not found.' });
            }
            const event = eventResult.rows[0];

            const enrollmentCheck = await db.query(
                'SELECT id FROM event_enrollments WHERE id_event = $1 AND id_user = $2',
                [eventId, userId]
            );
            if (enrollmentCheck.rows.length === 0) {
                return res.status(400).json({ success: false, message: 'User is not registered for this event.' });
            }

            const now = new Date();
            const eventStartDate = new Date(event.start_date);
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const eventStartDay = new Date(eventStartDate.getFullYear(), eventStartDate.getMonth(), eventStartDate.getDate());

            if (eventStartDate <= now || eventStartDay <= today) {
                return res.status(400).json({ success: false, message: 'Cannot unenroll from an event that has already started or is scheduled for today.' });
            }

            const deleteResult = await db.query(
                'DELETE FROM event_enrollments WHERE id_event = $1 AND id_user = $2 RETURNING id',
                [eventId, userId]
            );

            if (deleteResult.rowCount === 0) {
                return res.status(400).json({ success: false, message: 'Failed to unenroll. User might not have been registered or event ID is incorrect.' });
            }

            res.status(200).json({ success: true, message: 'Successfully unenrolled from the event.' });
        } catch (error) {
            console.error('Error during event unenrollment:', error);
            res.status(500).json({ success: false, message: 'Server error during event unenrollment.' });
        }
    }
);

module.exports = router;
