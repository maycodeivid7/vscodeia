const Reserva = require('../models/reserva');
const Sala = require('../models/sala');
const AppError = require('../utils/app-error');
const {
  assertValidTimeRange,
  isValidDate,
  isValidTime,
  validateReservationInput,
} = require('../utils/reservation-rules');

function reservationData(reservation) {
  return {
    salaId: reservation.salaId,
    data: reservation.data,
    inicio: reservation.inicio,
    fim: reservation.fim,
    responsavel: reservation.responsavel,
    finalidade: reservation.finalidade,
    situacao: reservation.situacao,
    quantidadeParticipantes: reservation.quantidadeParticipantes,
  };
}

async function lockRoom(session, roomId) {
  const result = await Sala.updateOne(
    { _id: roomId },
    { $inc: { reservaVersion: 1 } },
    { session },
  );
  if (result.matchedCount === 0) {
    throw new AppError('Sala não encontrada.', 404);
  }
  return Sala.findById(roomId).session(session);
}

function assertCapacity(room, participants) {
  if (participants > room.capacidade) {
    throw new AppError('A quantidade de participantes excede a capacidade da sala.', 400);
  }
}

async function assertNoConflict(data, session, excludedId) {
  if (data.situacao === 'cancelada') {
    return;
  }

  const criteria = {
    salaId: data.salaId,
    data: data.data,
    situacao: { $in: ['pendente', 'aprovada'] },
    inicio: { $lt: data.fim },
    fim: { $gt: data.inicio },
  };
  if (excludedId) {
    criteria._id = { $ne: excludedId };
  }

  const conflict = await Reserva.findOne(criteria).session(session).lean();
  if (conflict) {
    throw new AppError('Já existe uma reserva ativa nesse horário para a sala.', 409);
  }
}

async function listReservations(filters) {
  const criteria = {};
  if (filters.salaId) {
    criteria.salaId = filters.salaId;
  }
  if (filters.data) {
    if (!isValidDate(filters.data)) {
      throw new AppError('O filtro data deve estar no formato AAAA-MM-DD.');
    }
    criteria.data = filters.data;
  }
  if (filters.situacao) {
    if (!['pendente', 'aprovada', 'cancelada'].includes(filters.situacao)) {
      throw new AppError('Filtro situacao inválido.');
    }
    criteria.situacao = filters.situacao;
  }
  return Reserva.find(criteria).sort({ data: 1, inicio: 1 }).lean();
}

async function getReservation(id) {
  const reservation = await Reserva.findById(id).lean();
  if (!reservation) {
    throw new AppError('Reserva não encontrada.', 404);
  }
  return reservation;
}

async function createReservation(payload) {
  const data = validateReservationInput(payload);
  return Reserva.db.transaction(async (session) => {
    const room = await lockRoom(session, data.salaId);
    await assertCapacity(room, data.quantidadeParticipantes);
    await assertNoConflict(data, session);
    const reservation = new Reserva(data);
    await reservation.save({ session });
    return reservation;
  });
}

async function updateReservation(id, payload) {
  const changes = validateReservationInput(payload, { partial: true });
  return Reserva.db.transaction(async (session) => {
    const current = await Reserva.findById(id).session(session);
    if (!current) {
      throw new AppError('Reserva não encontrada.', 404);
    }

    const data = { ...reservationData(current), ...changes };
    assertValidTimeRange(data.inicio, data.fim);
    const room = await lockRoom(session, data.salaId);
    await assertCapacity(room, data.quantidadeParticipantes);
    await assertNoConflict(data, session, id);

    Object.assign(current, data);
    await current.save({ session });
    return current;
  });
}

async function cancelReservation(id) {
  return updateReservation(id, { situacao: 'cancelada' });
}

async function getAvailability(roomId, query) {
  const { data, inicio, fim } = query;
  if (!isValidDate(data)) {
    throw new AppError('A data deve ser válida e estar no formato AAAA-MM-DD.');
  }
  if (!isValidTime(inicio) || !isValidTime(fim)) {
    throw new AppError('Os horários devem estar no formato HH:mm.');
  }
  assertValidTimeRange(inicio, fim);

  const roomExists = await Sala.exists({ _id: roomId });
  if (!roomExists) {
    throw new AppError('Sala não encontrada.', 404);
  }
  const conflicts = await Reserva.find({
    salaId: roomId,
    data,
    situacao: { $in: ['pendente', 'aprovada'] },
    inicio: { $lt: fim },
    fim: { $gt: inicio },
  }).sort({ inicio: 1 }).lean();

  return { salaId: roomId, data, inicio, fim, disponivel: conflicts.length === 0, conflitos: conflicts };
}

module.exports = {
  cancelReservation,
  createReservation,
  getAvailability,
  getReservation,
  listReservations,
  updateReservation,
};
