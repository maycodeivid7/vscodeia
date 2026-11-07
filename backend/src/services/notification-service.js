const Notification = require('../models/notification');
const User = require('../models/user');
const AppError = require('../utils/app-error');
const { notificationMessage } = require('../utils/notification-rules');

async function initialize() {
  await Notification.init();
}

function notificationData(notification) {
  return {
    _id: notification._id,
    reservaId: notification.reservaId,
    evento: notification.evento,
    mensagem: notification.mensagem,
    lidaEm: notification.lidaEm,
    createdAt: notification.createdAt,
  };
}

async function createForReservation(session, reservation, event) {
  const administrators = await User.find({ papel: 'admin', ativo: true })
    .select('_id')
    .session(session)
    .lean();
  const recipients = new Set([
    reservation.usuarioId,
    ...administrators.map((administrator) => administrator._id),
  ].filter(Boolean));
  if (recipients.size === 0) {
    return [];
  }

  const message = notificationMessage(event, reservation);
  const notifications = await Notification.create(
    [...recipients].map((usuarioId) => ({
      usuarioId,
      reservaId: reservation._id,
      evento: event,
      mensagem: message,
    })),
    { session, ordered: true },
  );
  return notifications.map((notification) => ({
    ...notificationData(notification),
    usuarioId: notification.usuarioId,
  }));
}

async function listForUser(user) {
  await initialize();
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ usuarioId: user.id }).sort({ createdAt: -1 }).lean(),
    Notification.countDocuments({ usuarioId: user.id, lidaEm: null }),
  ]);
  return { notifications: notifications.map(notificationData), unreadCount };
}

async function markRead(id, user) {
  const notification = await Notification.findOneAndUpdate(
    { _id: id, usuarioId: user.id, lidaEm: null },
    { $set: { lidaEm: new Date() } },
    { new: true },
  ).lean();
  if (notification) {
    return notificationData(notification);
  }

  const existing = await Notification.findOne({ _id: id, usuarioId: user.id }).lean();
  if (!existing) {
    throw new AppError('Notificação não encontrada.', 404);
  }
  return notificationData(existing);
}

async function markAllRead(user) {
  const lidaEm = new Date();
  const result = await Notification.updateMany(
    { usuarioId: user.id, lidaEm: null },
    { $set: { lidaEm } },
  );
  return { atualizadas: result.modifiedCount, lidaEm };
}

module.exports = {
  createForReservation,
  initialize,
  listForUser,
  markAllRead,
  markRead,
  notificationData,
};
