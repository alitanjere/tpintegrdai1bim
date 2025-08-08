const db = require('../config/db');

const findEventLocationDetailsById = async (locationId, userId) => {
    let queryText = `
        SELECT
            el.id, el.name, el.full_address, el.id_location, el.max_capacity,
            el.latitude AS el_latitude, el.longitude AS el_longitude, el.id_creator_user,
            l.name AS location_name, l.id_province,
            l.latitude AS loc_latitude, l.longitude AS loc_longitude,
            p.name AS province_name, p.full_name AS province_full_name,
            p.latitude AS prov_latitude, p.longitude AS prov_longitude
        FROM event_locations el
        JOIN locations l ON el.id_location = l.id
        JOIN provinces p ON l.id_province = p.id
        WHERE el.id = $1
    `;
    const params = [locationId];
    if (userId) {
        queryText += " AND el.id_creator_user = $2";
        params.push(userId);
    }

    const { rows } = await db.query(queryText, params);
    return rows[0];
};

const findEventLocationsByUser = async (userId, limit, offset) => {
    const query = `
        SELECT el.*, l.name as location_name, p.name as province_name
        FROM event_locations el
        JOIN locations l ON el.id_location = l.id
        JOIN provinces p ON l.id_province = p.id
        WHERE el.id_creator_user = $1
        ORDER BY el.id ASC
        LIMIT $2 OFFSET $3
    `;
    const { rows } = await db.query(query, [userId, limit, offset]);
    return rows;
};

const countEventLocationsByUser = async (userId) => {
    const { rows } = await db.query('SELECT COUNT(*) FROM event_locations WHERE id_creator_user = $1', [userId]);
    return parseInt(rows[0].count, 10);
};

const findLocationById = async (locationId) => {
    const { rows } = await db.query('SELECT id FROM locations WHERE id = $1', [locationId]);
    return rows[0];
};

const createEventLocation = async (locationData, userId) => {
    const { name, full_address, id_location, max_capacity, latitude, longitude } = locationData;
    const { rows } = await db.query(
        `INSERT INTO event_locations
         (name, full_address, id_location, max_capacity, latitude, longitude, id_creator_user)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [name, full_address, id_location, max_capacity, latitude, longitude, userId]
    );
    return rows[0];
};

const findEventLocationForUpdate = async (id, userId) => {
    const { rows } = await db.query('SELECT * FROM event_locations WHERE id = $1 AND id_creator_user = $2', [id, userId]);
    return rows[0];
};

const updateEventLocation = async (id, userId, updates) => {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const key in updates) {
        if (Object.prototype.hasOwnProperty.call(updates, key) && updates[key] !== undefined && key !== 'id' && key !== 'id_creator_user') {
            if (['name', 'full_address', 'id_location', 'max_capacity', 'latitude', 'longitude'].includes(key)) {
                fields.push(`${key} = $${paramCount++}`);
                values.push(updates[key]);
            }
        }
    }

    if (fields.length === 0) return null;

    values.push(id);
    values.push(userId);

    const query = `UPDATE event_locations SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                   WHERE id = $${paramCount} AND id_creator_user = $${paramCount + 1} RETURNING *`;

    const { rows } = await db.query(query, values);
    return rows[0];
};

const findAssociatedEvents = async (locationId) => {
    const { rows } = await db.query('SELECT id FROM events WHERE id_event_location = $1', [locationId]);
    return rows;
};

const deleteEventLocationById = async (id, userId) => {
    const { rows } = await db.query('DELETE FROM event_locations WHERE id = $1 AND id_creator_user = $2 RETURNING *', [id, userId]);
    return rows[0];
};

const getAllLocations = async () => {
    const { rows } = await db.query(`
        SELECT l.id, l.name, p.name as province_name
        FROM locations l
        JOIN provinces p ON l.id_province = p.id
        ORDER BY p.name, l.name
    `);
    return rows;
}

module.exports = {
    findEventLocationDetailsById,
    findEventLocationsByUser,
    countEventLocationsByUser,
    findLocationById,
    createEventLocation,
    findEventLocationForUpdate,
    updateEventLocation,
    findAssociatedEvents,
    deleteEventLocationById,
    getAllLocations,
};
