const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Event API is running!');
});

const userRoutes = require('./routes/userRoutes');
app.use('/api/user', userRoutes);

const eventLocationRoutes = require('./routes/eventLocationRoutes');
app.use('/api/event-location', eventLocationRoutes);

const eventRoutes = require('./routes/eventRoutes');
app.use('/api/event', eventRoutes);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

module.exports = app;
