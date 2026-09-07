-- ============================================================================
-- Registro de auditoría: quién miró los datos de qué comercio
-- ============================================================================
--
-- La Edge Function get-store-snapshot le deja ver al operador de la
-- plataforma (superadmin) los datos operativos reales de un comercio cliente
-- para soporte ("Asistir a este Negocio"). Esa función usa service_role, que
-- bypassa RLS por completo — es la única forma de dar esa visibilidad sin
-- dejar una puerta permanente abierta en las policies de las 12 tablas
-- operativas (ver el comentario de diseño en esa función). El costo de esa
-- elección es que, si esa única sesión superadmin se compromete alguna vez,
-- nada más deja rastro de qué comercios se llegaron a mirar — por eso esta
-- tabla: un renglón por cada vez que se pide el snapshot de un comercio.
--
-- No es una tabla operativa de un comercio (no lleva su propio store_id de
-- tenant): es un registro de la plataforma en sí, igual que 'stores'.

create table if not exists public.superadmin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,
  store_id text not null references public.stores(id),
  action text not null default 'view_snapshot',
  created_at timestamptz not null default now()
);

alter table public.superadmin_audit_log enable row level security;

-- Sólo lectura, y sólo para la terminal operadora de la plataforma. Ninguna
-- policy de insert/update/delete para 'authenticated': la única escritura
-- válida es la de la Edge Function con service_role, que bypassa RLS —  no
-- hace falta (ni corresponde) que el navegador pueda escribir acá nunca.
create policy "solo_superadmin_lee" on public.superadmin_audit_log
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');
