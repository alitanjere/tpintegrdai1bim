const jwt = require('jsonwebtoken');
const db = require('../config/db');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not defined. Authentication middleware cannot function.');
        return res.status(500).json({ success: false, message: 'Server configuration error.' });
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = {
        id: decoded.id,
        username: decoded.username,
        first_name: decoded.first_name,
        last_name: decoded.last_name
      };

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
