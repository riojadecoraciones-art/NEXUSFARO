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

// Vite carga .env.local con dotenv-expand, que interpreta "$palabra" como una
// referencia a otra variable (p.ej. "$sha256" → busca una variable SHA256).
// Sin escapar, eso rompe el hash en pedazos silenciosamente: la app arranca
// pero el acceso maestro nunca coincide, sin ningún error visible. Escapar
// cada "$" como "\$" hace que dotenv-expand lo deje intacto.
//
// Ese mismo escape NO corresponde en el panel de variables de entorno de un
// hosting (Vercel, Netlify, etc.): ahí el valor se inyecta directo a
// process.env, sin pasar nunca por dotenv-expand — así que las barras
// quedarían pegadas al hash de verdad, rompiéndolo de nuevo, pero al revés.
// Por eso se imprimen las dos versiones, cada una para su lugar.
const escapedForEnvFile = encoded.replace(/\$/g, '\\$');

console.log('\nPara tu archivo .env.local (uso local, npm run dev):\n');
console.log(`VITE_MASTER_PASSWORD_HASH="${escapedForEnvFile}"\n`);
console.log('Para el panel de variables de entorno de tu hosting (Vercel, Netlify, etc. — SIN barras):\n');
console.log(`VITE_MASTER_PASSWORD_HASH=${encoded}\n`);
console.log('Guardá la contraseña en un gestor de contraseñas: el hash no se puede revertir.\n');
