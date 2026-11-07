const test = require('node:test');
const assert = require('node:assert/strict');
const {
  notificationMessage,
  reservationNotificationEvent,
} = require('../src/utils/notification-rules');

test('converte mudanças de situação nos eventos de notificação definidos', () => {
  assert.equal(reservationNotificationEvent('pendente', 'aprovada'), 'approved');
  assert.equal(reservationNotificationEvent('pendente', 'recusada'), 'rejected');
  assert.equal(reservationNotificationEvent('aprovada', 'cancelada'), 'cancelled');
  assert.equal(reservationNotificationEvent('pendente', 'pendente'), 'edited');
  assert.equal(reservationNotificationEvent('aprovada', 'pendente'), 'edited');
});

test('gera mensagens para todos os eventos e rejeita eventos desconhecidos', () => {
  const reservation = {
    finalidade: 'Aula de laboratório',
    data: '2026-11-03',
    inicio: '10:00',
    fim: '11:00',
  };
  for (const event of ['created', 'approved', 'rejected', 'edited', 'cancelled']) {
    assert.match(notificationMessage(event, reservation), /Aula de laboratório/);
  }
  assert.throws(() => notificationMessage('unknown', reservation), /Evento de notificação inválido/);
});
