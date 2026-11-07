const express = require('express');
const { rateLimit } = require('express-rate-limit');
const asyncHandler = require('../middleware/async-handler');
const { optionalAuth, requireAdmin, requireAuth } = require('../middleware/auth');
const controller = require('../controllers/auth-controller');

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de acesso. Aguarde 15 minutos e tente novamente.' },
});

router.post('/login', loginLimiter, asyncHandler(controller.login));
router.post('/logout', optionalAuth, asyncHandler(controller.logout));
router.get('/session', optionalAuth, controller.session);
router.patch('/password', requireAuth, asyncHandler(controller.changePassword));
router.use('/users', requireAuth, requireAdmin);
router.get('/users', asyncHandler(controller.listUsers));
router.post('/users', asyncHandler(controller.createUser));

module.exports = router;
