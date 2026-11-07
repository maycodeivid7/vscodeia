const NOTIFICATION_EVENTS = ['created', 'approved', 'rejected', 'edited', 'cancelled'];
const STATUS_EVENTS = {
  aprovada: 'approved',
  recusada: 'rejected',
  cancelada: 'cancelled',
};

function reservationNotificationEvent(previousStatus, currentStatus) {
  if (previousStatus === currentStatus) {
    return 'edited';
  }
  return STATUS_EVENTS[currentStatus] || 'edited';
}

function notificationMessage(event, reservation) {
  const details = `"${reservation.finalidade}" · ${reservation.data} · ${reservation.inicio}–${reservation.fim}`;
  const messages = {
    created: `Nova solicitação de reserva: ${details}.`,
    approved: `A reserva foi aprovada: ${details}.`,
    rejected: `A reserva foi recusada: ${details}.`,
    edited: `Uma reserva foi alterada: ${details}.`,
    cancelled: `Uma reserva foi cancelada: ${details}.`,
  };
  const message = messages[event];
  if (!message) {
    throw new Error(`Evento de notificação inválido: ${event}.`);
  }
  return message;
}

module.exports = { NOTIFICATION_EVENTS, notificationMessage, reservationNotificationEvent };
