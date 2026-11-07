const cors = require('cors');
const express = require('express');
const path = require('node:path');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/error-handler');
const { getAllowedOrigins } = require('./config/client-origins');

const app = express();
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || getAllowedOrigins().includes(origin));
  },
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));
app.use('/api', apiRoutes);
app.use(express.static(path.join(__dirname, '..', '..', 'frontend', 'dist')));
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
