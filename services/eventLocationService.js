const eventLocationRepository = require('../repository/eventLocationRepository');

const buildEventLocationDetails = (locationRow) => {
    if (!locationRow) return null;
    return {
        id: locationRow.id,
        name: locationRow.name,
        full_address: locationRow.full_address,
        max_capacity: locationRow.max_capacity,
        latitude: locationRow.el_latitude,
        longitude: locationRow.el_longitude,
        id_creator_user: locationRow.id_creator_user,
        location: {
            id: locationRow.id_location,
            name: locationRow.location_name,
            id_province: locationRow.id_province,
            latitude: locationRow.loc_latitude,
            longitude: locationRow.loc_longitude,
            province: {
                id: locationRow.id_province,
                name: locationRow.province_name,
                full_name: locationRow.province_full_name,
                latitude: locationRow.prov_latitude,
                longitude: locationRow.prov_longitude
            }
        }
    };
};

const getEventLocationsByUser = async (userId, limit, offset) => {
    const locations = await eventLocationRepository.findEventLocationsByUser(userId, limit, offset);
    const total = await eventLocationRepository.countEventLocationsByUser(userId);
    return { collection: locations, total };
};

const getEventLocationById = async (locationId, userId) => {
    const locationRow = await eventLocationRepository.findEventLocationDetailsById(locationId, userId);
    if (!locationRow || locationRow.id_creator_user !== userId) {
        const err = new Error('Event location not found or not owned by user.');
        err.statusCode = 404;
        throw err;
    }
    return buildEventLocationDetails(locationRow);
};

const createNewEventLocation = async (locationData, userId) => {
    const locationExists = await eventLocationRepository.findLocationById(locationData.id_location);
    if (!locationExists) {
        const err = new Error('Invalid id_location. Location does not exist.');
        err.statusCode = 400;
        throw err;
    }
    const newLocation = await eventLocationRepository.createEventLocation(locationData, userId);
    const newLocationDetails = await eventLocationRepository.findEventLocationDetailsById(newLocation.id);
    return buildEventLocationDetails(newLocationDetails);
};

const updateExistingEventLocation = async (locationId, userId, updates) => {
    const existingLocation = await eventLocationRepository.findEventLocationForUpdate(locationId, userId);
    if (!existingLocation) {
        const err = new Error('Event location not found or not owned by user.');
        err.statusCode = 404;
        throw err;
    }
    if (updates.id_location && updates.id_location !== existingLocation.id_location) {
        const locationExists = await eventLocationRepository.findLocationById(updates.id_location);
        if (!locationExists) {
            const err = new Error('Invalid new id_location. Location does not exist.');
            err.statusCode = 400;
            throw err;
        }
    }
    const updatedLocation = await eventLocationRepository.updateEventLocation(locationId, userId, updates);
    if (!updatedLocation) {
        const err = new Error('No valid fields provided for update or update failed.');
        err.statusCode = 400;
        throw err;
    }
    const updatedLocationDetails = await eventLocationRepository.findEventLocationDetailsById(updatedLocation.id);
    return buildEventLocationDetails(updatedLocationDetails);
};

const deleteExistingEventLocation = async (locationId, userId) => {
    const existingLocation = await eventLocationRepository.findEventLocationForUpdate(locationId, userId);
    if (!existingLocation) {
        const err = new Error('Event location not found or not owned by user.');
        err.statusCode = 404;
        throw err;
    }
    const associatedEvents = await eventLocationRepository.findAssociatedEvents(locationId);
    if (associatedEvents.length > 0) {
        const err = new Error('Cannot delete event location. It is currently associated with one or more events.');
        err.statusCode = 400;
        throw err;
    }
    return await eventLocationRepository.deleteEventLocationById(locationId, userId);
};

const getAllLocations = async () => {
    return await eventLocationRepository.getAllLocations();
}

module.exports = {
    getEventLocationsByUser,
    getEventLocationById,
    createNewEventLocation,
    updateExistingEventLocation,
    deleteExistingEventLocation,
    getAllLocations,
};
