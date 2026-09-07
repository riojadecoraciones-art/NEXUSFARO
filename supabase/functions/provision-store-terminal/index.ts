// Edge Function: automatiza el alta de la cuenta de terminal de un comercio
// nuevo (pasos 2-3 del runbook manual en supabase/README.md — antes había
// que crearla a mano en el Dashboard de Supabase y taggearla con SQL suelto).
//
// Por qué es una Edge Function y no algo del navegador: crear un usuario de
// Supabase Auth y ponerle app_metadata.store_id requiere la Admin API, que
// sólo funciona con la service_role key — esa clave bypassa RLS por
// completo. Si viviera en el navegador, cualquiera que abra la consola (F12)
// de CUALQUIER terminal (no sólo la del operador de la plataforma) podría
// leerla y crear cuentas, o taggearse a sí mismo como superadmin.
//
// Autenticación: se despliega con verify_jwt=true (el runtime de Supabase
// rechaza cualquier llamada sin sesión antes de que este código corra), pero
// eso sólo prueba "hay una sesión válida" — no alcanza acá. El primer paso
// real de esta función es confirmar que ESA sesión puntual es la del
// operador de la plataforma (app_metadata.role === 'superadmin'): sin ese
// chequeo, cualquier terminal de cualquier comercio cliente podría dar de
// alta cuentas de otros comercios.
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

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Sin ambigüedades visuales (0/O, 1/l/I) porque este password se puede tener
// que leer o transcribir a mano al pasárselo al cliente nuevo por teléfono.
const PASSWORD_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/** Se genera acá, nunca la elige el operador: se muestra una única vez en la respuesta. */
function generatePassword(length = 20): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += PASSWORD_CHARS[b % PASSWORD_CHARS.length];
  return out;
}

interface RequestBody {
  storeId: string;
  terminalEmail: string;
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

  // Atado al JWT de quien llama (no a service_role): auth.getUser() valida y
  // decodifica esa sesión puntual, la de la terminal que hizo la llamada.
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });

  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData?.user) {
    return json({ error: 'Sesión inválida' }, 401);
  }

  const callerRole = (callerData.user.app_metadata as Record<string, unknown> | undefined)?.role;
  if (callerRole !== 'superadmin') {
    console.warn('Intento de aprovisionar terminal sin rol superadmin:', callerData.user.email);
    return json({ error: 'Sólo el operador de la plataforma puede dar de alta terminales.' }, 403);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Solicitud inválida' }, 400);
  }

  const storeId = (body?.storeId || '').trim();
  const terminalEmail = (body?.terminalEmail || '').trim().toLowerCase();

  if (!storeId) {
    return json({ error: 'Falta el comercio' }, 400);
  }
  if (!isValidEmail(terminalEmail)) {
    return json({ error: 'El email de la terminal no es válido' }, 400);
  }

  // service_role recién a partir de acá, ya confirmado quién llama.
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: store, error: storeError } = await adminClient
    .from('stores')
    .select('id, name')
    .eq('id', storeId)
    .maybeSingle();

  if (storeError || !store) {
    return json({ error: 'No se encontró el comercio indicado' }, 404);
  }

  const password = generatePassword();

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: terminalEmail,
    password,
    email_confirm: true,
    app_metadata: { store_id: storeId },
  });

  if (createError || !created?.user) {
    console.error('Error creando usuario de terminal:', createError);
    const message = /already.*registered|already exists/i.test(createError?.message || '')
      ? 'Ya existe una cuenta con ese email. Usá otro correo para esta terminal.'
      : createError?.message || 'No se pudo crear la cuenta de la terminal';
    return json({ error: message }, 400);
  }

  const { error: updateStoreError } = await adminClient
    .from('stores')
    .update({ terminal_email: terminalEmail })
    .eq('id', storeId);

  if (updateStoreError) {
    // La cuenta de Auth ya se creó bien; esto es sólo el dato informativo
    // que lee el Portal Maestro para mostrar "terminal activada".
    console.error('No se pudo guardar terminal_email en stores:', updateStoreError);
  }

  return json({
    success: true,
    email: terminalEmail,
    password,
    storeName: store.name as string,
  });
});
