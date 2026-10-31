const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');

const salaSchema = new mongoose.Schema({
  _id: { type: String, default: randomUUID },
  nome: { type: String, required: true, trim: true },
  andar: { type: Number, required: true, validate: Number.isInteger },
  capacidade: { type: Number, required: true, min: 1, validate: Number.isInteger },
  recursos: { type: [String], required: true, default: [] },
  reservaVersion: { type: Number, default: 0, select: false },
}, {
  timestamps: true,
  versionKey: false,
});

salaSchema.index({ nome: 1 }, { unique: true });

module.exports = mongoose.model('Sala', salaSchema);
