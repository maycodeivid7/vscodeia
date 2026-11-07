const { promisify } = require('node:util');
const {
  createHash,
  randomBytes,
  scrypt: scryptCallback,
  timingSafeEqual,
} = require('node:crypto');
const User = require('../models/user');
const Session = require('../models/session');
const AuthBootstrap = require('../models/auth-bootstrap');
const AppError = require('../utils/app-error');

const scrypt = promisify(scryptCallback);
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;
const DUMMY_HASH = `scrypt$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${Buffer.alloc(16).toString('base64url')}$${Buffer.alloc(KEY_LENGTH).toString('base64url')}`;

function validateUserInput(payload, { includeRole = true } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError('Informe os dados da conta.');
  }
  const allowedFields = includeRole
    ? ['nome', 'email', 'senha', 'papel']
    : ['nome', 'email', 'senha'];
  const unknownFields = Object.keys(payload).filter((key) => !allowedFields.includes(key));
  if (unknownFields.length > 0) {
    throw new AppError(`Campos não permitidos: ${unknownFields.join(', ')}.`);
  }

  const nome = typeof payload.nome === 'string' ? payload.nome.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const senha = typeof payload.senha === 'string' ? payload.senha : '';
  if (nome.length < 2 || nome.length > 80) {
    throw new AppError('O nome deve ter entre 2 e 80 caracteres.');
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError('Informe um endereço de e-mail válido.');
  }
  validatePassword(senha);

  const papel = includeRole ? payload.papel : 'solicitante';
  if (!['admin', 'solicitante'].includes(papel)) {
    throw new AppError('Papel inválido.');
  }
  return { nome, email, senha, papel };
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 128) {
    throw new AppError('A senha deve ter pelo menos 12 caracteres e no máximo 128 bytes.');
  }
}

function publicUser(user) {
  return {
    id: user._id,
    nome: user.nome,
    email: user.email,
    papel: user.papel,
  };
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);
  return `scrypt$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${salt.toString('base64url')}$${derivedKey.toString('base64url')}`;
}

async function verifyPassword(password, encodedHash) {
  const parts = encodedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, cost, blockSize, parallelization, saltText, keyText] = parts;
  const N = Number(cost);
  const r = Number(blockSize);
  const p = Number(parallelization);
  const expectedKey = Buffer.from(keyText, 'base64url');
  if (!Number.isSafeInteger(N) || !Number.isSafeInteger(r) || !Number.isSafeInteger(p)
    || expectedKey.length !== KEY_LENGTH || N > SCRYPT_OPTIONS.N || r > SCRYPT_OPTIONS.r || p > SCRYPT_OPTIONS.p) {
    return false;
  }
  const actualKey = await scrypt(password, Buffer.from(saltText, 'base64url'), KEY_LENGTH, {
    N, r, p, maxmem: SCRYPT_OPTIONS.maxmem,
  });
  return timingSafeEqual(expectedKey, actualKey);
}

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

async function createUser(payload) {
  const data = validateUserInput(payload);
  const senhaHash = await hashPassword(data.senha);
  await User.init();
  const user = await User.create({
    nome: data.nome,
    email: data.email,
    senhaHash,
    papel: data.papel,
  });
  return publicUser(user);
}

async function createInitialAdmin(payload) {
  const data = validateUserInput({ ...payload, papel: 'admin' });
  const senhaHash = await hashPassword(data.senha);
  try {
    await User.init();
    await AuthBootstrap.init();
    return await User.db.transaction(async (session) => {
      if (await User.countDocuments().session(session) > 0) {
        throw new AppError('Já existem contas cadastradas. O administrador inicial já foi configurado.', 409);
      }
      await AuthBootstrap.create([{ _id: 'initial-admin' }], { session });
      const user = new User({
        nome: data.nome,
        email: data.email,
        senhaHash,
        papel: 'admin',
      });
      await user.save({ session });
      return publicUser(user);
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError('A configuração inicial já foi concluída ou o e-mail já está em uso.', 409);
    }
    throw error;
  }
}

async function listUsers() {
  const users = await User.find().select('nome email papel ativo createdAt').sort({ nome: 1 }).lean();
  return users.map((user) => ({
    id: user._id,
    nome: user.nome,
    email: user.email,
    papel: user.papel,
    ativo: user.ativo,
    criadoEm: user.createdAt,
  }));
}

async function login(emailInput, password) {
  const email = typeof emailInput === 'string' ? emailInput.trim().toLowerCase() : '';
  const user = await User.findOne({ email }).select('+senhaHash');
  const passwordMatches = await verifyPassword(
    typeof password === 'string' ? password : '',
    user?.senhaHash || DUMMY_HASH,
  );
  if (!user || !user.ativo || !passwordMatches) {
    throw new AppError('E-mail ou senha incorretos.', 401);
  }

  const token = randomBytes(32).toString('base64url');
  const expiraEm = new Date(Date.now() + SESSION_DURATION_MS);
  await Session.init();
  await Session.create({
    usuarioId: user._id,
    tokenHash: hashSessionToken(token),
    expiraEm,
  });

  return { token, expiraEm, user: publicUser(user) };
}

async function getSession(token) {
  if (!token) {
    return null;
  }
  const session = await Session.findOne({
    tokenHash: hashSessionToken(token),
    expiraEm: { $gt: new Date() },
  }).lean();
  if (!session) {
    return null;
  }
  const user = await User.findOne({ _id: session.usuarioId, ativo: true }).lean();
  return user ? publicUser(user) : null;
}

async function revokeSession(token) {
  if (token) {
    await Session.deleteOne({ tokenHash: hashSessionToken(token) });
  }
}

async function changePassword(userId, currentPassword, newPassword) {
  validatePassword(newPassword);
  const user = await User.findById(userId).select('+senhaHash');
  if (!user || !(await verifyPassword(
    typeof currentPassword === 'string' ? currentPassword : '',
    user.senhaHash,
  ))) {
    throw new AppError('A senha atual está incorreta.', 401);
  }
  user.senhaHash = await hashPassword(newPassword);
  await user.save();
  await Session.deleteMany({ usuarioId: userId });
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api',
    maxAge: SESSION_DURATION_MS,
  };
}

module.exports = {
  createInitialAdmin,
  createUser,
  changePassword,
  getSession,
  hashPassword,
  listUsers,
  login,
  publicUser,
  revokeSession,
  sessionCookieOptions,
  validateUserInput,
  verifyPassword,
};
