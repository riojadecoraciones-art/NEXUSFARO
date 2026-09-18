// Edge Function: acciones sensibles de POS con autorización verificada del
// lado del servidor (anular venta, ajustar stock manual, vender con
// descuento).
//
// Encontrado en un paneo de seguridad: `sales`, `sale_items`, `products` y
// `stock_movements` sólo tienen la policy genérica "aislado_por_comercio"
// (acota por store_id, nada más). Como una terminal de comercio es una
// única sesión de Supabase Auth compartida por todos sus empleados (el PIN
// de cada uno se verifica en el cliente, no crea una sesión propia), la
// base no tiene forma de distinguir "un Cajero sin permiso de reembolso"
// de "el Dueño" — ambos comparten el mismo JWT. Cualquiera con acceso al
// navegador de la terminal podía, desde la consola, anular una venta,
// aplicar un descuento o ajustar stock sin el permiso correspondiente:
// el vector clásico para tapar un faltante de caja o un robo de mercadería.
//
// Mismo mecanismo que ya protege a manage-employee: esta función corre con
// `service_role` recién después de confirmar, con un PIN, que quien pide
// el cambio es DUEÑO/SUPERADMIN o tiene el permiso puntual que hace falta.
// El campo de auditoría (refunded_by / discount_applied_by / user_name) se
// completa acá con el nombre real de quien autorizó — nunca con lo que
// mande el cliente.
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
// Hashing de PIN — mismo algoritmo y mismo formato que src/utils/crypto.ts
// y manage-employee/index.ts (Web Crypto disponible en Deno con la misma API).
// ==========================================

const PBKDF2_PREFIX = 'pbkdf2$sha256$';

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
    256
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

type PermissionFlag = 'can_refund' | 'can_discount' | 'can_manage_inventory';

interface AuthorizedUser {
  id: string;
  name: string;
}

/**
 * Confirma, contra un PIN, que quien pide la acción es DUEÑO/SUPERADMIN del
 * comercio o tiene puntualmente el permiso pedido. `serviceClient` ya corre
 * con service_role — no pasa por RLS, así que el store_id de este `eq` es
 * la única barrera de aislamiento acá, y viene del JWT del caller, no del
 * body.
 */
async function verifyPermission(
  serviceClient: any,
  storeId: string,
  authPin: string,
  flag: PermissionFlag
): Promise<{ ok: true; user: AuthorizedUser } | { ok: false; error: string }> {
  if (!/^\d{4}$/.test(authPin || '')) {
    return { ok: false, error: 'El PIN de autorización debe tener 4 dígitos.' };
  }

  const { data: users, error } = await serviceClient
    .from('users')
    .select('id, name, pin, role, ' + flag)
    .eq('store_id', storeId);

  if (error) {
    console.error('Error buscando usuarios del comercio:', error);
    return { ok: false, error: 'No se pudo verificar la autorización.' };
  }

  for (const u of users || []) {
    if (await verifySecret(authPin, u.pin)) {
      const authorized = u.role === 'DUEÑO' || u.role === 'SUPERADMIN' || Boolean(u[flag]);
      if (!authorized) {
        return { ok: false, error: 'Ese PIN no tiene autorización para esta acción.' };
      }
      return { ok: true, user: { id: u.id, name: u.name } };
    }
  }

  return { ok: false, error: 'PIN incorrecto.' };
}

interface RequestBody {
  action: 'refund_sale' | 'adjust_stock' | 'create_discounted_sale';
  authPin: string;
  saleId?: string;
  refundReason?: string;
  productId?: string;
  newStock?: number;
  adjustReason?: string;
  adjustType?: 'AJUSTE_MERMA' | 'AJUSTE_CONTEO';
  sale?: Record<string, unknown>;
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

  if (!['refund_sale', 'adjust_stock', 'create_discounted_sale'].includes(body.action)) {
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
  const timestamp = new Date().toISOString();

  // ==========================================
  // ANULAR VENTA / DEVOLUCIÓN
  // ==========================================
  if (body.action === 'refund_sale') {
    const auth = await verifyPermission(serviceClient, storeId, body.authPin, 'can_refund');
    if (!auth.ok) return json({ error: auth.error }, 403);

    const saleId = body.saleId?.trim();
    if (!saleId) return json({ error: 'Falta la venta a anular' }, 400);

    const { data: sale, error: saleError } = await serviceClient
      .from('sales')
      .select('*')
      .eq('id', saleId)
      .eq('store_id', storeId)
      .maybeSingle();

    if (saleError || !sale) return json({ error: 'Venta no encontrada en este comercio' }, 404);
    if (sale.status === 'ANULADA_DEVUELTA') {
      return json({ error: 'Esta venta ya fue anulada previamente' }, 400);
    }

    const { data: items, error: itemsError } = await serviceClient
      .from('sale_items')
      .select('product_id, product_name, quantity')
      .eq('sale_id', saleId);

    if (itemsError) {
      console.error('Error leyendo ítems de la venta:', itemsError);
      return json({ error: 'No se pudieron leer los ítems de la venta' }, 500);
    }

    const { error: updateSaleError } = await serviceClient
      .from('sales')
      .update({ status: 'ANULADA_DEVUELTA', refunded_by: auth.user.name, refunded_at: timestamp })
      .eq('id', saleId);

    if (updateSaleError) {
      console.error('Error anulando la venta:', updateSaleError);
      return json({ error: 'No se pudo anular la venta' }, 500);
    }

    // Reintegrar stock ítem por ítem (cantidades leídas de la base, no del
    // cliente) y dejar el movimiento de auditoría correspondiente.
    const movements: Record<string, unknown>[] = [];
    for (const item of items || []) {
      if (!item.product_id) continue;
      const { data: product } = await serviceClient
        .from('products')
        .select('id, stock')
        .eq('id', item.product_id)
        .eq('store_id', storeId)
        .maybeSingle();
      if (!product) continue;

      const previousStock = Number(product.stock);
      const newStock = previousStock + Number(item.quantity);

      await serviceClient
        .from('products')
        .update({ stock: newStock, updated_at: timestamp })
        .eq('id', product.id);

      const movement = {
        id: `stk-ref-${Date.now()}-${item.product_id}`,
        store_id: storeId,
        product_id: item.product_id,
        product_name: item.product_name,
        timestamp,
        type: 'DEVOLUCION',
        quantity_delta: Number(item.quantity),
        previous_stock: previousStock,
        new_stock: newStock,
        reason: `Devolución ${sale.ticket_number}: ${body.refundReason?.trim() || 'Solicitud cliente'}`,
        user_name: auth.user.name,
      };
      await serviceClient.from('stock_movements').insert(movement);
      movements.push(movement);
    }

    // Mismo criterio que el cliente hoy: ajusta el turno de caja ABIERTO en
    // este momento, no necesariamente el que estaba abierto cuando se hizo
    // la venta original.
    const { data: activeShift } = await serviceClient
      .from('cash_shifts')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'ABIERTA')
      .maybeSingle();

    let updatedShift: Record<string, unknown> | null = null;
    if (activeShift) {
      let cashRefund = 0;
      let cardRefund = 0;
      let transferRefund = 0;
      for (const p of sale.payment_breakdown || []) {
        if (p.method === 'EFECTIVO') cashRefund += p.amount;
        else if (p.method === 'TARJETA') cardRefund += p.amount;
        else if (p.method === 'TRANSFERENCIA_QR') transferRefund += p.amount;
      }
      const newCashSales = Math.max(0, Number(activeShift.cash_sales) - cashRefund);
      const newCardSales = Math.max(0, Number(activeShift.card_sales) - cardRefund);
      const newTransferSales = Math.max(0, Number(activeShift.transfer_sales) - transferRefund);
      const newExpected =
        Number(activeShift.initial_cash) + newCashSales + Number(activeShift.total_in) - Number(activeShift.total_out);

      const shiftUpdate = {
        cash_sales: newCashSales,
        card_sales: newCardSales,
        transfer_sales: newTransferSales,
        expected_cash: newExpected,
      };
      await serviceClient.from('cash_shifts').update(shiftUpdate).eq('id', activeShift.id);
      updatedShift = { id: activeShift.id, ...shiftUpdate };
    }

    return json({ success: true, refundedBy: auth.user.name, refundedAt: timestamp, movements, shift: updatedShift });
  }

  // ==========================================
  // AJUSTE MANUAL DE STOCK
  // ==========================================
  if (body.action === 'adjust_stock') {
    const auth = await verifyPermission(serviceClient, storeId, body.authPin, 'can_manage_inventory');
    if (!auth.ok) return json({ error: auth.error }, 403);

    const productId = body.productId?.trim();
    if (!productId || typeof body.newStock !== 'number' || !body.adjustReason?.trim()) {
      return json({ error: 'Faltan datos del ajuste' }, 400);
    }

    const { data: product, error: productError } = await serviceClient
      .from('products')
      .select('id, name, stock')
      .eq('id', productId)
      .eq('store_id', storeId)
      .maybeSingle();

    if (productError || !product) return json({ error: 'Producto no encontrado en este comercio' }, 404);

    const previousStock = Number(product.stock);
    const newStock = Math.max(0, body.newStock);
    const type = body.adjustType === 'AJUSTE_MERMA' ? 'AJUSTE_MERMA' : 'AJUSTE_CONTEO';

    const { error: updateError } = await serviceClient
      .from('products')
      .update({ stock: newStock, updated_at: timestamp })
      .eq('id', productId);

    if (updateError) {
      console.error('Error ajustando stock:', updateError);
      return json({ error: 'No se pudo ajustar el stock' }, 500);
    }

    const movement = {
      id: `stk-adj-${Date.now()}`,
      store_id: storeId,
      product_id: productId,
      product_name: product.name,
      timestamp,
      type,
      quantity_delta: newStock - previousStock,
      previous_stock: previousStock,
      new_stock: newStock,
      reason: body.adjustReason.trim(),
      user_name: auth.user.name,
    };
    await serviceClient.from('stock_movements').insert(movement);

    return json({ success: true, newStock, movement });
  }

  // ==========================================
  // VENTA CON DESCUENTO
  // ==========================================
  if (body.action === 'create_discounted_sale') {
    const auth = await verifyPermission(serviceClient, storeId, body.authPin, 'can_discount');
    if (!auth.ok) return json({ error: auth.error }, 403);

    const sale = body.sale as any;
    if (!sale?.id || !Array.isArray(sale.items)) {
      return json({ error: 'Falta la venta a registrar' }, 400);
    }

    const { data: insertedSale, error: saleError } = await serviceClient
      .from('sales')
      .insert({
        id: sale.id,
        store_id: storeId,
        ticket_number: sale.ticketNumber,
        timestamp: sale.timestamp,
        cashier_id: sale.cashierId,
        cashier_name: sale.cashierName,
        shift_id: sale.shiftId || null,
        subtotal: sale.subtotal,
        discount_total: sale.discountTotal,
        // Nombre real de quien autorizó el descuento, verificado por PIN acá
        // mismo — nunca lo que mande el cliente en discountAppliedBy.
        discount_applied_by:
          sale.discountTotal > 0
            ? `${auth.user.name}${
                typeof sale.orderDiscountPercent === 'number' && sale.orderDiscountPercent > 0
                  ? ` (${sale.orderDiscountPercent}%)`
                  : ''
              }`
            : null,
        tax: sale.tax,
        total: sale.total,
        payment_method: sale.paymentMethod,
        payment_breakdown: sale.paymentBreakdown || [],
        amount_received: sale.amountReceived || null,
        change_given: sale.changeGiven || null,
        status: sale.status || 'COMPLETADA',
        notes: sale.notes || null,
      })
      .select()
      .single();

    if (saleError || !insertedSale) {
      console.error('Error insertando venta con descuento:', saleError);
      return json({ error: 'No se pudo registrar la venta' }, 500);
    }

    if (sale.items.length > 0) {
      const itemsToInsert = sale.items.map((item: any, idx: number) => ({
        id: `${sale.id}-item-${idx}`,
        sale_id: sale.id,
        store_id: storeId,
        product_id: item.productId || null,
        product_name: item.productName,
        sku: item.sku || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        unit_cost: item.unitCost,
        discount: item.discount,
        total: item.total,
        unit_type: item.unitType || 'UNIDAD',
      }));

      const { error: itemsError } = await serviceClient.from('sale_items').insert(itemsToInsert);
      if (itemsError) {
        console.error('Error insertando ítems de venta con descuento:', itemsError);
        // La venta ya quedó creada — no se revierte (mismo criterio que
        // saleService.create del lado cliente, que tampoco hacía rollback).
        return json({ error: 'La venta se registró pero fallaron sus ítems' }, 500);
      }
    }

    return json({ success: true, sale: insertedSale, authorizedBy: auth.user.name });
  }

  return json({ error: 'Acción inválida' }, 400);
});
