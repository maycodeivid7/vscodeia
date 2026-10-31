const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { RESERVATION_STATUSES } = require('../utils/reservation-rules');

const reservaSchema = new mongoose.Schema({
  _id: { type: String, default: randomUUID },
  salaId: { type: String, ref: 'Sala', required: true, index: true },
  data: { type: String, required: true },
  inicio: { type: String, required: true },
  fim: { type: String, required: true },
  responsavel: { type: String, required: true, trim: true },
  finalidade: { type: String, required: true, trim: true },
  situacao: { type: String, enum: RESERVATION_STATUSES, required: true, default: 'pendente' },
  quantidadeParticipantes: {
    type: Number,
    required: true,
    min: 1,
    validate: Number.isInteger,
  },
}, {
  timestamps: true,
  versionKey: false,
});

reservaSchema.index({ salaId: 1, data: 1, inicio: 1, fim: 1, situacao: 1 });

module.exports = mongoose.model('Reserva', reservaSchema);
