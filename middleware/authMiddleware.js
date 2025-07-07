const jwt = require('jsonwebtoken');
const db = require('../config/db'); // To potentially fetch fresh user data

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not defined. Authentication middleware cannot function.');
        return res.status(500).json({ success: false, message: 'Server configuration error.' });
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token's ID and attach to request object
      // This ensures we have the most up-to-date user info if needed,
      // though often the decoded payload is sufficient.
      // For this application, the payload itself contains necessary user identifiers.
      req.user = {
        id: decoded.id,
        username: decoded.username,
        first_name: decoded.first_name,
        last_name: decoded.last_name
      };
      // Example if fetching from DB:
      // const result = await db.query('SELECT id, username, first_name, last_name FROM users WHERE id = $1', [decoded.id]);
      // if (result.rows.length === 0) {
      //   return res.status(401).json({ success: false, message: 'Not authorized, user not found.' });
      // }
      // req.user = result.rows[0];

      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Not authorized, token failed.' });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Not authorized, token expired.' });
      }
      return res.status(401).json({ success: false, message: 'Not authorized, general token error.' });
    }
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized, no token provided.' });
  }
};

module.exports = { protect };
