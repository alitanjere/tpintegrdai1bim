const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const eventLocationService = require('../services/eventLocationService');

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
    console.error('API Error:', err); // Log the full error object
    res.status(statusCode).json({ success: false, message });
};

router.get(
    '/',
    protect,
    [
        query('limit').optional().isInt({ min: 1 }).toInt().default(10),
        query('offset').optional().isInt({ min: 0 }).toInt().default(0)
    ],
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const { limit, offset } = req.query;
            const { collection, total } = await eventLocationService.getEventLocationsByUser(req.user.id, limit, offset);
            const nextPage = (offset + limit < total) ? `/api/event-location?limit=${limit}&offset=${offset + limit}` : null;
            res.status(200).json({ collection, pagination: { limit, offset, nextPage, total } });
        } catch (error) {
            next(error);
        }
    }
);

router.get('/:id', protect, async (req, res, next) => {
    try {
        const eventLocation = await eventLocationService.getEventLocationById(req.params.id, req.user.id);
        res.status(200).json(eventLocation);
    } catch (error) {
        next(error);
    }
});

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
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const newLocation = await eventLocationService.createNewEventLocation(req.body, req.user.id);
            res.status(201).json(newLocation);
        } catch (error) {
            next(error);
        }
    }
);

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
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const updatedLocation = await eventLocationService.updateExistingEventLocation(req.params.id, req.user.id, req.body);
            res.status(200).json(updatedLocation);
        } catch (error) {
            next(error);
        }
    }
);

router.delete('/:id', protect, async (req, res, next) => {
    try {
        const deletedLocation = await eventLocationService.deleteExistingEventLocation(req.params.id, req.user.id);
        res.status(200).json({ message: 'Event location deleted successfully.', deletedLocation });
    } catch (error) {
        next(error);
    }
});

router.use(apiErrorHandler);

module.exports = router;
