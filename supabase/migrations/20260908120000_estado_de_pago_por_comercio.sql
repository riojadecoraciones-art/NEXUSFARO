-- ============================================================================
-- Estado de pago por comercio: que SUSPENDIDO bloquee de verdad
-- ============================================================================
--
-- stores.status (ACTIVO/SUSPENDIDO/EN_PRUEBA) ya existía, pero era sólo
-- decorativo — no bloqueaba nada. Cobrar sigue siendo manual (el dueño de la
-- plataforma manda el link de pago por fuera del sistema, por WhatsApp) pero
-- ahora, si marca un comercio como SUSPENDIDO desde el Portal Maestro, esa
-- terminal deja de poder entrar.
--
-- paid_until es sólo informativo (para que el operador vea de un vistazo a
-- quién hay que cobrarle) — no dispara nada por sí solo.
alter table public.stores add column if not exists paid_until date;

-- Hasta ahora 'stores' sólo la podía leer la terminal superadmin
-- (solo_superadmin). Para poder bloquear el acceso hace falta que CADA
-- terminal pueda leer su PROPIA fila (para chequear su propio status) sin
-- poder ver el directorio completo de otros comercios. Postgres combina
-- policies permisivas del mismo comando con OR, así que esto se suma a
-- solo_superadmin sin tocarla ni debilitarla.
create policy "lee_su_propio_comercio" on public.stores
  for select to authenticated
  using (id = (auth.jwt() -> 'app_metadata' ->> 'store_id'));
