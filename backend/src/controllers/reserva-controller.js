const reservaService = require('../services/reserva-service');

async function list(req, res) {
  res.json(await reservaService.listReservations(req.query, req.user));
}

async function get(req, res) {
  res.json(await reservaService.getReservation(req.params.id, req.user));
}

async function create(req, res) {
  res.status(201).json(await reservaService.createReservation(req.body, req.user));
}

async function update(req, res) {
  res.json(await reservaService.updateReservation(req.params.id, req.body, req.user));
}

async function cancel(req, res) {
  res.json(await reservaService.cancelReservation(req.params.id, req.user));
}

module.exports = { cancel, create, get, list, update };
