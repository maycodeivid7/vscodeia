const cors = require('cors');
const express = require('express');
const path = require('node:path');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/error-handler');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim())
    : '*',
}));
app.use(express.json({ limit: '100kb' }));
app.use('/api', apiRoutes);
app.use(express.static(path.join(__dirname, '..', '..', 'frontend', 'dist')));
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
