const reservaService = require('../services/reserva-service');

async function list(req, res) {
  res.json(await reservaService.listReservations(req.query));
}

async function get(req, res) {
  res.json(await reservaService.getReservation(req.params.id));
}

async function create(req, res) {
  res.status(201).json(await reservaService.createReservation(req.body));
}

async function update(req, res) {
  res.json(await reservaService.updateReservation(req.params.id, req.body));
}

async function cancel(req, res) {
  res.json(await reservaService.cancelReservation(req.params.id));
}

module.exports = { cancel, create, get, list, update };
