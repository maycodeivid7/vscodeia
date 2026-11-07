const notificationService = require('../services/notification-service');
const notificationHub = require('../realtime/notification-hub');

async function list(req, res) {
  res.json(await notificationService.listForUser(req.user));
}

async function markRead(req, res) {
  const notification = await notificationService.markRead(req.params.id, req.user);
  notificationHub.publishUserEvent(req.user.id, {
    type: 'notification-read',
    notificationId: notification._id,
    lidaEm: notification.lidaEm,
  });
  res.json(notification);
}

async function markAllRead(req, res) {
  const result = await notificationService.markAllRead(req.user);
  notificationHub.publishUserEvent(req.user.id, {
    type: 'notifications-read-all',
    lidaEm: result.lidaEm,
  });
  res.json(result);
}

module.exports = { list, markAllRead, markRead };
