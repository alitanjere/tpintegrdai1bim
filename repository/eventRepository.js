const db = require('../config/db');

const findEventsByCreator = async (userId, limit, offset) => {
  const query = `
    SELECT e.*, el.name as event_location_name, l.name as location_name, p.name as province_name
    FROM events e
    JOIN event_locations el ON e.id_event_location = el.id
    JOIN locations l ON el.id_location = l.id
    JOIN provinces p ON l.id_province = p.id
    WHERE e.id_creator_user = $1
    ORDER BY e.start_date DESC
    LIMIT $2 OFFSET $3
  `;
  const { rows } = await db.query(query, [userId, limit, offset]);
  return rows;
};

const countEventsByCreator = async (userId) => {
    const { rows } = await db.query('SELECT COUNT(*) FROM events WHERE id_creator_user = $1', [userId]);
    return parseInt(rows[0].count, 10);
};

const findAllEvents = async (filters, limit, offset) => {
    let whereClauses = [];
    let queryParams = [];
    let paramIndex = 1;

    if (filters.name) {
        whereClauses.push(`e.name ILIKE $${paramIndex++}`);
        queryParams.push(`%${filters.name}%`);
    }
    if (filters.startdate) {
        whereClauses.push(`DATE(e.start_date) = DATE($${paramIndex++})`);
        queryParams.push(filters.startdate);
    }
    if (filters.tag) {
        whereClauses.push(`EXISTS (
            SELECT 1 FROM event_tags et_filter
            JOIN tags t_filter ON et_filter.id_tag = t_filter.id
            WHERE et_filter.id_event = e.id AND t_filter.name ILIKE $${paramIndex++}
        )`);
        queryParams.push(`%${filters.tag}%`);
    }

    const whereCondition = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
        SELECT e.id AS event_id, e.name AS event_name, e.description, e.start_date, e.duration_in_minutes, e.price,
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

    const { rows } = await db.query(query, [...queryParams, limit, offset]);
    return rows;
};

const countAllEvents = async (filters) => {
    let whereClauses = [];
    let queryParams = [];
    let paramIndex = 1;

    if (filters.name) {
        whereClauses.push(`e.name ILIKE $${paramIndex++}`);
        queryParams.push(`%${filters.name}%`);
    }
    if (filters.startdate) {
        whereClauses.push(`DATE(e.start_date) = DATE($${paramIndex++})`);
        queryParams.push(filters.startdate);
    }
    if (filters.tag) {
        whereClauses.push(`EXISTS (
            SELECT 1 FROM event_tags et_filter
            JOIN tags t_filter ON et_filter.id_tag = t_filter.id
            WHERE et_filter.id_event = e.id AND t_filter.name ILIKE $${paramIndex++}
        )`);
        queryParams.push(`%${filters.tag}%`);
    }

    const whereCondition = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const query = `
        SELECT COUNT(DISTINCT e.id) FROM events e
        JOIN event_locations el ON e.id_event_location = el.id
        JOIN locations l ON el.id_location = l.id
        JOIN provinces p ON l.id_province = p.id
        JOIN users u ON e.id_creator_user = u.id
        ${whereCondition}
    `;
    const { rows } = await db.query(query, queryParams);
    return parseInt(rows[0].count, 10);
};

const findEventById = async (id) => {
    const query = `
        SELECT e.id AS event_id, e.name AS event_name, e.description, e.start_date, e.duration_in_minutes, e.price,
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
    const { rows } = await db.query(query, [id]);
    return rows[0];
};

const findEventTags = async (eventId) => {
    const { rows } = await db.query('SELECT t.id, t.name FROM tags t JOIN event_tags et ON t.id = et.id_tag WHERE et.id_event = $1', [eventId]);
    return rows;
};

const findEventTagsByEventIds = async (eventIds) => {
    const { rows } = await db.query(`
        SELECT et.id_event, t.id, t.name
        FROM event_tags et
        JOIN tags t ON et.id_tag = t.id
        WHERE et.id_event = ANY($1::int[])`, [eventIds]);
    return rows;
};

const createEvent = async (eventData, userId) => {
    const { name, description, id_event_location, start_date, duration_in_minutes, price, enabled_for_enrollment, max_assistance } = eventData;
    const { rows } = await db.query(
        `INSERT INTO events (name, description, id_event_location, start_date, duration_in_minutes, price, enabled_for_enrollment, max_assistance, id_creator_user)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [name, description, id_event_location, start_date, duration_in_minutes, price, enabled_for_enrollment, max_assistance, userId]
    );
    return rows[0];
};

const findEventForUpdate = async (eventId, userId) => {
    const { rows } = await db.query('SELECT * FROM events WHERE id = $1 AND id_creator_user = $2', [eventId, userId]);
    return rows[0];
};

const updateEvent = async (eventId, userId, updates) => {
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

    if (fieldsToUpdate.length === 0) return null;

    values.push(eventId);
    values.push(userId);

    const query = `UPDATE events SET ${fieldsToUpdate.join(', ')}, updated_at = CURRENT_TIMESTAMP
                   WHERE id = $${paramCount++} AND id_creator_user = $${paramCount++} RETURNING id`;

    const { rows } = await db.query(query, values);
    return rows[0];
};

const countEnrollmentsForEvent = async (eventId) => {
    const { rows } = await db.query('SELECT COUNT(*) FROM event_enrollments WHERE id_event = $1', [eventId]);
    return parseInt(rows[0].count, 10);
};

const deleteEventById = async (eventId) => {
    const { rows } = await db.query('DELETE FROM events WHERE id = $1 RETURNING *', [eventId]);
    return rows[0];
};

const findEventForEnrollment = async (eventId) => {
    const { rows } = await db.query('SELECT * FROM events WHERE id = $1', [eventId]);
    return rows[0];
};

const findEnrollment = async (eventId, userId) => {
    const { rows } = await db.query('SELECT id FROM event_enrollments WHERE id_event = $1 AND id_user = $2', [eventId, userId]);
    return rows[0];
};

const createEnrollment = async (eventId, userId) => {
    const registrationDateTime = new Date();
    const { rows } = await db.query(
        'INSERT INTO event_enrollments (id_event, id_user, registration_date_time) VALUES ($1, $2, $3) RETURNING *',
        [eventId, userId, registrationDateTime]
    );
    return rows[0];
};

const deleteEnrollment = async (eventId, userId) => {
    const { rowCount } = await db.query('DELETE FROM event_enrollments WHERE id_event = $1 AND id_user = $2', [eventId, userId]);
    return rowCount;
};

module.exports = {
    findEventsByCreator,
    countEventsByCreator,
    findAllEvents,
    countAllEvents,
    findEventById,
    findEventTags,
    findEventTagsByEventIds,
    createEvent,
    findEventForUpdate,
    updateEvent,
    countEnrollmentsForEvent,
    deleteEventById,
    findEventForEnrollment,
    findEnrollment,
    createEnrollment,
    deleteEnrollment,
};
