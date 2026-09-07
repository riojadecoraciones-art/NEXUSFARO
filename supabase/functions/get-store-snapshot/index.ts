// Edge Function: trae los datos operativos reales de OTRO comercio para el
// modo "Asistir a este Negocio" del Portal Maestro (SUPERADMIN).
//
// Por qué esto no es un simple .select() con filtro desde el navegador: la
// sesión del operador sigue siendo la de su propia terminal, acotada por RLS
// (aislado_por_comercio) a su propio store_id — así está bien, es la misma
// garantía que aísla a cada comercio cliente del resto. Para que el operador
// pueda ver el negocio de un cliente sin romper esa garantía para todos,
// hace falta un camino aparte: esta función usa la service_role key (que
// bypassa RLS) recién DESPUÉS de confirmar, con el JWT real de quien llama,
// que es la terminal marcada como operadora de la plataforma. Ninguna policy
// de las 12 tablas operativas se toca ni se relaja — si se relajara ahí, esa
// sesión tendría acceso de lectura a TODOS los comercios en TODO momento, no
// sólo mientras el operador elige auditar a uno puntual.
//
// Es lectura pura: no inserta nada. storeSettingsService.get() y
// categoryService.getAll() (supabaseService.ts), del lado del cliente, crean
// una fila/semillas por defecto si no encuentran nada — pensado para cuando
// la sesión que llama es la dueña de esos datos. Reusar esa lógica acá,
// con service_role, insertaría datos de verdad en la tabla del CLIENTE como
// efecto secundario de un simple click de "ver". Por eso acá se lee tal cual
// viene, sin ese comportamiento.
//
// No incluye la tabla de empleados/PIN del comercio: no fue lo pedido ("ver
// ventas, productos") y es el dato más sensible de todos.
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
    console.warn('Intento de leer datos de otro comercio sin rol superadmin:', callerData.user.email);
    return json({ error: 'Sólo el operador de la plataforma puede auditar otro comercio.' }, 403);
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
    .select('id')
    .eq('id', storeId)
    .maybeSingle();

  if (storeError || !store) {
    return json({ error: 'No se encontró el comercio indicado' }, 404);
  }

  const [
    storeSettingsResult,
    categoriesResult,
    productsResult,
    salesResult,
    stockMovementsResult,
    parkedTicketsResult,
    cashShiftsResult,
    activeCashShiftResult,
    cashMovementsResult,
    fixedExpensesResult,
    appAlertsResult,
  ] = await Promise.all([
    adminClient.from('store_settings').select('*').eq('store_id', storeId).maybeSingle(),
    adminClient.from('categories').select('name').eq('store_id', storeId).order('name', { ascending: true }),
    adminClient.from('products').select('*').eq('store_id', storeId).order('name', { ascending: true }),
    adminClient.from('sales').select('*').eq('store_id', storeId).order('timestamp', { ascending: false }),
    adminClient
      .from('stock_movements')
      .select('*')
      .eq('store_id', storeId)
      .order('timestamp', { ascending: false })
      .limit(500),
    adminClient
      .from('parked_tickets')
      .select('*')
      .eq('store_id', storeId)
      .order('timestamp', { ascending: false }),
    adminClient
      .from('cash_shifts')
      .select('*')
      .eq('store_id', storeId)
      .order('opened_at', { ascending: false }),
    adminClient
      .from('cash_shifts')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'ABIERTA')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    adminClient
      .from('cash_movements')
      .select('*')
      .eq('store_id', storeId)
      .order('timestamp', { ascending: false }),
    adminClient
      .from('fixed_expenses')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false }),
    adminClient
      .from('app_alerts')
      .select('*')
      .eq('store_id', storeId)
      .order('timestamp', { ascending: false })
      .limit(100),
  ]);

  // Sale items sólo si hay ventas — mismo short-circuit que ya usa
  // saleService.getAll() del lado del cliente.
  const sales = salesResult.data || [];
  let saleItems: any[] = [];
  if (sales.length > 0) {
    const saleIds = sales.map((s: any) => s.id);
    const { data: itemsData, error: itemsError } = await adminClient
      .from('sale_items')
      .select('*')
      .in('sale_id', saleIds);
    if (itemsError) {
      console.error('Error trayendo sale_items del snapshot:', itemsError);
    }
    saleItems = itemsData || [];
  }

  // Auditoría: un renglón por cada vez que se lee el snapshot de un
  // comercio. No bloquea la respuesta si falla (el dato ya está armado).
  try {
    await adminClient.from('superadmin_audit_log').insert({
      actor_email: callerData.user.email || 'desconocido',
      store_id: storeId,
      action: 'view_snapshot',
    });
  } catch (auditError) {
    console.error('No se pudo registrar la auditoría de acceso:', auditError);
  }

  return json({
    success: true,
    storeSettings: storeSettingsResult.data || null,
    categories: categoriesResult.data || [],
    products: productsResult.data || [],
    sales,
    saleItems,
    stockMovements: stockMovementsResult.data || [],
    parkedTickets: parkedTicketsResult.data || [],
    cashShifts: cashShiftsResult.data || [],
    activeCashShift: activeCashShiftResult.data || null,
    cashMovements: cashMovementsResult.data || [],
    fixedExpenses: fixedExpensesResult.data || [],
    appAlerts: appAlertsResult.data || [],
  });
});
