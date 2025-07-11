const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { body, validationResult } = require('express-validator');

const SALT_ROUNDS = 10;

router.post(
  '/register',
  [
    body('first_name')
      .trim()
      .isLength({ min: 3 })
      .withMessage('First name must be at least 3 characters long.'),
    body('last_name')
      .trim()
      .isLength({ min: 3 })
      .withMessage('Last name must be at least 3 characters long.'),
    body('username')
      .trim()
      .isEmail()
      .withMessage('Username must be a valid email address.')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 3 })
      .withMessage('Password must be at least 3 characters long.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg, token: '' });
    }

    const { first_name, last_name, username, password } = req.body;

    try {
      const userExists = await db.query('SELECT * FROM users WHERE username = $1', [username]);
      if (userExists.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Username already exists.', token: '' });
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      const newUser = await db.query(
        'INSERT INTO users (first_name, last_name, username, password) VALUES ($1, $2, $3, $4) RETURNING id, username, first_name, last_name',
        [first_name, last_name, username, hashedPassword]
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully.',
        user: newUser.rows[0],
      });
    } catch (error) {
      console.error('Error during registration:', error);
      res.status(500).json({ success: false, message: 'Server error during registration.', token: '' });
    }
  }
);

router.post(
  '/login',
  [
    body('username')
      .trim()
      .isEmail()
      .withMessage('El email es invalido.')
      .normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const usernameError = errors.array().find(err => err.param === 'username');
      if (usernameError) {
        return res.status(400).json({ success: false, message: usernameError.msg, token: '' });
      }
      return res.status(400).json({ success: false, message: errors.array()[0].msg, token: '' });
    }

    const { username, password } = req.body;

    try {
      const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
      if (result.rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Usuario o clave inválida.', token: '' });
      }

      const user = result.rows[0];

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Usuario o clave inválida.', token: '' });
      }

      const jwtPayload = {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
      };

      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not defined in .env file');
        return res.status(500).json({ success: false, message: 'Server configuration error.', token: '' });
      }

      const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.status(200).json({
        success: true,
        message: 'Login successful.',
        token: token,
      });
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ success: false, message: 'Server error during login.', token: '' });
    }
  }
);

module.exports = router;
