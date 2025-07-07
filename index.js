const express = require('express');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.send('Event API is running!');
});

// User routes
const userRoutes = require('./routes/userRoutes');
app.use('/api/user', userRoutes);

// Event Location routes
const eventLocationRoutes = require('./routes/eventLocationRoutes');
app.use('/api/event-location', eventLocationRoutes);

// Event routes
const eventRoutes = require('./routes/eventRoutes');
app.use('/api/event', eventRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

module.exports = app; // For potential testing
