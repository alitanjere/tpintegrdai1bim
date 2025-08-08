const db = require('../config/db');

const findUserByUsername = async (username) => {
  const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
  return rows[0];
};

const createUser = async (userData) => {
  const { first_name, last_name, username, hashedPassword } = userData;
  const { rows } = await db.query(
    'INSERT INTO users (first_name, last_name, username, password) VALUES ($1, $2, $3, $4) RETURNING id, username, first_name, last_name',
    [first_name, last_name, username, hashedPassword]
  );
  return rows[0];
};

const getUserEnrollments = async (userId) => {
  const { rows } = await db.query(
    `SELECT e.*
     FROM event_enrollments ee
     JOIN events e ON ee.id_event = e.id
     WHERE ee.id_user = $1`,
    [userId]
  );
  return rows;
};

module.exports = {
  findUserByUsername,
  createUser,
  getUserEnrollments,
};
