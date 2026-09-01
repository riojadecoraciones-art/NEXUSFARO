#!/usr/bin/env node
/**
 * Genera el hash PBKDF2 de la contraseña maestra para VITE_MASTER_PASSWORD_HASH.
 *
 * Uso:
 *   npm run hash-password            (la pide por consola)
 *   npm run hash-password -- "..."   (la toma del argumento)
 *
 * El formato de salida es idéntico al de src/utils/crypto.ts:
 *   pbkdf2$sha256$<iteraciones>$<salt base64>$<hash base64>
 */
import { pbkdf2, randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { promisify } from 'node:util';

const ITERATIONS = 210_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

const pbkdf2Async = promisify(pbkdf2);

async function readPassword() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question('Contraseña maestra (se mostrará en pantalla): ');
  } finally {
    rl.close();
  }
}

const password = process.argv[2] ?? (await readPassword());

if (!password || password.length < 12) {
  console.error('\nLa contraseña maestra debe tener al menos 12 caracteres.');
  process.exit(1);
}

const salt = randomBytes(SALT_BYTES);
const hash = await pbkdf2Async(password, salt, ITERATIONS, KEY_BYTES, 'sha256');
const encoded = ['pbkdf2', 'sha256', ITERATIONS, salt.toString('base64'), hash.toString('base64')].join('$');

console.log('\nPegá esta línea en tu archivo .env.local:\n');
console.log(`VITE_MASTER_PASSWORD_HASH="${encoded}"\n`);
console.log('Guardá la contraseña en un gestor de contraseñas: el hash no se puede revertir.\n');
