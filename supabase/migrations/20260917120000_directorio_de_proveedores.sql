-- ============================================================================
-- Directorio de Proveedores: nombre + contacto directo (WhatsApp/web)
-- ============================================================================
--
-- Universal para todo comercio (a diferencia de vencimientos/talles, que son
-- por rubro y las configura Llave Maestra): cualquier negocio puede tener
-- proveedores, desde uno solo hasta varios. whatsapp_phone y website_url
-- quedan en texto libre y sin validar — no hay integración real posible con
-- WhatsApp ni con la web de un proveedor genérico, así que esto es sólo un
-- directorio con acceso directo de un toque, no un sistema que lea precios
-- de ahí (ver products.cost_updated_at para el mecanismo real de aviso).
--
-- Mismo tratamiento multi-tenant que el resto de las tablas operativas (ver
-- 20260904120000_multi_tenant_store_id.sql): store_id con DEFAULT desde el
-- JWT de la sesión, policy única aislada por comercio.
create table if not exists public.suppliers (
  id text primary key,
  store_id text not null references public.stores(id)
    default (auth.jwt() -> 'app_metadata' ->> 'store_id'),
  name text not null,
  whatsapp_phone text,
  website_url text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.suppliers enable row level security;

create policy "aislado_por_comercio" on public.suppliers
  for all to authenticated
  using (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id'))
  with check (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id'));

-- Tiempo real: el Dueño puede tener el Panel de Proveedores abierto en el
-- local y en el celular a la vez.
alter publication supabase_realtime add table public.suppliers;

-- Borrar un proveedor es uso normal acá (dejó de operar con él) — mismo
-- motivo que content_ideas/parked_tickets: sin REPLICA IDENTITY FULL el
-- evento de DELETE puede no evaluarse contra la policy de RLS y no entregarse.
alter table public.suppliers replica identity full;
