const mongoose = require('mongoose');

const authBootstrapSchema = new mongoose.Schema({
  _id: { type: String },
}, {
  versionKey: false,
});

module.exports = mongoose.model('AuthBootstrap', authBootstrapSchema);
