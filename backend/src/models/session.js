const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');

const sessionSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  usuarioId: { type: String, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiraEm: { type: Date, required: true, expires: 0 },
}, {
  timestamps: true,
  versionKey: false,
});

module.exports = mongoose.model('Session', sessionSchema);
