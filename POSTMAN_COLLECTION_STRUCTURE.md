```text
Event API Postman Collection
=============================

**Environment Variables:**
*   `baseUrl`: http://localhost:3000/api
*   `authToken`: (Leave empty initially, will be set by login request's test script)

---

### Folder: User Authentication

1.  **Register User**
    *   **Method:** `POST`
    *   **URL:** `{{baseUrl}}/user/register`
    *   **Headers:**
        *   `Content-Type`: `application/json`
    *   **Body (raw, JSON):**
        ```json
        {
            "first_name": "Test",
            "last_name": "User",
            "username": "testuser@example.com",
            "password": "password123"
        }
        ```
    *   **Success Response (201 Created):**
        ```json
        {
            "success": true,
            "message": "User registered successfully.",
            "user": {
                "id": 1,
                "username": "testuser@example.com",
                "first_name": "Test",
                "last_name": "User"
            }
        }
        ```
    *   **Error Responses:**
        *   `400 Bad Request` (e.g., validation error):
            ```json
            {
                "success": false,
                "message": "First name must be at least 3 characters long.",
                "token": ""
            }
            ```
        *   `400 Bad Request` (e.g., user already exists):
            ```json
            {
                "success": false,
                "message": "Username already exists.",
                "token": ""
            }
            ```

2.  **Login User**
    *   **Method:** `POST`
    *   **URL:** `{{baseUrl}}/user/login`
    *   **Headers:**
        *   `Content-Type`: `application/json`
    *   **Body (raw, JSON):**
        ```json
        {
            "username": "testuser@example.com",
            "password": "password123"
        }
        ```
    *   **Success Response (200 OK):**
        ```json
        {
            "success": true,
            "message": "Login successful.",
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        }
        ```
    *   **Postman Test Script (to save token):**
        ```javascript
        if (pm.response.code === 200) {
            pm.environment.set("authToken", pm.response.json().token);
        }
        ```
    *   **Error Responses:**
        *   `400 Bad Request` (invalid email format):
            ```json
            {
                "success": false,
                "message": "El email es invalido.",
                "token": ""
            }
            ```
        *   `401 Unauthorized` (invalid credentials):
            ```json
            {
                "success": false,
                "message": "Usuario o clave inválida.",
                "token": ""
            }
            ```

---

### Folder: Event Locations (Authenticated)
*(All requests in this folder require `Authorization: Bearer {{authToken}}` header)*

1.  **Create Event Location**
    *   **Method:** `POST`
    *   **URL:** `{{baseUrl}}/event-location`
    *   **Headers:**
        *   `Content-Type`: `application/json`
        *   `Authorization`: `Bearer {{authToken}}`
    *   **Body (raw, JSON):**
        ```json
        {
            "name": "My New Venue",
            "full_address": "123 Main St, Anytown",
            "id_location": 1, // Assuming location with ID 1 exists (e.g., Nuñez from sample data)
            "max_capacity": 500,
            "latitude": -34.5440,
            "longitude": -58.4490
        }
        ```
    *   **Success Response (201 Created):** (Structure matches `GET /event-location/{id}`)
        ```json
        // Example structure, actual data will vary
        {
            "id": 3,
            "name": "My New Venue",
            "full_address": "123 Main St, Anytown",
            "max_capacity": 500,
            "latitude": "-34.54400000",
            "longitude": "-58.44900000",
            "id_creator_user": 1, // ID of logged-in user
            "location": {
                "id": 1,
                "name": "Nuñez",
                "id_province": 1,
                // ... other location and province details
            }
        }
        ```
    *   **Error Responses:** `400` (validation), `401` (unauthorized)

2.  **List My Event Locations**
    *   **Method:** `GET`
    *   **URL:** `{{baseUrl}}/event-location`
    *   **Headers:**
        *   `Authorization`: `Bearer {{authToken}}`
    *   **Query Params:**
        *   `limit` (optional, e.g., 5)
        *   `offset` (optional, e.g., 0)
    *   **Success Response (200 OK):**
        ```json
        {
            "collection": [
                // array of event location objects created by the user
            ],
            "pagination": {
                "limit": 5,
                "offset": 0,
                "nextPage": "/api/event-location?limit=5&offset=5", // or null
                "total": 10
            }
        }
        ```
    *   **Error Responses:** `401` (unauthorized)

3.  **Get My Event Location by ID**
    *   **Method:** `GET`
    *   **URL:** `{{baseUrl}}/event-location/{{eventLocationId}}` (e.g., replace `{{eventLocationId}}` with an actual ID)
    *   **Headers:**
        *   `Authorization`: `Bearer {{authToken}}`
    *   **Success Response (200 OK):** (Full event location details as per spec)
    *   **Error Responses:** `401` (unauthorized), `404` (not found or not owned)

4.  **Update My Event Location**
    *   **Method:** `PUT`
    *   **URL:** `{{baseUrl}}/event-location/{{eventLocationId}}`
    *   **Headers:**
        *   `Content-Type`: `application/json`
        *   `Authorization`: `Bearer {{authToken}}`
    *   **Body (raw, JSON):** (Provide fields to update)
        ```json
        {
            "name": "My Updated Venue Name",
            "max_capacity": 600
        }
        ```
    *   **Success Response (200 OK):** (Full updated event location details)
    *   **Error Responses:** `400` (validation), `401` (unauthorized), `404` (not found or not owned)

5.  **Delete My Event Location**
    *   **Method:** `DELETE`
    *   **URL:** `{{baseUrl}}/event-location/{{eventLocationId}}`
    *   **Headers:**
        *   `Authorization`: `Bearer {{authToken}}`
    *   **Success Response (200 OK):**
        ```json
        {
            "message": "Event location deleted successfully.",
            "deletedLocation": { /* details of deleted location */ }
        }
        ```
    *   **Error Responses:** `400` (if associated with events), `401` (unauthorized), `404` (not found or not owned)

---

### Folder: Events (Public & Authenticated)

#### Sub-Folder: Public Event Endpoints

1.  **List All Events**
    *   **Method:** `GET`
    *   **URL:** `{{baseUrl}}/event/`
    *   **Query Params:**
        *   `limit` (optional, e.g., 10)
        *   `offset` (optional, e.g., 0)
        *   `name` (optional, e.g., "Taylor")
        *   `startdate` (optional, e.g., "2025-05-10")
        *   `tag` (optional, e.g., "Pop")
    *   **Success Response (200 OK):** (Matches "Listado de Eventos" example in spec)
        ```json
        {
           "collection": [ /* array of event objects */ ],
           "pagination": { /* pagination details */ }
        }
        ```

2.  **Get Event Details by ID**
    *   **Method:** `GET`
    *   **URL:** `{{baseUrl}}/event/{{eventId}}` (e.g., replace `{{eventId}}` with an actual ID like 1 or 2 from sample data)
    *   **Success Response (200 OK):** (Matches "Detalle de un Evento" example in spec)
    *   **Error Response (404 Not Found):**
        ```json
        { "message": "Event not found." }
        ```

#### Sub-Folder: Authenticated Event CRUD
*(All requests in this sub-folder require `Authorization: Bearer {{authToken}}` header)*

1.  **Create Event**
    *   **Method:** `POST`
    *   **URL:** `{{baseUrl}}/event/`
    *   **Headers:**
        *   `Content-Type`: `application/json`
        *   `Authorization`: `Bearer {{authToken}}`
    *   **Body (raw, JSON):**
        ```json
        {
            "name": "My Awesome Concert",
            "description": "A really great concert experience.",
            "id_event_location": 1, // Assuming event location ID 1 exists and is suitable
            "start_date": "2025-12-01T20:00:00.000Z",
            "duration_in_minutes": 180,
            "price": "75.50",
            "enabled_for_enrollment": true,
            "max_assistance": 1000
        }
        ```
    *   **Success Response (201 Created):** (Full event details, similar to `GET /event/{id}`)
    *   **Error Responses:** `400` (validation, business rules), `401` (unauthorized)

2.  **Update Event**
    *   **Method:** `PUT`
    *   **URL:** `{{baseUrl}}/event/{{eventId}}`
    *   **Headers:**
        *   `Content-Type`: `application/json`
        *   `Authorization`: `Bearer {{authToken}}`
    *   **Body (raw, JSON):** (Fields to update)
        ```json
        {
            "description": "An updated description for this great concert.",
            "price": "80.00"
        }
        ```
    *   **Success Response (200 OK):** (Full updated event details)
    *   **Error Responses:** `400` (validation), `401` (unauthorized), `404` (not found or not owned)

3.  **Delete Event**
    *   **Method:** `DELETE`
    *   **URL:** `{{baseUrl}}/event/{{eventId}}`
    *   **Headers:**
        *   `Authorization`: `Bearer {{authToken}}`
    *   **Success Response (200 OK):**
        ```json
        {
            "success": true,
            "message": "Event deleted successfully.",
            "data": { /* details of deleted event */ }
        }
        ```
    *   **Error Responses:** `400` (users registered), `401` (unauthorized), `404` (not found or not owned)

#### Sub-Folder: Event Enrollment (Authenticated)
*(All requests in this sub-folder require `Authorization: Bearer {{authToken}}` header)*

1.  **Enroll in Event**
    *   **Method:** `POST`
    *   **URL:** `{{baseUrl}}/event/{{eventId}}/enrollment`
    *   **Headers:**
        *   `Authorization`: `Bearer {{authToken}}`
    *   **Success Response (201 Created):**
        ```json
        {
            "success": true,
            "message": "Successfully enrolled in the event.",
            "enrollment": { /* enrollment details */ }
        }
        ```
    *   **Error Responses:** `400` (rules: capacity, date, already enrolled, not enabled), `401` (unauthorized), `404` (event not found)

2.  **Unenroll from Event**
    *   **Method:** `DELETE`
    *   **URL:** `{{baseUrl}}/event/{{eventId}}/enrollment`
    *   **Headers:**
        *   `Authorization`: `Bearer {{authToken}}`
    *   **Success Response (200 OK):**
        ```json
        {
            "success": true,
            "message": "Successfully unenrolled from the event."
        }
        ```
    *   **Error Responses:** `400` (rules: not registered, date), `401` (unauthorized), `404` (event not found)

#### Sub-Folder: Event Participants (Authenticated)
*(Requires `Authorization: Bearer {{authToken}}` header)*

1.  **List Event Participants**
    *   **Method:** `GET`
    *   **URL:** `{{baseUrl}}/event/{{eventId}}/participants`
    *   **Headers:**
        *   `Authorization`: `Bearer {{authToken}}`
    *   **Query Params:**
        *   `limit` (optional, e.g., 10)
        *   `offset` (optional, e.g., 0)
    *   **Success Response (200 OK):** (Matches "Listado de Participantes" example in spec)
        ```json
        {
           "collection": [ /* array of participant objects */ ],
           "pagination": { /* pagination details */ }
        }
        ```
    *   **Error Responses:** `401` (unauthorized), `403` (forbidden, not event creator), `404` (event not found)

---
```
