const test = require('node:test');
const assert = require('node:assert/strict');
const Sala = require('../src/models/sala');
const Reserva = require('../src/models/reserva');

test('modelos geram UUIDs válidos sem conexão com o banco', () => {
  const firstRoom = new Sala({ nome: 'Sala A', andar: 1, capacidade: 10 });
  const secondRoom = new Sala({ nome: 'Sala B', andar: 2, capacidade: 20 });
  const reservation = new Reserva({
    salaId: firstRoom._id,
    data: '2027-01-15',
    inicio: '09:00',
    fim: '10:00',
    responsavel: 'Ana',
    finalidade: 'Aula',
    quantidadeParticipantes: 5,
  });

  assert.match(firstRoom._id, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.match(secondRoom._id, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.match(reservation._id, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.notEqual(firstRoom._id, secondRoom._id);
  assert.notEqual(firstRoom._id, reservation._id);
});
