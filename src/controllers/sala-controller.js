const salaService = require('../services/sala-service');
const reservaService = require('../services/reserva-service');

async function list(req, res) {
  res.json(await salaService.listRooms());
}

async function get(req, res) {
  res.json(await salaService.getRoom(req.params.id));
}

async function create(req, res) {
  res.status(201).json(await salaService.createRoom(req.body));
}

async function update(req, res) {
  res.json(await salaService.updateRoom(req.params.id, req.body));
}

async function remove(req, res) {
  await salaService.deleteRoom(req.params.id);
  res.status(204).end();
}

async function availability(req, res) {
  res.json(await reservaService.getAvailability(req.params.id, req.query));
}

module.exports = { availability, create, get, list, remove, update };
