-- ============================================================================
-- Calendario de Contenidos: ideas de marketing/redes con fecha opcional
-- ============================================================================
--
-- scheduled_date queda NULL a propósito: así se distingue una idea todavía
-- "en el banco" (sin fecha asignada) de una ya puesta en el calendario, sin
-- necesitar una columna de estado aparte — la vista mensual sólo pregunta
-- "¿tiene fecha o no?".
--
-- Mismo tratamiento multi-tenant que el resto de las tablas operativas
-- (ver 20260904120000_multi_tenant_store_id.sql): store_id con DEFAULT desde
-- el JWT de la sesión, policy única aislada por comercio.
create table if not exists public.content_ideas (
  id text primary key,
  store_id text not null references public.stores(id)
    default (auth.jwt() -> 'app_metadata' ->> 'store_id'),
  title text not null,
  type text not null check (type in ('PROMOCION', 'PUBLICACION', 'HISTORIA', 'RECORDATORIO')),
  scheduled_date date,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.content_ideas enable row level security;

create policy "aislado_por_comercio" on public.content_ideas
  for all to authenticated
  using (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id'))
  with check (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id'));

-- Tiempo real: si una terminal programa o borra una idea, las demás cajas
-- abiertas en Calendario de Contenidos lo tienen que ver sin refrescar.
alter publication supabase_realtime add table public.content_ideas;

-- Borrar una idea (descartarla) es uso normal acá, no una excepción — mismo
-- motivo que parked_tickets: sin REPLICA IDENTITY FULL el evento de DELETE
-- puede no evaluarse contra la policy de RLS y no entregarse.
alter table public.content_ideas replica identity full;
