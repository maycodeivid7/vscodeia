const AppError = require('../utils/app-error');

function notFoundHandler(req, res, next) {
  next(new AppError('Endpoint não encontrado.', 404));
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof AppError) {
    return res.status(error.status).json({ erro: error.message });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'O corpo da requisição contém JSON inválido.' });
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ erro: error.message });
  }
  if (error.name === 'CastError') {
    return res.status(400).json({ erro: 'Identificador ou valor inválido.' });
  }
  if (error.code === 11000) {
    return res.status(409).json({ erro: 'Já existe um registro com esses dados únicos.' });
  }

  console.error('Erro não tratado na API:', error);
  return res.status(500).json({ erro: 'Ocorreu um erro interno.' });
}

module.exports = { errorHandler, notFoundHandler };
