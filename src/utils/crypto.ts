/**
 * Utilidades de hashing para secretos locales (PIN de usuarios y contraseña maestra).
 *
 * Usa PBKDF2-SHA256 de la Web Crypto API nativa: sin dependencias externas.
 * El formato almacenado es autodescriptivo, para poder subir las iteraciones
 * más adelante sin invalidar los hashes viejos:
 *
 *     pbkdf2$sha256$<iteraciones>$<salt en base64>$<hash en base64>
 *
 * IMPORTANTE: hashear del lado del cliente evita guardar PINs en texto plano,
 * pero NO reemplaza la autenticación del servidor. Mientras la verificación
 * ocurra en el navegador, el hash tiene que ser legible por el cliente. El paso
 * definitivo es mover la verificación a Postgres (RPC con pgcrypto) y cerrar
 * las policies de RLS.
 */

const ALGORITHM = 'pbkdf2';
const DIGEST = 'sha256';
/** Recomendación OWASP para PBKDF2-SHA256. */
const ITERATIONS = 210_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

const PREFIX = `${ALGORITHM}$${DIGEST}$`;

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error(
      'Web Crypto no está disponible. La aplicación debe servirse por HTTPS (o localhost) para poder verificar credenciales.'
    );
  }
  return subtle;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derive(secret: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const subtle = getSubtle();
  const keyMaterial = await subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_BITS
  );
  return new Uint8Array(bits);
}

/** Comparación en tiempo constante: no cortocircuita en el primer byte distinto. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** `true` si el valor ya está hasheado (y no es un PIN/contraseña en texto plano). */
export function isHashed(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/** Deriva un hash nuevo, con salt aleatorio por secreto. */
export async function hashSecret(plain: string): Promise<string> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(plain, salt, ITERATIONS);
  return `${PREFIX}${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

/**
 * Verifica un secreto contra un hash almacenado.
 * Devuelve `false` ante cualquier valor mal formado, en vez de lanzar.
 */
export async function verifySecret(plain: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored || !isHashed(stored)) return false;

  const parts = stored.split('$');
  if (parts.length !== 5) return false;

  const iterations = Number.parseInt(parts[2], 10);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  try {
    const salt = fromBase64(parts[3]);
    const expected = fromBase64(parts[4]);
    const actual = await derive(plain, salt, iterations);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
