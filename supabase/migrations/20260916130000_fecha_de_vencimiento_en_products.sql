-- ============================================================================
-- Fecha de vencimiento por producto (para comercios con tracks_expiration)
-- ============================================================================
--
-- Nullable, sin default: ausente significa "no aplica a este producto",
-- mismo criterio ya usado en stock_movements.unit_cost. Se completa desde
-- "Recibir Mercadería" sólo si el comercio tiene stores.tracks_expiration
-- activo — el campo existe en la tabla para todos, pero la UI sólo lo
-- muestra donde corresponde.
alter table public.products add column if not exists expiration_date date;

-- Sin RLS nueva: aislado_por_comercio ya cubre toda la fila de products sin
-- restricción de columna.
