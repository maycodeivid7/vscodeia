require('dotenv').config();
const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const { connectDatabase } = require('./config/database');
const Sala = require('./models/sala');
const Reserva = require('./models/reserva');
const { validateReservationInput, validateRoomInput } = require('./utils/reservation-rules');

async function seed() {
  await connectDatabase();
  const filePath = path.join(__dirname, '..', 'data', 'dados-exemplo.json');
  const data = JSON.parse(await fs.readFile(filePath, 'utf8'));

  if (!Array.isArray(data.salas) || !Array.isArray(data.reservas)) {
    throw new Error('O arquivo de dados deve conter listas salas e reservas.');
  }

  for (const source of data.salas) {
    if (typeof source._id !== 'string' || !source._id.trim()) {
      throw new Error('Cada sala de exemplo deve possuir um _id textual.');
    }
    const { _id: roomId, ...roomPayload } = source;
    const room = validateRoomInput(roomPayload);
    await Sala.updateOne(
      { _id: roomId },
      { $setOnInsert: { _id: roomId, ...room } },
      { upsert: true, runValidators: true },
    );
  }

  for (const source of data.reservas) {
    if (typeof source._id !== 'string' || !source._id.trim()) {
      throw new Error('Cada reserva de exemplo deve possuir um _id textual.');
    }
    const { _id: reservationId, ...reservationPayload } = source;
    const reservation = validateReservationInput(reservationPayload);
    await Reserva.db.transaction(async (session) => {
      const existing = await Reserva.exists({ _id: reservationId }).session(session);
      if (existing) {
        return;
      }

      const lockResult = await Sala.updateOne(
        { _id: reservation.salaId },
        { $inc: { reservaVersion: 1 } },
        { session },
      );
      if (lockResult.matchedCount === 0) {
        throw new Error(`Sala "${reservation.salaId}" não encontrada ao importar ${reservationId}.`);
      }
      const room = await Sala.findById(reservation.salaId).session(session);
      if (reservation.quantidadeParticipantes > room.capacidade) {
        throw new Error(`A reserva "${reservationId}" excede a capacidade da sala.`);
      }

      if (reservation.situacao !== 'cancelada') {
        const conflict = await Reserva.exists({
          salaId: reservation.salaId,
          data: reservation.data,
          situacao: { $in: ['pendente', 'aprovada'] },
          inicio: { $lt: reservation.fim },
          fim: { $gt: reservation.inicio },
        }).session(session);
        if (conflict) {
          throw new Error(`A reserva "${reservationId}" conflita com uma reserva já registrada.`);
        }
      }

      await Reserva.create([{ _id: reservationId, ...reservation }], { session });
    });
  }

  console.log('Dados de exemplo inseridos (registros existentes preservados).');
}

seed()
  .catch((error) => {
    console.error('Falha ao carregar os dados de exemplo:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
