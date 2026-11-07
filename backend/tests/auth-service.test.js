const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, validateUserInput, verifyPassword } = require('../src/services/auth-service');
const { requireAdmin } = require('../src/middleware/auth');

test('valida e normaliza os dados de conta', () => {
  assert.deepEqual(validateUserInput({
    nome: '  Ana Costa ',
    email: ' ANA@EXEMPLO.EDU.BR ',
    senha: 'uma senha segura 123',
    papel: 'solicitante',
  }), {
    nome: 'Ana Costa',
    email: 'ana@exemplo.edu.br',
    senha: 'uma senha segura 123',
    papel: 'solicitante',
  });
  assert.throws(() => validateUserInput({
    nome: 'Ana',
    email: 'ana@example.edu',
    senha: 'curta',
    papel: 'solicitante',
  }), /12 caracteres/i);
  assert.throws(() => validateUserInput({
    nome: 'Ana',
    email: 'ana@example.edu',
    senha: 'uma senha segura 123',
    papel: 'superadmin',
  }), /papel inválido/i);
});

test('armazena senha derivada e verifica sem armazenar o texto original', async () => {
  const password = 'senha local para teste 123';
  const hash = await hashPassword(password);

  assert.match(hash, /^scrypt\$32768\$8\$1\$/);
  assert.notEqual(hash, password);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword('outra senha', hash), false);
});

test('bloqueia solicitantes de rotas exclusivas de administrador', () => {
  let receivedError;
  requireAdmin({ user: { papel: 'solicitante' } }, {}, (error) => {
    receivedError = error;
  });
  assert.equal(receivedError.status, 403);

  let proceeded = false;
  requireAdmin({ user: { papel: 'admin' } }, {}, (error) => {
    assert.equal(error, undefined);
    proceeded = true;
  });
  assert.equal(proceeded, true);
});
