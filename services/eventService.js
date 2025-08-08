const eventRepository = require('../repository/eventRepository');
const eventLocationRepository = require('../repository/eventLocationRepository');

const structureEventData = (eventRow) => {
    return {
        id: eventRow.event_id,
        name: eventRow.event_name,
        description: eventRow.description,
        start_date: eventRow.start_date,
        duration_in_minutes: eventRow.duration_in_minutes,
        price: eventRow.price,
        enabled_for_enrollment: eventRow.enabled_for_enrollment,
        max_assistance: eventRow.max_assistance,
        event_location: {
            id: eventRow.el_id,
            name: eventRow.el_name,
            full_address: eventRow.el_full_address,
            max_capacity: eventRow.el_max_capacity,
            latitude: eventRow.el_latitude,
            longitude: eventRow.el_longitude,
            location: {
                id: eventRow.loc_id,
                name: eventRow.loc_name,
                latitude: eventRow.loc_latitude,
                longitude: eventRow.loc_longitude,
                province: {
                    id: eventRow.prov_id,
                    name: eventRow.prov_name,
                    full_name: eventRow.prov_full_name,
                    latitude: eventRow.prov_latitude,
                    longitude: eventRow.prov_longitude,
                }
            }
        },
        creator_user: {
            id: eventRow.user_id,
            first_name: eventRow.user_first_name,
            last_name: eventRow.user_last_name,
            username: eventRow.user_username,
        },
        tags: eventRow.tags || []
    };
};

const getMyEvents = async (userId, limit, offset) => {
    const events = await eventRepository.findEventsByCreator(userId, limit, offset);
    const total = await eventRepository.countEventsByCreator(userId);
    return { collection: events, total };
};

const getAllEvents = async (filters, limit, offset) => {
    const events = await eventRepository.findAllEvents(filters, limit, offset);
    const total = await eventRepository.countAllEvents(filters);

    const eventIds = events.map(event => event.event_id);
    if (eventIds.length > 0) {
        const tags = await eventRepository.findEventTagsByEventIds(eventIds);
        const tagsByEventId = tags.reduce((acc, row) => {
            if (!acc[row.id_event]) acc[row.id_event] = [];
            acc[row.id_event].push({ id: row.id, name: row.name });
            return acc;
        }, {});
        events.forEach(event => {
            event.tags = tagsByEventId[event.event_id] || [];
        });
    }

    const collection = events.map(row => structureEventData(row));
    return { collection, total };
};

const getEventById = async (id) => {
    const eventRow = await eventRepository.findEventById(id);
    if (!eventRow) {
        const err = new Error('Event not found.');
        err.statusCode = 404;
        throw err;
    }
    const tags = await eventRepository.findEventTags(id);

    const response = {
        id: eventRow.event_id, name: eventRow.event_name, description: eventRow.description,
        id_event_location: eventRow.el_id, start_date: eventRow.start_date,
        duration_in_minutes: eventRow.duration_in_minutes, price: eventRow.price,
        enabled_for_enrollment: eventRow.enabled_for_enrollment, max_assistance: eventRow.max_assistance,
        id_creator_user: eventRow.id_creator_user,
        event_location: {
            id: eventRow.el_id, id_location: eventRow.el_id_location, name: eventRow.el_name,
            full_address: eventRow.el_full_address, max_capacity: eventRow.el_max_capacity,
            latitude: eventRow.el_latitude, longitude: eventRow.el_longitude,
            id_creator_user: eventRow.el_id_creator_user,
            location: {
                id: eventRow.loc_id, name: eventRow.loc_name, id_province: eventRow.loc_id_province,
                latitude: eventRow.loc_latitude, longitude: eventRow.loc_longitude,
                province: {
                    id: eventRow.prov_id, name: eventRow.prov_name, full_name: eventRow.prov_full_name,
                    latitude: eventRow.prov_latitude, longitude: eventRow.prov_longitude, display_order: null
                }
            },
            creator_user: {
                id: eventRow.el_creator_id, first_name: eventRow.el_creator_first_name,
                last_name: eventRow.el_creator_last_name, username: eventRow.el_creator_username, password: "******"
            }
        },
        tags: tags.map(tag => ({ id: tag.id, name: tag.name })),
        creator_user: {
            id: eventRow.user_id, first_name: eventRow.user_first_name, last_name: eventRow.user_last_name,
            username: eventRow.user_username, password: "******"
        }
    };
    return response;
};

const createNewEvent = async (eventData, userId) => {
    const location = await eventLocationRepository.findEventLocationDetailsById(eventData.id_event_location);
    if (!location) {
        const err = new Error('Event location not found.');
        err.statusCode = 400;
        throw err;
    }
    if (parseInt(eventData.max_assistance, 10) > parseInt(location.max_capacity, 10)) {
        const err = new Error('max_assistance cannot exceed the max_capacity of the event location.');
        err.statusCode = 400;
        throw err;
    }

    const newEvent = await eventRepository.createEvent(eventData, userId);
    return getEventById(newEvent.id);
};

const updateExistingEvent = async (eventId, userId, updates) => {
    const event = await eventRepository.findEventForUpdate(eventId, userId);
    if (!event) {
        const err = new Error('Event not found or user not authorized to update this event.');
        err.statusCode = 404;
        throw err;
    }

    const locationId = updates.id_event_location || event.id_event_location;
    const location = await eventLocationRepository.findEventLocationDetailsById(locationId);
    if (!location) {
        const err = new Error('Event location not found for validation.');
        err.statusCode = 400;
        throw err;
    }

    const maxAssistance = updates.max_assistance || event.max_assistance;
    if (parseInt(maxAssistance, 10) > parseInt(location.max_capacity, 10)) {
        const err = new Error('max_assistance cannot exceed the max_capacity of the event location.');
        err.statusCode = 400;
        throw err;
    }

    const updatedEvent = await eventRepository.updateEvent(eventId, userId, updates);
    if (!updatedEvent) {
        const err = new Error('No valid fields provided for update or update failed.');
        err.statusCode = 400;
        throw err;
    }
    return getEventById(updatedEvent.id);
};

const deleteExistingEvent = async (eventId, userId) => {
    const event = await eventRepository.findEventForUpdate(eventId, userId);
    if (!event) {
        const err = new Error('Event not found or user not authorized to delete this event.');
        err.statusCode = 404;
        throw err;
    }
    const enrollmentCount = await eventRepository.countEnrollmentsForEvent(eventId);
    if (enrollmentCount > 0) {
        const err = new Error('Cannot delete event. There are users registered for this event.');
        err.statusCode = 400;
        throw err;
    }
    return await eventRepository.deleteEventById(eventId);
};

const createNewEnrollment = async (eventId, userId) => {
    const event = await eventRepository.findEventForEnrollment(eventId);
    if (!event) {
        const err = new Error('Event not found.');
        err.statusCode = 404;
        throw err;
    }
    if (!event.enabled_for_enrollment) {
        const err = new Error('Event is not enabled for enrollment.');
        err.statusCode = 400;
        throw err;
    }
    const now = new Date();
    const eventStartDate = new Date(event.start_date);
    if (eventStartDate <= now) {
        const err = new Error('Cannot enroll in an event that has already started.');
        err.statusCode = 400;
        throw err;
    }
    const existingEnrollment = await eventRepository.findEnrollment(eventId, userId);
    if (existingEnrollment) {
        const err = new Error('User is already registered for this event.');
        err.statusCode = 400;
        throw err;
    }
    const enrollmentCount = await eventRepository.countEnrollmentsForEvent(eventId);
    if (enrollmentCount >= event.max_assistance) {
        const err = new Error('Event has reached its maximum assistance capacity.');
        err.statusCode = 400;
        throw err;
    }

    return await eventRepository.createEnrollment(eventId, userId);
};

const deleteExistingEnrollment = async (eventId, userId) => {
    const event = await eventRepository.findEventForEnrollment(eventId);
    if (!event) {
        const err = new Error('Event not found.');
        err.statusCode = 404;
        throw err;
    }
    const existingEnrollment = await eventRepository.findEnrollment(eventId, userId);
    if (!existingEnrollment) {
        const err = new Error('User is not registered for this event.');
        err.statusCode = 400;
        throw err;
    }
    const now = new Date();
    const eventStartDate = new Date(event.start_date);
    if (eventStartDate <= now) {
        const err = new Error('Cannot unenroll from an event that has already started.');
        err.statusCode = 400;
        throw err;
    }

    const deletedCount = await eventRepository.deleteEnrollment(eventId, userId);
    if (deletedCount === 0) {
        const err = new Error('Failed to unenroll.');
        err.statusCode = 400;
        throw err;
    }
    return { success: true, message: 'Successfully unenrolled from the event.' };
};

module.exports = {
    getMyEvents,
    getAllEvents,
    getEventById,
    createNewEvent,
    updateExistingEvent,
    deleteExistingEvent,
    createNewEnrollment,
    deleteExistingEnrollment,
};
