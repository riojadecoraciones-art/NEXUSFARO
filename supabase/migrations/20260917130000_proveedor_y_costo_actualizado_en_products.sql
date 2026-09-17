-- ============================================================================
-- Proveedor asignado y fecha de última actualización de costo, en products
-- ============================================================================
--
-- supplier_id: a qué proveedor del directorio (suppliers) se le compra
-- normalmente este producto. Nullable y SIN foreign key a propósito, mismo
-- criterio "referencia blanda" que el resto de la base (ver stock_movements.
-- product_id, sale_items.product_id, app_alerts.product_id): si se borra o
-- reemplaza el proveedor, los productos ya vinculados no tienen que romperse.
--
-- cost_updated_at: cuándo se escribió por última vez cost_price de verdad
-- (no cuándo se creó el producto). Todo cambio de costo lo pone en hora
-- explícitamente desde el cliente (ver productService.update en
-- supabaseService.ts) — no hay triggers en esta base, igual que el resto de
-- los timestamps de auditoría. Sirve para el aviso proactivo de "puede que
-- el proveedor ya te haya subido esto sin que te enteres". not null default
-- now(): para las filas ya existentes no sabemos cuándo se verificó el costo
-- por última vez antes de esta migración, así que "hoy" es el punto de
-- partida más honesto (evita marcar como desactualizado, el día 1, a todo
-- el catálogo previo).
alter table public.products
  add column if not exists supplier_id text,
  add column if not exists cost_updated_at timestamptz not null default now();

-- Sin RLS nueva: aislado_por_comercio ya cubre toda la fila de products sin
-- restricción de columna.
