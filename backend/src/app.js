const cors = require('cors');
const express = require('express');
const path = require('node:path');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/error-handler');

const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.includes(origin));
  },
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));
app.use('/api', apiRoutes);
app.use(express.static(path.join(__dirname, '..', '..', 'frontend', 'dist')));
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
