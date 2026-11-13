const cors = require('cors');
const express = require('express');
const path = require('node:path');
const swaggerUi = require('swagger-ui-express');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/error-handler');
const { getAllowedOrigins } = require('./config/client-origins');
const openApiSpec = require('./docs/openapi');

const app = express();
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || getAllowedOrigins().includes(origin));
  },
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));
app.get('/api/docs/openapi.json', (req, res) => res.json(openApiSpec));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  swaggerOptions: { withCredentials: true },
}));
app.use('/api', apiRoutes);
app.use(express.static(path.join(__dirname, '..', '..', 'frontend', 'dist')));
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
