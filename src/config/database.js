const mongoose = require('mongoose');

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('Configure MONGODB_URI antes de iniciar a API.');
  }

  await mongoose.connect(uri);
  console.log('Conexão com MongoDB estabelecida.');
}

module.exports = { connectDatabase };
