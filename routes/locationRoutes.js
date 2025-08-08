const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT l.id, l.name, p.name as province_name
      FROM locations l
      JOIN provinces p ON l.id_province = p.id
      ORDER BY p.name, l.name
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
