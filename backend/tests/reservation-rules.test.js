const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertValidTimeRange,
  hasTimeConflict,
  isValidDate,
  validateReservationInput,
  validateRoomInput,
} = require('../src/utils/reservation-rules');

test('valida salas e normaliza espaços em branco', () => {
  assert.deepEqual(validateRoomInput({
    nome: ' Sala 1 ',
    andar: 1,
    capacidade: 20,
    recursos: [' projetor '],
  }), {
    nome: 'Sala 1',
    andar: 1,
    capacidade: 20,
    recursos: ['projetor'],
  });
});

test('rejeita capacidade e recursos inválidos', () => {
  assert.throws(() => validateRoomInput({
    nome: 'Sala', andar: 1, capacidade: 0, recursos: [],
  }), /capacidade/i);
  assert.throws(() => validateRoomInput({
    nome: 'Sala', andar: 1, capacidade: 10, recursos: ['  '],
  }), /recursos/i);
});

test('valida data real no formato ISO', () => {
  assert.equal(isValidDate('2026-02-28'), true);
  assert.equal(isValidDate('2026-02-30'), false);
  assert.equal(isValidDate('28-02-2026'), false);
});

test('criação assume situação pendente e valida intervalo', () => {
  const reservation = validateReservationInput({
    salaId: 'sala-1',
    data: '2026-11-03',
    inicio: '10:00',
    fim: '11:00',
    responsavel: 'Ana',
    finalidade: 'Aula',
    quantidadeParticipantes: 10,
  });
  assert.equal(reservation.situacao, 'pendente');
  assert.throws(() => assertValidTimeRange('11:00', '10:00'), /posterior/i);
});

test('reservas consecutivas não conflitam, mas sobreposição ativa conflita', () => {
  const first = {
    salaId: 'sala-1', data: '2026-11-03', inicio: '10:00', fim: '11:00', situacao: 'aprovada',
  };
  assert.equal(hasTimeConflict(first, { ...first, inicio: '11:00', fim: '12:00' }), false);
  assert.equal(hasTimeConflict(first, { ...first, inicio: '10:30', fim: '11:30' }), true);
  assert.equal(hasTimeConflict(first, { ...first, situacao: 'cancelada' }), false);
});

test('rejeita situação fora dos valores permitidos e campos desconhecidos', () => {
  const reservation = {
    salaId: 'sala-1',
    data: '2026-11-03',
    inicio: '10:00',
    fim: '11:00',
    responsavel: 'Ana',
    finalidade: 'Aula',
    quantidadeParticipantes: 10,
    situacao: 'concluida',
  };
  assert.throws(() => validateReservationInput(reservation), /situação/i);
  assert.throws(() => validateReservationInput({ ...reservation, situacao: 'pendente', extra: true }), /não permitido/i);
});
