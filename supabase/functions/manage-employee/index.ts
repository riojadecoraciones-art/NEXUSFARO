// Edge Function: alta, edición y borrado de empleados (public.users).
//
// Hasta ahora estas escrituras las hacía el cliente directo contra la tabla,
// protegidas sólo por RLS acotado a store_id — es decir, cualquier terminal
// autenticada (cualquier cajero) podía asignarse a sí mismo el rol DUEÑO, los
// permisos de descuento/reembolso/inventario, o el PIN de cualquier otro
// usuario de su comercio, sin que la base lo impidiera. La policy nunca
// preguntaba "¿quién sos y qué se supone que podés cambiar?", sólo "¿es tu
// comercio?".
//
// Ahora la tabla ya no acepta INSERT/UPDATE/DELETE directo de `authenticated`
// (ver migración revocar_escritura_directa_en_users). Toda escritura pasa por
// acá, que corre con `service_role` recién después de confirmar del lado del
// servidor que quien pide el cambio tiene autorización real:
//   - el PIN de un usuario DUEÑO o SUPERADMIN del mismo comercio, o
//   - la contraseña maestra del sistema (para "olvidé mi PIN"), o
//   - ninguna de las dos, sólo si el comercio todavía no tiene ni un sólo
//     usuario — el alta del primer Dueño de un comercio recién creado, que
//     por definición no puede confirmar nada con un PIN que todavía no existe.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// ==========================================
// Hashing de PIN / contraseña maestra — mismo algoritmo y mismo formato que
// src/utils/crypto.ts (Web Crypto está disponible en Deno con la misma API).
// ==========================================

const PBKDF2_PREFIX = 'pbkdf2$sha256$';
const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_SALT_BYTES = 16;
const PBKDF2_KEY_BITS = 256;

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
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    PBKDF2_KEY_BITS
  );
  return new Uint8Array(bits);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function isHashed(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PBKDF2_PREFIX);
}

async function hashSecret(plain: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_BYTES));
  const hash = await derive(plain, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_PREFIX}${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

async function verifySecret(plain: string, stored: string | null | undefined): Promise<boolean> {
  if (!plain || !stored || !isHashed(stored)) return false;
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

// ==========================================

const VALID_ROLES = ['SUPERADMIN', 'DUEÑO', 'CAJERO'];

interface UserRow {
  id: string;
  name: string;
  email: string | null;
  role: string;
  role_title: string;
  pin: string;
  avatar_url: string | null;
  initials: string | null;
  can_discount: boolean | null;
  can_refund: boolean | null;
  can_manage_inventory: boolean | null;
  store_id: string;
}

function mapUserRow(row: UserRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email || undefined,
    role: row.role,
    roleTitle: row.role_title,
    pin: row.pin,
    avatarUrl: row.avatar_url || '',
    initials: row.initials || '',
    canDiscount: Boolean(row.can_discount),
    canRefund: Boolean(row.can_refund),
    canManageInventory: Boolean(row.can_manage_inventory),
  };
}

interface CreateUserPayload {
  name: string;
  email?: string;
  role: string;
  roleTitle: string;
  pin: string;
  avatarUrl?: string;
  canDiscount?: boolean;
  canRefund?: boolean;
  canManageInventory?: boolean;
}

interface UpdateUserPayload {
  name?: string;
  email?: string | null;
  role?: string;
  roleTitle?: string;
  canDiscount?: boolean;
  canRefund?: boolean;
  canManageInventory?: boolean;
  avatarUrl?: string;
  newPin?: string;
}

interface RequestBody {
  action: 'create' | 'update' | 'delete';
  ownerPin?: string;
  masterPassword?: string;
  user?: CreateUserPayload;
  targetId?: string;
  updates?: UpdateUserPayload;
}

/**
 * Confirma que quien pide el cambio está autorizado: el PIN de un
 * DUEÑO/SUPERADMIN del mismo comercio, o la contraseña maestra del sistema.
 * `serviceClient` ya corre con service_role — no pasa por RLS.
 */
async function verifyAuthorization(
  // Se tipa `any`: el cliente de supabase-js con genéricos por defecto no
  // infiere bien el tipo de fila al pasarlo como parámetro de una función
  // aparte (mismo problema pragmático que ya acepta el resto de las Edge
  // Functions de este proyecto, ver saleItems: any[] en get-store-snapshot).
  serviceClient: any,
  storeId: string,
  body: RequestBody
): Promise<{ ok: true; authorizingUserId?: string } | { ok: false; error: string }> {
  const ownerPin = body.ownerPin?.trim();
  if (ownerPin) {
    if (!/^\d{4}$/.test(ownerPin)) {
      return { ok: false, error: 'El PIN de confirmación debe tener 4 dígitos.' };
    }
    const { data: owners, error } = await serviceClient
      .from('users')
      .select('id, pin')
      .eq('store_id', storeId)
      .in('role', ['DUEÑO', 'SUPERADMIN']);

    if (error) {
      console.error('Error buscando Dueños del comercio:', error);
      return { ok: false, error: 'No se pudo verificar la autorización.' };
    }

    for (const owner of owners || []) {
      if (await verifySecret(ownerPin, owner.pin)) {
        return { ok: true, authorizingUserId: owner.id };
      }
    }
    return { ok: false, error: 'PIN de Dueño incorrecto.' };
  }

  const masterPassword = body.masterPassword?.trim();
  if (masterPassword) {
    const masterHash = Deno.env.get('MASTER_PASSWORD_HASH');
    if (!masterHash) {
      return {
        ok: false,
        error: 'La recuperación con contraseña maestra no está configurada en el servidor.',
      };
    }
    if (await verifySecret(masterPassword, masterHash)) {
      return { ok: true };
    }
    return { ok: false, error: 'Contraseña maestra incorrecta.' };
  }

  return { ok: false, error: 'Falta confirmar con el PIN de un Dueño o la contraseña maestra.' };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Método no permitido' }, 405);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Solicitud inválida' }, 400);
  }

  if (!['create', 'update', 'delete'].includes(body.action)) {
    return json({ error: 'Acción inválida' }, 400);
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });

  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData?.user) {
    return json({ error: 'Sesión inválida' }, 401);
  }

  const storeId = (callerData.user.app_metadata as Record<string, unknown> | undefined)?.store_id as
    | string
    | undefined;
  if (!storeId) {
    return json({ error: 'Esta terminal no tiene un comercio asignado' }, 403);
  }

  const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  if (body.action === 'create') {
    const user = body.user;
    if (!user || !user.name?.trim()) {
      return json({ error: 'Falta el nombre del empleado' }, 400);
    }
    if (!/^\d{4}$/.test(user.pin || '')) {
      return json({ error: 'El PIN debe tener 4 dígitos numéricos' }, 400);
    }
    if (!VALID_ROLES.includes(user.role)) {
      return json({ error: 'Rol inválido' }, 400);
    }

    const { count, error: countError } = await serviceClient
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId);

    if (countError) {
      console.error('Error contando usuarios del comercio:', countError);
      return json({ error: 'No se pudo verificar el estado del comercio' }, 500);
    }

    if ((count ?? 0) > 0) {
      const auth = await verifyAuthorization(serviceClient, storeId, body);
      if (!auth.ok) return json({ error: auth.error }, 403);
    }

    const initials =
      user.name
        .split(' ')
        .map((n) => n[0])
        .filter(Boolean)
        .join('')
        .toUpperCase()
        .substring(0, 2) || 'US';

    const hashedPin = await hashSecret(user.pin);

    const { data: created, error: insertError } = await serviceClient
      .from('users')
      .insert({
        store_id: storeId,
        name: user.name.trim(),
        email: user.email?.trim() || null,
        role: user.role,
        role_title: user.roleTitle,
        pin: hashedPin,
        avatar_url: user.avatarUrl || '',
        initials,
        can_discount: user.canDiscount ?? false,
        can_refund: user.canRefund ?? false,
        can_manage_inventory: user.canManageInventory ?? false,
      })
      .select()
      .single();

    if (insertError || !created) {
      console.error('Error creando empleado:', insertError);
      return json({ error: 'No se pudo crear el empleado' }, 500);
    }

    return json({ success: true, user: mapUserRow(created as UserRow) });
  }

  // update / delete: el usuario objetivo tiene que existir y ser del mismo comercio.
  const targetId = body.targetId?.trim();
  if (!targetId) {
    return json({ error: 'Falta el usuario objetivo' }, 400);
  }

  const { data: targetRow, error: targetError } = await serviceClient
    .from('users')
    .select('*')
    .eq('id', targetId)
    .eq('store_id', storeId)
    .maybeSingle();

  if (targetError || !targetRow) {
    return json({ error: 'Usuario no encontrado en este comercio' }, 404);
  }

  const auth = await verifyAuthorization(serviceClient, storeId, body);
  if (!auth.ok) return json({ error: auth.error }, 403);

  if (body.action === 'delete') {
    if (auth.authorizingUserId && auth.authorizingUserId === targetId) {
      return json(
        { error: 'No podés eliminar la cuenta que estás usando para confirmar este cambio.' },
        400
      );
    }

    const { error: deleteError } = await serviceClient.from('users').delete().eq('id', targetId);
    if (deleteError) {
      console.error('Error eliminando empleado:', deleteError);
      return json({ error: 'No se pudo eliminar el empleado' }, 500);
    }
    return json({ success: true });
  }

  // action === 'update'
  const updates = body.updates || {};
  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.email !== undefined) dbUpdates.email = updates.email || null;
  if (updates.role !== undefined) {
    if (!VALID_ROLES.includes(updates.role)) {
      return json({ error: 'Rol inválido' }, 400);
    }
    dbUpdates.role = updates.role;
  }
  if (updates.roleTitle !== undefined) dbUpdates.role_title = updates.roleTitle;
  if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
  if (updates.canDiscount !== undefined) dbUpdates.can_discount = updates.canDiscount;
  if (updates.canRefund !== undefined) dbUpdates.can_refund = updates.canRefund;
  if (updates.canManageInventory !== undefined) dbUpdates.can_manage_inventory = updates.canManageInventory;

  if (updates.newPin !== undefined) {
    if (!/^\d{4}$/.test(updates.newPin)) {
      return json({ error: 'El PIN debe tener 4 dígitos numéricos' }, 400);
    }
    dbUpdates.pin = await hashSecret(updates.newPin);
  }

  if (updates.name !== undefined) {
    dbUpdates.initials =
      updates.name
        .split(' ')
        .map((n) => n[0])
        .filter(Boolean)
        .join('')
        .toUpperCase()
        .substring(0, 2) || 'US';
  }

  const { data: updated, error: updateError } = await serviceClient
    .from('users')
    .update(dbUpdates)
    .eq('id', targetId)
    .select()
    .single();

  if (updateError || !updated) {
    console.error('Error actualizando empleado:', updateError);
    return json({ error: 'No se pudo actualizar el empleado' }, 500);
  }

  // Se devuelve la fila actualizada (incluido el nuevo hash de PIN si se
  // cambió): el cliente ya no calcula el hash, así que necesita este valor
  // para que verifyUserPin() funcione de inmediato después de un cambio de
  // PIN, sin esperar a un refresh de página.
  return json({ success: true, user: mapUserRow(updated as UserRow) });
});
