const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const userService = require('../services/userService');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    next();
};

const apiErrorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'An unexpected error occurred.';
    console.error('API Error:', err.message);
    res.status(statusCode).json({ success: false, message });
};

router.post(
    '/register',
    [
        body('first_name').trim().isLength({ min: 3 }).withMessage('First name must be at least 3 characters long.'),
        body('last_name').trim().isLength({ min: 3 }).withMessage('Last name must be at least 3 characters long.'),
        body('username').trim().isEmail().withMessage('Username must be a valid email address.').normalizeEmail(),
        body('password').isLength({ min: 3 }).withMessage('Password must be at least 3 characters long.'),
    ],
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const result = await userService.registerUser(req.body);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.post(
    '/login',
    [
        body('username').trim().isEmail().withMessage('El email es invalido.').normalizeEmail(),
        body('password').notEmpty().withMessage('Password is required.'),
    ],
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const { username, password } = req.body;
            const result = await userService.loginUser(username, password);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.get(
    '/enrollments',
    protect,
    async (req, res, next) => {
        try {
            const enrollments = await userService.getEnrollments(req.user.id);
            res.status(200).json(enrollments);
        } catch (error) {
            next(error);
        }
    }
);

router.use(apiErrorHandler);

module.exports = router;
