const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { NOTIFICATION_EVENTS } = require('../utils/notification-rules');

const notificationSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  usuarioId: { type: String, ref: 'User', required: true },
  reservaId: { type: String, ref: 'Reserva', required: true },
  evento: { type: String, enum: NOTIFICATION_EVENTS, required: true },
  mensagem: { type: String, required: true, maxlength: 500 },
  lidaEm: { type: Date, default: null },
}, {
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
});

notificationSchema.index({ usuarioId: 1, createdAt: -1 });
notificationSchema.index({ usuarioId: 1, lidaEm: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
