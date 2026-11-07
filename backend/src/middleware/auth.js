const asyncHandler = require('./async-handler');
const authService = require('../services/auth-service');
const AppError = require('../utils/app-error');

const SESSION_COOKIE = 'nexo_session';

function readSessionToken(req) {
  const cookieHeader = req.headers.cookie || '';
  const cookie = cookieHeader.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (!cookie) {
    return null;
  }
  return cookie.slice(SESSION_COOKIE.length + 1);
}

const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = readSessionToken(req);
  req.sessionToken = token;
  req.user = await authService.getSession(token);
  next();
});

const requireAuth = asyncHandler(async (req, res, next) => {
  const token = readSessionToken(req);
  const user = await authService.getSession(token);
  if (!user) {
    throw new AppError('Autenticação necessária.', 401);
  }
  req.sessionToken = token;
  req.user = user;
  next();
});

function requireAdmin(req, res, next) {
  if (req.user?.papel !== 'admin') {
    return next(new AppError('Você não tem permissão para realizar esta ação.', 403));
  }
  return next();
}

module.exports = { optionalAuth, readSessionToken, requireAdmin, requireAuth, SESSION_COOKIE };
