// Edge Function: envía el comprobante de venta por email usando Resend.
//
// Por qué no se llama a Resend directo desde el navegador: la API key de
// Resend puede enviar emails "como" el negocio a cualquier destinatario. Si
// viviera en el bundle del cliente, cualquiera que abra la consola del
// navegador (F12) podría leerla y mandar correo en nombre del negocio desde
// afuera. Por eso el envío pasa por acá: la clave sólo vive en el servidor.
//
// Autenticación: se despliega con verify_jwt=true, así que el runtime de
// Supabase ya rechaza cualquier llamada sin una sesión válida antes de que
// este código se ejecute — no hace falta verificar el JWT a mano acá. Eso
// alcanza porque el envío de un comprobante es una acción de nivel terminal
// (cualquier caja con sesión puede hacerlo), no algo que dependa de qué
// cajero esté en el POS.
//
// Formato del comprobante: se manda el mismo dato que ya se ve en pantalla
// (Sale + StoreInfo), armado del lado del cliente que ya los tiene cargados
// y validados — no hay que volver a consultarlos acá.

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

interface SaleItemPayload {
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface SalePayload {
  ticketNumber: string;
  timestamp: string;
  cashierName: string;
  items: SaleItemPayload[];
  subtotal: number;
  discountTotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  amountReceived?: number;
  changeGiven?: number;
}

interface StoreInfoPayload {
  storeName: string;
  branchName?: string;
  address?: string;
  cuit?: string;
  receiptFooter?: string;
}

interface RequestBody {
  to: string;
  sale: SalePayload;
  storeInfo: StoreInfoPayload;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA_QR: 'Transferencia/QR',
  MIXTO: 'Mixto',
};

const MONEY = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);

function buildReceiptHtml(sale: SalePayload, store: StoreInfoPayload): string {
  const itemsRows = sale.items
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;">${escapeHtml(item.productName)}</td>
          <td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity}</td>
          <td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;text-align:right;">${MONEY(item.unitPrice)}</td>
          <td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold;">${MONEY(item.total)}</td>
        </tr>`
    )
    .join('');

  const fecha = new Date(sale.timestamp).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#1e293b;">
    <div style="background:#065f46;color:#ffffff;padding:20px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="margin:0;font-size:18px;">${escapeHtml(store.storeName)}${
        store.branchName ? ' • ' + escapeHtml(store.branchName) : ''
      }</h1>
      ${store.address ? `<p style="margin:4px 0 0;font-size:12px;opacity:0.85;">${escapeHtml(store.address)}</p>` : ''}
      ${store.cuit ? `<p style="margin:2px 0 0;font-size:11px;opacity:0.7;">CUIT: ${escapeHtml(store.cuit)}</p>` : ''}
    </div>

    <div style="border:1px solid #e2e8f0;border-top:none;padding:20px;border-radius:0 0 12px 12px;">
      <p style="font-size:12px;color:#64748b;margin:0 0 4px;">
        Ticket <strong style="color:#0f172a;">${escapeHtml(sale.ticketNumber)}</strong> — ${fecha}
      </p>
      <p style="font-size:12px;color:#64748b;margin:0 0 16px;">Cajero: ${escapeHtml(sale.cashierName)}</p>

      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="font-size:11px;color:#64748b;text-transform:uppercase;">
            <th style="text-align:left;padding:4px;border-bottom:2px solid #e2e8f0;">Producto</th>
            <th style="text-align:center;padding:4px;border-bottom:2px solid #e2e8f0;">Cant.</th>
            <th style="text-align:right;padding:4px;border-bottom:2px solid #e2e8f0;">P.U.</th>
            <th style="text-align:right;padding:4px;border-bottom:2px solid #e2e8f0;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>

      <table style="width:100%;font-size:13px;margin-top:12px;">
        <tr><td style="color:#64748b;padding:2px 0;">Subtotal</td><td style="text-align:right;padding:2px 0;">${MONEY(sale.subtotal)}</td></tr>
        ${
          sale.discountTotal > 0
            ? `<tr><td style="color:#059669;padding:2px 0;">Descuento</td><td style="text-align:right;padding:2px 0;color:#059669;">-${MONEY(sale.discountTotal)}</td></tr>`
            : ''
        }
        <tr><td style="color:#64748b;padding:2px 0;">IVA</td><td style="text-align:right;padding:2px 0;">${MONEY(sale.tax)}</td></tr>
        <tr>
          <td style="font-weight:800;font-size:16px;padding-top:8px;border-top:1px solid #e2e8f0;">TOTAL</td>
          <td style="font-weight:800;font-size:16px;text-align:right;padding-top:8px;border-top:1px solid #e2e8f0;">${MONEY(sale.total)}</td>
        </tr>
      </table>

      <p style="font-size:12px;color:#64748b;margin-top:12px;">
        Método de pago: <strong>${escapeHtml(PAYMENT_METHOD_LABELS[sale.paymentMethod] || sale.paymentMethod)}</strong>
      </p>

      ${
        store.receiptFooter
          ? `<p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:20px;">${escapeHtml(store.receiptFooter)}</p>`
          : ''
      }
    </div>
  </div>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Método no permitido' }, 405);
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    console.error('Falta configurar el secreto RESEND_API_KEY en Supabase.');
    return json(
      { error: 'El envío de emails no está configurado en el servidor todavía.' },
      500
    );
  }

  // Sin dominio propio verificado en Resend, esta dirección de prueba sólo
  // entrega al correo con el que se creó la cuenta de Resend — no a clientes
  // reales. Ver supabase/README.md para verificar un dominio propio.
  const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Comprobantes <onboarding@resend.dev>';

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Solicitud inválida' }, 400);
  }

  const to = (body?.to || '').trim();
  if (!isValidEmail(to)) {
    return json({ error: 'El email de destino no es válido' }, 400);
  }
  if (!body?.sale?.ticketNumber || !Array.isArray(body.sale.items)) {
    return json({ error: 'Faltan datos de la venta' }, 400);
  }
  if (!body?.storeInfo?.storeName) {
    return json({ error: 'Faltan datos del comercio' }, 400);
  }

  const html = buildReceiptHtml(body.sale, body.storeInfo);

  // fetch() puede rechazar por un problema de red (DNS, timeout, Resend caído),
  // no sólo devolver un status no-2xx. Sin este try/catch, esa falla no
  // manejada tira un 500 crudo del runtime de Deno: sin headers CORS y sin
  // cuerpo JSON, así que el navegador lo ve como un error de red genérico en
  // vez de un mensaje que se le pueda mostrar al cajero.
  let resendResponse: Response;
  try {
    resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: `Comprobante de compra — ${body.sale.ticketNumber}`,
        html,
      }),
    });
  } catch (networkError) {
    console.error('No se pudo contactar a Resend:', networkError);
    return json({ error: 'No se pudo conectar con el servicio de email. Probá de nuevo en unos segundos.' }, 502);
  }

  const resendData = await resendResponse.json().catch(() => ({}));

  if (!resendResponse.ok) {
    console.error('Resend devolvió un error:', resendResponse.status, resendData);
    return json(
      { error: resendData?.message || 'No se pudo enviar el email' },
      502
    );
  }

  return json({ success: true, id: resendData?.id });
});
