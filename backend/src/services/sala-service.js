const Sala = require('../models/sala');
const Reserva = require('../models/reserva');
const AppError = require('../utils/app-error');
const { validateRoomInput } = require('../utils/reservation-rules');

async function listRooms() {
  return Sala.find().sort({ nome: 1 }).lean();
}

async function getRoom(id) {
  const room = await Sala.findById(id).lean();
  if (!room) {
    throw new AppError('Sala não encontrada.', 404);
  }
  return room;
}

async function createRoom(payload) {
  const room = validateRoomInput(payload);
  return Sala.create(room);
}

async function updateRoom(id, payload) {
  const changes = validateRoomInput(payload, { partial: true });
  const updatedRoom = await Sala.db.transaction(async (session) => {
    const lockResult = await Sala.updateOne(
      { _id: id },
      { $inc: { reservaVersion: 1 } },
      { session },
    );
    if (lockResult.matchedCount === 0) {
      throw new AppError('Sala não encontrada.', 404);
    }

    const room = await Sala.findById(id).session(session);
    const newCapacity = changes.capacidade ?? room.capacidade;
    const oversizedBooking = await Reserva.exists({
      salaId: id,
      quantidadeParticipantes: { $gt: newCapacity },
    }).session(session);
    if (oversizedBooking) {
      throw new AppError('A capacidade não pode ser reduzida abaixo de uma reserva existente.', 409);
    }

    Object.assign(room, changes);
    await room.save({ session });
    return room;
  });
  return updatedRoom;
}

async function deleteRoom(id) {
  return Sala.db.transaction(async (session) => {
    const lockResult = await Sala.updateOne(
      { _id: id },
      { $inc: { reservaVersion: 1 } },
      { session },
    );
    if (lockResult.matchedCount === 0) {
      throw new AppError('Sala não encontrada.', 404);
    }

    const reservationExists = await Reserva.exists({ salaId: id }).session(session);
    if (reservationExists) {
      throw new AppError('Não é possível remover uma sala que possui reservas registradas.', 409);
    }
    await Sala.deleteOne({ _id: id }, { session });
  });
}

module.exports = {
  createRoom,
  deleteRoom,
  getRoom,
  listRooms,
  updateRoom,
};
