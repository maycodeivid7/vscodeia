const express = require('express');
const mongoose = require('mongoose');
const salaRoutes = require('./sala-routes');
const reservaRoutes = require('./reserva-routes');

const router = express.Router();

router.get('/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'indisponivel',
    database: connected ? 'conectado' : 'desconectado',
  });
});
router.use('/salas', salaRoutes);
router.use('/reservas', reservaRoutes);

module.exports = router;
