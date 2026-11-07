const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');

const userSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  nome: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  senhaHash: { type: String, required: true, select: false },
  papel: { type: String, required: true, enum: ['admin', 'solicitante'], default: 'solicitante' },
  ativo: { type: Boolean, default: true },
}, {
  timestamps: true,
  versionKey: false,
});

userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
