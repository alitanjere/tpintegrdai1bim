const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
const { body, validationResult, query } = require('express-validator');

// --- Helper function to get event location with its full location details ---
const getEventLocationDetails = async (locationId, userId) => {
    // The userId parameter is to ensure, if needed, that the query is restricted by user.
    // For a general fetch by ID (e.g., when listing events), userId might not be strictly applied here
    // but rather at the higher level (e.g., can user X see event Y which uses location Z).
    // However, for direct GET /event-location/{id}, it should be user-specific.
    const queryText = `
        SELECT
            el.id,
            el.name,
            el.full_address,
            el.id_location,
            el.max_capacity,
            el.latitude AS el_latitude,
            el.longitude AS el_longitude,
            el.id_creator_user,
            l.name AS location_name,
            l.id_province,
            l.latitude AS loc_latitude,
            l.longitude AS loc_longitude,
            p.name AS province_name,
            p.full_name AS province_full_name,
            p.latitude AS prov_latitude,
            p.longitude AS prov_longitude
        FROM event_locations el
        JOIN locations l ON el.id_location = l.id
        JOIN provinces p ON l.id_province = p.id
        WHERE el.id = $1
    `;
    const params = [locationId];
    if (userId) { // If userId is provided, ensure the event location belongs to the user
        queryText += " AND el.id_creator_user = $2";
        params.push(userId);
    }

    const { rows } = await db.query(queryText, params);
    if (rows.length === 0) {
        return null;
    }
    const row = rows[0];
    return {
        id: row.id,
        name: row.name,
        full_address: row.full_address,
        max_capacity: row.max_capacity,
        latitude: row.el_latitude,
        longitude: row.el_longitude,
        id_creator_user: row.id_creator_user,
        location: {
            id: row.id_location,
            name: row.location_name,
            id_province: row.id_province,
            latitude: row.loc_latitude,
            longitude: row.loc_longitude,
            province: {
                id: row.id_province, // Province ID is same as l.id_province
                name: row.province_name,
                full_name: row.province_full_name,
                latitude: row.prov_latitude,
                longitude: row.prov_longitude
            }
        }
    };
};


// GET /api/event-location (paginated, authenticated)
// Lists event locations for the authenticated user.
router.get(
    '/',
    protect,
    [
        query('limit').optional().isInt({ min: 1 }).toInt().default(10),
        query('offset').optional().isInt({ min: 0 }).toInt().default(0)
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { limit, offset } = req.query;
        const userId = req.user.id;

        try {
            const eventLocationsPromise = db.query(
                `SELECT el.*, l.name as location_name, p.name as province_name
                 FROM event_locations el
                 JOIN locations l ON el.id_location = l.id
                 JOIN provinces p ON l.id_province = p.id
                 WHERE el.id_creator_user = $1
                 ORDER BY el.id ASC
                 LIMIT $2 OFFSET $3`,
                [userId, limit, offset]
            );
            const totalPromise = db.query('SELECT COUNT(*) FROM event_locations WHERE id_creator_user = $1', [userId]);

            const [eventLocationsResult, totalResult] = await Promise.all([eventLocationsPromise, totalPromise]);

            const total = parseInt(totalResult.rows[0].count, 10);
            const nextPage = (offset + limit < total) ? `/api/event-location?limit=${limit}&offset=${offset + limit}` : null;

            res.status(200).json({
                collection: eventLocationsResult.rows,
                pagination: {
                    limit,
                    offset,
                    nextPage,
                    total
                }
            });
        } catch (error) {
            console.error('Error fetching event locations:', error);
            res.status(500).json({ message: 'Server error while fetching event locations.' });
        }
    }
);

// GET /api/event-location/{id} (authenticated)
// Get a specific event location if it belongs to the authenticated user.
router.get('/:id', protect, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const eventLocation = await getEventLocationDetails(id, userId); // Use helper, ensure user owns it

        if (!eventLocation) {
            return res.status(404).json({ message: 'Event location not found or not owned by user.' });
        }
        // Check explicitly if it belongs to the user, though getEventLocationDetails with userId should handle this
        if (eventLocation.id_creator_user !== userId) {
             return res.status(404).json({ message: 'Event location not found or not owned by user (access denied).' });
        }

        res.status(200).json(eventLocation);
    } catch (error) {
        console.error('Error fetching event location by ID:', error);
        res.status(500).json({ message: 'Server error while fetching event location.' });
    }
});

// POST /api/event-location (authenticated)
// Create a new event location for the authenticated user.
router.post(
    '/',
    protect,
    [
        body('name').trim().notEmpty().withMessage('Name is required.'),
        body('full_address').trim().notEmpty().withMessage('Full address is required.'),
        body('id_location').isInt({ min: 1 }).withMessage('Valid location ID is required.'),
        body('max_capacity').isInt({ min: 1 }).withMessage('Max capacity must be a positive integer.'),
        body('latitude').optional().isDecimal().withMessage('Latitude must be a decimal value.'),
        body('longitude').optional().isDecimal().withMessage('Longitude must be a decimal value.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, full_address, id_location, max_capacity, latitude, longitude } = req.body;
        const userId = req.user.id;

        try {
            // Check if the referenced location (id_location) exists
            const locationExists = await db.query('SELECT id FROM locations WHERE id = $1', [id_location]);
            if (locationExists.rows.length === 0) {
                return res.status(400).json({ message: 'Invalid id_location. Location does not exist.' });
            }

            const result = await db.query(
                `INSERT INTO event_locations
                 (name, full_address, id_location, max_capacity, latitude, longitude, id_creator_user)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [name, full_address, id_location, max_capacity, latitude, longitude, userId]
            );

            const newEventLocation = await getEventLocationDetails(result.rows[0].id); // Fetch with full details

            res.status(201).json(newEventLocation);
        } catch (error) {
            console.error('Error creating event location:', error);
            // Check for specific DB errors, e.g., foreign key violation if id_location is invalid
            if (error.code === '23503') { // Foreign key violation
                 return res.status(400).json({ message: 'Invalid id_location. Location does not exist or other integrity constraint failed.' });
            }
            res.status(500).json({ message: 'Server error while creating event location.' });
        }
    }
);

// PUT /api/event-location/{id} (authenticated)
// Update an event location if it belongs to the authenticated user.
router.put(
    '/:id',
    protect,
    [
        body('name').optional().trim().notEmpty().withMessage('Name cannot be empty if provided.'),
        body('full_address').optional().trim().notEmpty().withMessage('Full address cannot be empty if provided.'),
        body('id_location').optional().isInt({ min: 1 }).withMessage('Valid location ID is required if provided.'),
        body('max_capacity').optional().isInt({ min: 1 }).withMessage('Max capacity must be a positive integer if provided.'),
        body('latitude').optional().isDecimal().withMessage('Latitude must be a decimal value if provided.'),
        body('longitude').optional().isDecimal().withMessage('Longitude must be a decimal value if provided.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const userId = req.user.id;
        const updates = req.body;

        try {
            // Check if the event location exists and belongs to the user
            const existingLocationResult = await db.query(
                'SELECT * FROM event_locations WHERE id = $1 AND id_creator_user = $2',
                [id, userId]
            );

            if (existingLocationResult.rows.length === 0) {
                return res.status(404).json({ message: 'Event location not found or not owned by user.' });
            }

            const existingLocation = existingLocationResult.rows[0];

            // If id_location is being updated, check if the new location exists
            if (updates.id_location && updates.id_location !== existingLocation.id_location) {
                const locationExists = await db.query('SELECT id FROM locations WHERE id = $1', [updates.id_location]);
                if (locationExists.rows.length === 0) {
                    return res.status(400).json({ message: 'Invalid new id_location. Location does not exist.' });
                }
            }

            // Construct dynamic update query
            const fields = [];
            const values = [];
            let paramCount = 1;

            for (const key in updates) {
                if (Object.prototype.hasOwnProperty.call(updates, key) && updates[key] !== undefined && key !== 'id' && key !== 'id_creator_user') {
                     // Ensure key is a valid column name to prevent SQL injection if not using parameterized keys
                    if (['name', 'full_address', 'id_location', 'max_capacity', 'latitude', 'longitude'].includes(key)) {
                        fields.push(`${key} = $${paramCount++}`);
                        values.push(updates[key]);
                    }
                }
            }

            if (fields.length === 0) {
                return res.status(400).json({ message: 'No valid fields provided for update.' });
            }

            values.push(id); // For WHERE id = $paramCount
            values.push(userId); // For WHERE id_creator_user = $paramCount+1

            const queryText = `UPDATE event_locations SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                               WHERE id = $${paramCount} AND id_creator_user = $${paramCount + 1} RETURNING *`;

            const result = await db.query(queryText, values);

            if (result.rows.length === 0) {
                // Should not happen if initial check passed, but as a safeguard
                return res.status(404).json({ message: 'Event location not found after update attempt, or not owned by user.' });
            }

            const updatedEventLocation = await getEventLocationDetails(result.rows[0].id); // Fetch with full details

            res.status(200).json(updatedEventLocation);
        } catch (error) {
            console.error('Error updating event location:', error);
            if (error.code === '23503') { // Foreign key violation (e.g. for id_location)
                 return res.status(400).json({ message: 'Invalid id_location. Location does not exist or other integrity constraint failed.' });
            }
            res.status(500).json({ message: 'Server error while updating event location.' });
        }
    }
);

// DELETE /api/event-location/{id} (authenticated)
// Delete an event location if it belongs to the authenticated user and is not associated with any events.
router.delete('/:id', protect, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        // Check if the event location exists and belongs to the user
        const eventLocationResult = await db.query(
            'SELECT * FROM event_locations WHERE id = $1 AND id_creator_user = $2',
            [id, userId]
        );

        if (eventLocationResult.rows.length === 0) {
            return res.status(404).json({ message: 'Event location not found or not owned by user.' });
        }

        // Check if the event location is associated with any events
        const associatedEventsResult = await db.query(
            'SELECT id FROM events WHERE id_event_location = $1',
            [id]
        );

        if (associatedEventsResult.rows.length > 0) {
            return res.status(400).json({ message: 'Cannot delete event location. It is currently associated with one or more events.' });
        }

        // Proceed with deletion
        const deleteResult = await db.query(
            'DELETE FROM event_locations WHERE id = $1 AND id_creator_user = $2 RETURNING *',
            [id, userId]
        );

        if (deleteResult.rowCount === 0) {
             // Should not happen if initial checks passed
            return res.status(404).json({ message: 'Event location not found or not owned by user during deletion.' });
        }

        res.status(200).json({ message: 'Event location deleted successfully.', deletedLocation: deleteResult.rows[0] });
    } catch (error) {
        console.error('Error deleting event location:', error);
        // Foreign key constraint errors might occur if ON DELETE RESTRICT is set on events table for id_event_location
        // and somehow an event still references it (though the check above should prevent this).
        if (error.code === '23503') { // foreign_key_violation
             return res.status(400).json({ message: 'Cannot delete event location due to existing references (e.g., events). Please ensure it is not in use.' });
        }
        res.status(500).json({ message: 'Server error while deleting event location.' });
    }
});


module.exports = router;
