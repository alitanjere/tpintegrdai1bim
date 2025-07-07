-- Drop tables if they exist to ensure a clean slate (optional, for development)
DROP TABLE IF EXISTS event_enrollments CASCADE;
DROP TABLE IF EXISTS event_tags CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS event_locations CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS provinces CASCADE;

-- Table: provinces
CREATE TABLE provinces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    display_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: locations
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    id_province INTEGER NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_province) REFERENCES provinces(id) ON DELETE RESTRICT
);

-- Table: users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    username VARCHAR(255) NOT NULL UNIQUE, -- Email
    password VARCHAR(255) NOT NULL, -- Hashed password
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: event_locations
CREATE TABLE event_locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    full_address VARCHAR(500) NOT NULL,
    id_location INTEGER NOT NULL,
    max_capacity INTEGER CHECK (max_capacity > 0),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    id_creator_user INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_location) REFERENCES locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_creator_user) REFERENCES users(id) ON DELETE CASCADE
);

-- Table: tags
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: events
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    id_event_location INTEGER NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_in_minutes INTEGER CHECK (duration_in_minutes > 0),
    price DECIMAL(10, 2) CHECK (price >= 0),
    enabled_for_enrollment BOOLEAN DEFAULT TRUE,
    max_assistance INTEGER CHECK (max_assistance >= 0),
    id_creator_user INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_event_location) REFERENCES event_locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_creator_user) REFERENCES users(id) ON DELETE CASCADE
);

-- Table: event_tags
CREATE TABLE event_tags (
    id_event INTEGER NOT NULL,
    id_tag INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_event, id_tag),
    FOREIGN KEY (id_event) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (id_tag) REFERENCES tags(id) ON DELETE CASCADE
);

-- Table: event_enrollments
CREATE TABLE event_enrollments (
    id SERIAL PRIMARY KEY,
    id_event INTEGER NOT NULL,
    id_user INTEGER NOT NULL,
    registration_date_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    attended BOOLEAN DEFAULT FALSE,
    rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_event, id_user),
    FOREIGN KEY (id_event) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (id_user) REFERENCES users(id) ON DELETE CASCADE
);

-- Trigger function to update 'updated_at'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
CREATE TRIGGER update_provinces_updated_at BEFORE UPDATE ON provinces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_locations_updated_at BEFORE UPDATE ON event_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_enrollments_updated_at BEFORE UPDATE ON event_enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_id_creator_user ON events(id_creator_user);
CREATE INDEX idx_event_locations_id_creator_user ON event_locations(id_creator_user);
CREATE INDEX idx_event_enrollments_id_user ON event_enrollments(id_user);
CREATE INDEX idx_event_enrollments_id_event ON event_enrollments(id_event);
CREATE INDEX idx_locations_id_province ON locations(id_province);
CREATE INDEX idx_event_tags_id_tag ON event_tags(id_tag);
CREATE INDEX idx_users_username ON users(username);

BEGIN; -- Start transaction for sample data

-- Sample Data --

-- Provinces
INSERT INTO provinces (name, full_name, latitude, longitude) VALUES
('Ciudad Autónoma de Buenos Aires', 'Ciudad Autónoma de Buenos Aires', -34.61444091796875, -58.445877075195312),
('Buenos Aires', 'Provincia de Buenos Aires', -36.67694091796875, -60.558746337890625);

-- Locations
INSERT INTO locations (name, id_province, latitude, longitude) VALUES
('Nuñez', 1, -34.548805236816406, -58.463230133056641),
('Villa Crespo', 1, -34.599876403808594, -58.438816070556641),
('La Plata', 2, -34.920277, -57.955556);

-- Users
-- Password for 'pablo.ulman@ort.edu.ar' is 'pablo123', hash: $2b$10$kF.q9.2XJg0s5E5gQ4wP9e.1U.Z8w7nK.X6gL.zB9yP.xH.sQ9xQO (example)
-- Password for 'jschiffer@example.com' is 'julian123', hash: $2b$10$wN.zX.YgL2QkIuJ8qI.0aWzKe9.V7M4Y7kC6eD0yS9RzauBLg0x3G (example)
-- Note: These hashes are placeholders. For actual login, use hashes generated by bcrypt with known passwords.
INSERT INTO users (first_name, last_name, username, password) VALUES
('Pablo', 'Ulman', 'pablo.ulman@ort.edu.ar', '$2b$10$kF.q9.2XJg0s5E5gQ4wP9e.1U.Z8w7nK.X6gL.zB9yP.xH.sQ9xQO'), -- Expected ID: 1
('Julian', 'Schiffer', 'jschiffer@example.com', '$2b$10$wN.zX.YgL2QkIuJ8qI.0aWzKe9.V7M4Y7kC6eD0yS9RzauBLg0x3G'); -- Expected ID: 2

-- Event Locations (IDs for id_creator_user will correspond to the user IDs above)
INSERT INTO event_locations (name, full_address, id_location, max_capacity, latitude, longitude, id_creator_user) VALUES
('Club Atlético River Plate', 'Av. Pres. Figueroa Alcorta 7597', 1, 84567, -34.54454505693356, -58.4494761175694, 1), -- Created by Pablo (ID 1)
('Movistar Arena', 'Humboldt 450, C1414 Cdad. Autónoma de Buenos Aires', 2, 15000, -34.593488697344405, -58.44735886932156, 1); -- Created by Pablo (ID 1)

-- Tags
INSERT INTO tags (name) VALUES ('Rock'), ('Pop'), ('Electronic'), ('Concert'), ('Festival');

-- Events (IDs for id_creator_user and id_event_location will correspond to IDs from above)
-- Event dates are set to the future to allow for enrollment testing.
INSERT INTO events (name, description, id_event_location, start_date, duration_in_minutes, price, enabled_for_enrollment, max_assistance, id_creator_user) VALUES
('Taylor Swift', 'Un alto show', 1, '2025-05-10T21:00:00-03:00', 210, 15500.00, TRUE, 80000, 2), -- Event ID: 1, Creator: Julian (ID 2), Location: River Plate (ID 1)
('Toto', 'La legendaria banda estadounidense se presentará en Buenos Aires.', 2, '2025-11-22T21:00:00-03:00', 120, 150000.00, TRUE, 12000, 1); -- Event ID: 2, Creator: Pablo (ID 1), Location: Movistar Arena (ID 2)

-- Event Tags (IDs will correspond to event and tag IDs from above)
INSERT INTO event_tags (id_event, id_tag) VALUES
(1, 2), -- Taylor Swift (Event ID 1) - Pop (Tag ID 2)
(1, 4), -- Taylor Swift (Event ID 1) - Concert (Tag ID 4)
(2, 1), -- Toto (Event ID 2) - Rock (Tag ID 1)
(2, 4); -- Toto (Event ID 2) - Concert (Tag ID 4)

-- Event Enrollments (IDs will correspond to event and user IDs from above)
INSERT INTO event_enrollments (id_event, id_user, attended, rating, description) VALUES
(1, 1, FALSE, NULL, NULL), -- Pablo Ulman (User ID 1) enrolled in Taylor Swift (Event ID 1)
(2, 2, FALSE, NULL, NULL); -- Julian Schiffer (User ID 2) enrolled in Toto (Event ID 2)

COMMIT; -- End transaction for sample data

-- Instructions:
-- 1. Ensure you have a PostgreSQL database created.
-- 2. Configure your .env file with DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_DATABASE.
-- 3. Run this script using psql: psql -U your_username -d your_database_name -a -f database.sql
--    Or connect to your database via a client and execute the contents of this file.
-- 4. The placeholder bcrypt hashes for users will need to be replaced with actual hashes
--    if you intend to test login with specific passwords ('pablo123', 'julian123').
--    You can generate these hashes using a Node.js script with the bcrypt library.
--    Alternatively, once the registration endpoint is built, use that to create users with known passwords.
--    Example of generating a hash in Node:
--    const bcrypt = require('bcrypt');
--    const saltRounds = 10;
--    bcrypt.hash('yourPassword', saltRounds).then(hash => console.log(hash));
--
-- The SERIAL type for PKs will auto-increment. The sample data assumes sequential IDs starting from 1
-- for users, event_locations, events, etc., after the DROP/CREATE sequence.
-- If you run parts of the script multiple times or have existing data, these assumed IDs might mismatch.
-- Running the entire script from scratch ensures consistency for the sample data relations.
