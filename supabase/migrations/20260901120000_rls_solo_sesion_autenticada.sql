-- ============================================================================
-- Cerrar el acceso público a la base de datos
-- ============================================================================
--
-- Estado anterior: las 13 tablas tenían RLS activado, pero con una policy
-- "Allow all operations for anon and authenticated" cuyo USING era `true`.
-- Combinado con la anon key (que es pública por diseño y además estaba
-- versionada en un repositorio público), cualquiera podía leer y escribir la
-- base entera: ventas, productos y la tabla users.
--
-- Estado nuevo: sólo el rol `authenticated` puede operar. La anon key por sí
-- sola deja de dar acceso a los datos; la app obtiene una sesión real mediante
-- el login de terminal (supabase.auth.signInWithPassword) antes de leer nada.
--
-- REQUISITO ANTES DE APLICAR: tiene que existir al menos un usuario en
-- Supabase Auth (Dashboard → Authentication → Users → Add user) y la terminal
-- tiene que estar corriendo una versión de la app con el login de terminal.
-- Si se aplica antes, la aplicación deja de ver los datos.
-- ============================================================================


-- 1. Eliminar las policies abiertas -----------------------------------------
drop policy if exists "Allow all operations for anon and authenticated" on public.users;
drop policy if exists "Allow all operations for anon and authenticated" on public.categories;
drop policy if exists "Allow all operations for anon and authenticated" on public.products;
drop policy if exists "Allow all operations for anon and authenticated" on public.cash_shifts;
drop policy if exists "Allow all operations for anon and authenticated" on public.cash_movements;
drop policy if exists "Allow all operations for anon and authenticated" on public.sales;
drop policy if exists "Allow all operations for anon and authenticated" on public.sale_items;
drop policy if exists "Allow all operations for anon and authenticated" on public.parked_tickets;
drop policy if exists "Allow all operations for anon and authenticated" on public.stock_movements;
drop policy if exists "Allow all operations for anon and authenticated" on public.fixed_expenses;
drop policy if exists "Allow all operations for anon and authenticated" on public.app_alerts;
drop policy if exists "Allow all operations for anon and authenticated" on public.store_settings;
drop policy if exists "Allow all operations on stores" on public.stores;

-- 2. Policies nuevas: sólo sesiones autenticadas ----------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'users', 'categories', 'products', 'cash_shifts', 'cash_movements',
    'sales', 'sale_items', 'parked_tickets', 'stock_movements',
    'fixed_expenses', 'app_alerts', 'store_settings', 'stores'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "solo_sesion_autenticada" on public.%I
         for all to authenticated using (true) with check (true)', t
    );
  end loop;
end
$$;

-- 3. Quitarle a `anon` los permisos de tabla --------------------------------
-- PostgREST exige GRANT y policy: sin el grant, la anon key no llega ni a
-- evaluar las policies. El acceso al endpoint de login (GoTrue) no depende
-- de esto, así que la pantalla de login de terminal sigue funcionando.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

-- 4. Asegurar que `authenticated` conserve sus permisos ---------------------
grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;

