require('dotenv').config();
const readline = require('node:readline');
const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database');
const authService = require('../services/auth-service');

function question(prompt) {
  return new Promise((resolve) => {
    const interface_ = readline.createInterface({ input: process.stdin, output: process.stdout });
    interface_.question(prompt, (answer) => {
      interface_.close();
      resolve(answer);
    });
  });
}

function secret(prompt) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Execute este comando em um terminal interativo para informar a senha com segurança.');
  }
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    const output = process.stdout;
    output.write(prompt);
    readline.emitKeypressEvents(input);
    input.setRawMode(true);
    let value = '';

    function finish(error) {
      input.setRawMode(false);
      input.removeListener('keypress', onKeypress);
      output.write('\n');
      if (error) reject(error);
      else resolve(value);
    }

    function onKeypress(character, key) {
      if (key?.ctrl && key.name === 'c') {
        finish(new Error('Operação cancelada.'));
      } else if (key?.name === 'return' || key?.name === 'enter') {
        finish();
      } else if (key?.name === 'backspace') {
        value = value.slice(0, -1);
      } else if (!key?.ctrl && character) {
        value += character;
      }
    }

    input.on('keypress', onKeypress);
    input.resume();
  });
}

async function main() {
  await connectDatabase();
  const nome = await question('Nome do administrador: ');
  const email = await question('E-mail do administrador: ');
  const senha = await secret('Senha (mínimo 12 caracteres): ');
  const confirmation = await secret('Confirme a senha: ');
  if (senha !== confirmation) {
    throw new Error('As senhas não conferem.');
  }
  const user = await authService.createInitialAdmin({ nome, email, senha });
  console.log(`Administrador inicial criado: ${user.email}`);
}

main()
  .catch((error) => {
    console.error('Não foi possível criar o administrador inicial:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
