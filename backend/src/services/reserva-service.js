const Reserva = require('../models/reserva');
const Sala = require('../models/sala');
const notificationService = require('./notification-service');
const notificationHub = require('../realtime/notification-hub');
const AppError = require('../utils/app-error');
const { reservationNotificationEvent } = require('../utils/notification-rules');
const {
  ACTIVE_RESERVATION_STATUSES,
  RESERVATION_STATUSES,
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
  if (!ACTIVE_RESERVATION_STATUSES.includes(data.situacao)) {
    return;
  }

  const criteria = {
    salaId: data.salaId,
    data: data.data,
    situacao: { $in: ACTIVE_RESERVATION_STATUSES },
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

async function listReservations(filters, user) {
  const criteria = {};
  if (user.papel !== 'admin') {
    criteria.usuarioId = user.id;
  }
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
    if (!RESERVATION_STATUSES.includes(filters.situacao)) {
      throw new AppError('Filtro situacao inválido.');
    }
    criteria.situacao = filters.situacao;
  }
  return Reserva.find(criteria).sort({ data: 1, inicio: 1 }).lean();
}

async function getReservation(id, user) {
  const criteria = user.papel === 'admin' ? { _id: id } : { _id: id, usuarioId: user.id };
  const reservation = await Reserva.findOne(criteria).lean();
  if (!reservation) {
    throw new AppError('Reserva não encontrada.', 404);
  }
  return reservation;
}

async function createReservation(payload, user) {
  if (user.papel !== 'admin' && payload?.situacao && payload.situacao !== 'pendente') {
    throw new AppError('Solicitantes só podem criar reservas pendentes.', 403);
  }
  const input = user.papel === 'admin'
    ? payload
    : { ...payload, responsavel: user.nome, situacao: 'pendente' };
  const data = validateReservationInput(input);
  data.usuarioId = user.id;
  await notificationService.initialize();
  const result = await Reserva.db.transaction(async (session) => {
    const room = await lockRoom(session, data.salaId);
    await assertCapacity(room, data.quantidadeParticipantes);
    await assertNoConflict(data, session);
    const reservation = new Reserva(data);
    await reservation.save({ session });
    const notifications = await notificationService.createForReservation(session, reservation, 'created');
    return { notifications, reservation };
  });
  notificationHub.publishNotifications(result.notifications);
  return result.reservation;
}

async function updateReservation(id, payload, user, { requesterCancellation = false } = {}) {
  const changes = validateReservationInput(payload, { partial: true });
  if (user.papel !== 'admin'
    && ((!requesterCancellation && Object.hasOwn(changes, 'situacao'))
      || Object.hasOwn(changes, 'responsavel'))) {
    throw new AppError('Solicitantes não podem alterar a situação ou o responsável da reserva.', 403);
  }
  await notificationService.initialize();
  const result = await Reserva.db.transaction(async (session) => {
    const criteria = user.papel === 'admin' ? { _id: id } : { _id: id, usuarioId: user.id };
    const current = await Reserva.findOne(criteria).session(session);
    if (!current) {
      throw new AppError('Reserva não encontrada.', 404);
    }

    const data = { ...reservationData(current), ...changes };
    assertValidTimeRange(data.inicio, data.fim);
    const changed = Object.keys(data).some((field) => data[field] !== current[field]);
    if (!changed) {
      return { notifications: [], reservation: current };
    }

    const room = await lockRoom(session, data.salaId);
    await assertCapacity(room, data.quantidadeParticipantes);
    await assertNoConflict(data, session, id);

    const previousStatus = current.situacao;
    Object.assign(current, data);
    await current.save({ session });
    const event = reservationNotificationEvent(previousStatus, data.situacao);
    const notifications = await notificationService.createForReservation(session, current, event);
    return { notifications, reservation: current };
  });
  notificationHub.publishNotifications(result.notifications);
  return result.reservation;
}

async function cancelReservation(id, user) {
  return updateReservation(id, { situacao: 'cancelada' }, user, { requesterCancellation: true });
}

async function getAvailability(roomId, query, user) {
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
    situacao: { $in: ACTIVE_RESERVATION_STATUSES },
    inicio: { $lt: fim },
    fim: { $gt: inicio },
  }).sort({ inicio: 1 }).lean();

  const safeConflicts = user.papel === 'admin'
    ? conflicts
    : conflicts.map(({ _id, inicio: conflictStart, fim: conflictEnd }) => ({
      _id,
      inicio: conflictStart,
      fim: conflictEnd,
    }));
  return { salaId: roomId, data, inicio, fim, disponivel: conflicts.length === 0, conflitos: safeConflicts };
}

module.exports = {
  cancelReservation,
  createReservation,
  getAvailability,
  getReservation,
  listReservations,
  updateReservation,
};
