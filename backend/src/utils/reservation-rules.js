const AppError = require('./app-error');

const RESERVATION_STATUSES = ['pendente', 'aprovada', 'recusada', 'cancelada'];
const ACTIVE_RESERVATION_STATUSES = ['pendente', 'aprovada'];
const ROOM_FIELDS = ['nome', 'andar', 'capacidade', 'recursos'];
const RESERVATION_FIELDS = [
  'salaId',
  'data',
  'inicio',
  'fim',
  'responsavel',
  'finalidade',
  'situacao',
  'quantidadeParticipantes',
];

function assertObject(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError('O corpo da requisição deve ser um objeto JSON.');
  }
}

function assertKnownFields(payload, allowedFields) {
  const unknownFields = Object.keys(payload).filter((field) => !allowedFields.includes(field));
  if (unknownFields.length) {
    throw new AppError(`Campo(s) não permitido(s): ${unknownFields.join(', ')}.`);
  }
}

function validateRoomInput(payload, { partial = false } = {}) {
  assertObject(payload);
  assertKnownFields(payload, ROOM_FIELDS);

  if (partial && Object.keys(payload).length === 0) {
    throw new AppError('Informe ao menos um campo para atualizar a sala.');
  }

  const requiredFields = partial ? [] : ROOM_FIELDS;
  for (const field of requiredFields) {
    if (!Object.hasOwn(payload, field)) {
      throw new AppError(`O campo "${field}" é obrigatório.`);
    }
  }

  const room = {};
  if (Object.hasOwn(payload, 'nome')) {
    if (typeof payload.nome !== 'string' || !payload.nome.trim()) {
      throw new AppError('O nome da sala deve ser um texto não vazio.');
    }
    room.nome = payload.nome.trim();
  }
  if (Object.hasOwn(payload, 'andar')) {
    if (!Number.isInteger(payload.andar)) {
      throw new AppError('O andar deve ser um número inteiro.');
    }
    room.andar = payload.andar;
  }
  if (Object.hasOwn(payload, 'capacidade')) {
    if (!Number.isInteger(payload.capacidade) || payload.capacidade < 1) {
      throw new AppError('A capacidade deve ser um número inteiro maior que zero.');
    }
    room.capacidade = payload.capacidade;
  }
  if (Object.hasOwn(payload, 'recursos')) {
    if (!Array.isArray(payload.recursos)
      || payload.recursos.some((item) => typeof item !== 'string' || !item.trim())) {
      throw new AppError('Os recursos devem ser uma lista de textos não vazios.');
    }
    room.recursos = payload.recursos.map((item) => item.trim());
  }
  return room;
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
}

function isValidTime(value) {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function validateReservationInput(payload, { partial = false } = {}) {
  assertObject(payload);
  assertKnownFields(payload, RESERVATION_FIELDS);

  if (partial && Object.keys(payload).length === 0) {
    throw new AppError('Informe ao menos um campo para atualizar a reserva.');
  }

  const requiredFields = partial
    ? []
    : RESERVATION_FIELDS.filter((field) => field !== 'situacao');
  for (const field of requiredFields) {
    if (!Object.hasOwn(payload, field)) {
      throw new AppError(`O campo "${field}" é obrigatório.`);
    }
  }

  const reservation = {};
  if (Object.hasOwn(payload, 'salaId')) {
    if (typeof payload.salaId !== 'string' || !payload.salaId.trim()) {
      throw new AppError('A sala informada é inválida.');
    }
    reservation.salaId = payload.salaId.trim();
  }
  if (Object.hasOwn(payload, 'data')) {
    if (!isValidDate(payload.data)) {
      throw new AppError('A data deve ser válida e estar no formato AAAA-MM-DD.');
    }
    reservation.data = payload.data;
  }
  for (const field of ['inicio', 'fim']) {
    if (Object.hasOwn(payload, field)) {
      if (!isValidTime(payload[field])) {
        throw new AppError(`O campo "${field}" deve estar no formato HH:mm.`);
      }
      reservation[field] = payload[field];
    }
  }
  for (const field of ['responsavel', 'finalidade']) {
    if (Object.hasOwn(payload, field)) {
      if (typeof payload[field] !== 'string' || !payload[field].trim()) {
        throw new AppError(`O campo "${field}" deve ser um texto não vazio.`);
      }
      reservation[field] = payload[field].trim();
    }
  }
  if (Object.hasOwn(payload, 'situacao')) {
    if (!RESERVATION_STATUSES.includes(payload.situacao)) {
      throw new AppError(`A situação deve ser: ${RESERVATION_STATUSES.join(', ')}.`);
    }
    reservation.situacao = payload.situacao;
  }
  if (Object.hasOwn(payload, 'quantidadeParticipantes')) {
    if (!Number.isInteger(payload.quantidadeParticipantes)
      || payload.quantidadeParticipantes < 1) {
      throw new AppError('A quantidade de participantes deve ser um inteiro maior que zero.');
    }
    reservation.quantidadeParticipantes = payload.quantidadeParticipantes;
  }

  if (!partial) {
    reservation.situacao = reservation.situacao || 'pendente';
    assertValidTimeRange(reservation.inicio, reservation.fim);
  }
  return reservation;
}

function assertValidTimeRange(inicio, fim) {
  if (!isValidTime(inicio) || !isValidTime(fim) || inicio >= fim) {
    throw new AppError('O horário de término deve ser posterior ao horário de início.');
  }
}

function hasTimeConflict(first, second) {
  return first.salaId === second.salaId
    && first.data === second.data
    && ACTIVE_RESERVATION_STATUSES.includes(first.situacao)
    && ACTIVE_RESERVATION_STATUSES.includes(second.situacao)
    && first.inicio < second.fim
    && second.inicio < first.fim;
}

module.exports = {
  ACTIVE_RESERVATION_STATUSES,
  RESERVATION_STATUSES,
  assertValidTimeRange,
  hasTimeConflict,
  isValidDate,
  isValidTime,
  validateReservationInput,
  validateRoomInput,
};
