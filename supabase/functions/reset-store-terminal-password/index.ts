// Edge Function: resetea la contraseña de la cuenta de terminal de un
// comercio. Hasta ahora, si un cliente perdía su contraseña, la única forma
// de recuperarla era que el operador de la plataforma corriera SQL a mano
// contra la base — no había ningún botón para esto en el Portal Maestro.
//
// Mismo patrón de autenticación que provision-store-terminal: se despliega
// con verify_jwt=true, pero eso sólo prueba "hay una sesión válida" — el
// primer paso real acá es confirmar que esa sesión puntual es la del
// operador de la plataforma (app_metadata.role === 'superadmin'). Sin ese
// chequeo, cualquier terminal de cualquier comercio cliente podría
// resetearle la contraseña a la terminal de otro comercio.
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

// Sin ambigüedades visuales (0/O, 1/l/I) porque este password se puede tener
// que leer o transcribir a mano al pasárselo al cliente por teléfono.
const PASSWORD_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function generatePassword(length = 20): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += PASSWORD_CHARS[b % PASSWORD_CHARS.length];
  return out;
}

interface RequestBody {
  storeId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Método no permitido' }, 405);
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

  const callerRole = (callerData.user.app_metadata as Record<string, unknown> | undefined)?.role;
  if (callerRole !== 'superadmin') {
    console.warn('Intento de resetear contraseña de terminal sin rol superadmin:', callerData.user.email);
    return json({ error: 'Sólo el operador de la plataforma puede resetear contraseñas de terminal.' }, 403);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Solicitud inválida' }, 400);
  }

  const storeId = (body?.storeId || '').trim();
  if (!storeId) {
    return json({ error: 'Falta el comercio' }, 400);
  }

  // service_role recién a partir de acá, ya confirmado quién llama.
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: store, error: storeError } = await adminClient
    .from('stores')
    .select('id, name, terminal_email')
    .eq('id', storeId)
    .maybeSingle();

  if (storeError || !store) {
    return json({ error: 'No se encontró el comercio indicado' }, 404);
  }
  if (!store.terminal_email) {
    return json({ error: 'Este comercio todavía no tiene una terminal activada' }, 400);
  }

  // La Admin API no tiene "buscar por email" directo: se pagina la lista y
  // se busca ahí. Con la cantidad de terminales que maneja esta plataforma
  // (una por comercio) una sola página alcanza de sobra.
  const { data: listResult, error: listError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    console.error('Error listando usuarios de Auth:', listError);
    return json({ error: 'No se pudo buscar la cuenta de la terminal' }, 500);
  }

  const targetUser = listResult.users.find(
    (u) => (u.email || '').toLowerCase() === store.terminal_email!.toLowerCase()
  );

  if (!targetUser) {
    return json({ error: 'No se encontró la cuenta de la terminal de este comercio' }, 404);
  }

  const newPassword = generatePassword();

  const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUser.id, {
    password: newPassword,
  });

  if (updateError) {
    console.error('Error reseteando contraseña de terminal:', updateError);
    return json({ error: updateError.message || 'No se pudo resetear la contraseña' }, 400);
  }

  return json({
    success: true,
    email: store.terminal_email,
    password: newPassword,
    storeName: store.name as string,
  });
});
