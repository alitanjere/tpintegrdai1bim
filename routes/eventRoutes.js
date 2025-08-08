const express = require('express');
const router = express.Router();
const { query, body, validationResult } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const eventService = require('../services/eventService');

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

router.get(
    '/my-events',
    protect,
    [
        query('limit').optional().isInt({ min: 1 }).toInt().default(15),
        query('offset').optional().isInt({ min: 0 }).toInt().default(0),
    ],
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const { limit, offset } = req.query;
            const { collection, total } = await eventService.getMyEvents(req.user.id, limit, offset);
            const nextPage = (offset + limit < total) ? `/api/event/my-events?limit=${limit}&offset=${offset + limit}` : null;
            res.status(200).json({ collection, pagination: { limit, offset, nextPage, total } });
        } catch (error) {
            next(error);
        }
    }
);

router.get(
    '/',
    [
        query('limit').optional().isInt({ min: 1 }).toInt().default(15),
        query('offset').optional().isInt({ min: 0 }).toInt().default(0),
        query('name').optional().isString().trim(),
        query('startdate').optional().isISO8601().toDate().withMessage('Start date must be a valid date in YYYY-MM-DD format.'),
        query('tag').optional().isString().trim()
    ],
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const { limit, offset, name, startdate, tag } = req.query;
            const { collection, total } = await eventService.getAllEvents({ name, startdate, tag }, limit, offset);

            const nextPageOffset = offset + limit;
            const nextPage = (nextPageOffset < total) ? `/api/event?limit=${limit}&offset=${nextPageOffset}` +
                             (name ? `&name=${encodeURIComponent(name)}` : '') +
                             (startdate ? `&startdate=${startdate.toISOString().split('T')[0]}` : '') +
                             (tag ? `&tag=${encodeURIComponent(tag)}` : '')
                             : null;

            res.status(200).json({ collection, pagination: { limit, offset, nextPage, total } });
        } catch (error) {
            next(error);
        }
    }
);

router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        if (isNaN(parseInt(id, 10))) {
            return res.status(400).json({ message: "Event ID must be an integer." });
        }
        const event = await eventService.getEventById(id);
        res.status(200).json(event);
    } catch (error) {
        next(error);
    }
});

router.post(
    '/',
    protect,
    [
        body('name').trim().isLength({ min: 3 }).withMessage('Name must be at least 3 characters long.'),
        body('description').trim().isLength({ min: 3 }).withMessage('Description must be at least 3 characters long.'),
        body('id_event_location').isInt({ min: 1 }).withMessage('Valid event_location ID is required.'),
        body('start_date').isISO8601().toDate().withMessage('Valid start_date is required.'),
        body('duration_in_minutes').isInt({ gt: 0 }).withMessage('Duration must be greater than 0.'),
        body('price').isDecimal({ decimal_digits: '0,2' }).custom(value => value >= 0).withMessage('Price must be a non-negative decimal.'),
        body('enabled_for_enrollment').optional().isBoolean().withMessage('enabled_for_enrollment must be a boolean.'),
        body('max_assistance').isInt({ gt: 0 }).withMessage('max_assistance must be greater than 0.')
    ],
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const newEvent = await eventService.createNewEvent(req.body, req.user.id);
            res.status(201).json(newEvent);
        } catch (error) {
            next(error);
        }
    }
);

router.put(
    '/:id',
    protect,
    [
        body('name').optional().trim().isLength({ min: 3 }).withMessage('Name must be at least 3 characters long.'),
        body('description').optional().trim().isLength({ min: 3 }).withMessage('Description must be at least 3 characters long.'),
        body('id_event_location').optional().isInt({ min: 1 }).withMessage('Valid event_location ID is required.'),
        body('start_date').optional().isISO8601().toDate().withMessage('Valid start_date is required.'),
        body('duration_in_minutes').optional().isInt({ gt: 0 }).withMessage('Duration must be greater than 0.'),
        body('price').optional().isDecimal({ decimal_digits: '0,2' }).custom(value => value >= 0).withMessage('Price must be a non-negative decimal.'),
        body('enabled_for_enrollment').optional().isBoolean().withMessage('enabled_for_enrollment must be a boolean.'),
        body('max_assistance').optional().isInt({ gt: 0 }).withMessage('max_assistance must be greater than 0.')
    ],
    handleValidationErrors,
    async (req, res, next) => {
        try {
            const updatedEvent = await eventService.updateExistingEvent(req.params.id, req.user.id, req.body);
            res.status(200).json(updatedEvent);
        } catch (error) {
            next(error);
        }
    }
);

router.delete('/:id', protect, async (req, res, next) => {
    try {
        const deletedEvent = await eventService.deleteExistingEvent(req.params.id, req.user.id);
        res.status(200).json({ success: true, message: 'Event deleted successfully.', data: deletedEvent });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/enrollment', protect, async (req, res, next) => {
    try {
        const enrollment = await eventService.createNewEnrollment(req.params.id, req.user.id);
        res.status(201).json({ success: true, message: 'Successfully enrolled in the event.', enrollment });
    } catch (error) {
        next(error);
    }
});

router.delete('/:id/enrollment', protect, async (req, res, next) => {
    try {
        const result = await eventService.deleteExistingEnrollment(req.params.id, req.user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

router.use(apiErrorHandler);

module.exports = router;
