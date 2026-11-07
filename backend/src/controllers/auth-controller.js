const authService = require('../services/auth-service');
const notificationHub = require('../realtime/notification-hub');
const { SESSION_COOKIE } = require('../middleware/auth');

async function login(req, res) {
  const result = await authService.login(req.body?.email, req.body?.senha);
  res.cookie(SESSION_COOKIE, result.token, {
    ...authService.sessionCookieOptions(),
    expires: result.expiraEm,
  });
  res.json({ user: result.user });
}

async function logout(req, res) {
  await authService.revokeSession(req.sessionToken);
  if (req.user) {
    notificationHub.disconnectSession(req.sessionToken);
  }
  res.clearCookie(SESSION_COOKIE, authService.sessionCookieOptions());
  res.status(204).end();
}

function session(req, res) {
  res.json({ user: req.user });
}

async function createUser(req, res) {
  res.status(201).json(await authService.createUser(req.body));
}

async function listUsers(req, res) {
  res.json(await authService.listUsers());
}

async function changePassword(req, res) {
  await authService.changePassword(req.user.id, req.body?.senhaAtual, req.body?.novaSenha);
  notificationHub.disconnectUser(req.user.id);
  res.clearCookie(SESSION_COOKIE, authService.sessionCookieOptions());
  res.status(204).end();
}

module.exports = { changePassword, createUser, listUsers, login, logout, session };
