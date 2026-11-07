const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./auth-routes');
const notificationRoutes = require('./notification-routes');
const salaRoutes = require('./sala-routes');
const reservaRoutes = require('./reserva-routes');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'indisponivel',
    database: connected ? 'conectado' : 'desconectado',
  });
});
router.use('/auth', authRoutes);
router.use(requireAuth);
router.use('/notifications', notificationRoutes);
router.use('/salas', salaRoutes);
router.use('/reservas', reservaRoutes);

module.exports = router;
