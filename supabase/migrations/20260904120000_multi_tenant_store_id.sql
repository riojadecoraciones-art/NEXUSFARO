-- ============================================================================
-- Multi-comercio real: aislar datos por tenant
-- ============================================================================
--
-- Hasta ahora esta base atendía un solo negocio. El dueño va a vender NEXUS
-- FARO a otros comercios, y hoy CERO tablas tienen una columna que diga
-- "esto es de tal comercio": si hubiera 2 comercios, cada uno vería el 100%
-- de los datos del otro (confirmado antes de escribir esto: ninguna columna
-- 'store_id' existe en todo el esquema public).
--
-- Mecanismo: cada tabla operativa suma 'store_id', con un DEFAULT que lee
-- directo del JWT de la sesión (auth.jwt() -> 'app_metadata' ->> 'store_id').
-- Esto significa que el código de la app (supabaseService.ts) NO necesita
-- empezar a mandar store_id en cada insert: Postgres lo completa solo, a
-- partir de qué terminal está haciendo la llamada. Las policies de RLS leen
-- el mismo claim para acotar qué filas ve/edita cada sesión.
--
-- Ese claim se etiqueta en auth.users.raw_app_meta_data con SQL directo,
-- porque no hay Admin API de Supabase Auth disponible como herramienta en
-- esta sesión (sólo ejecución de SQL crudo) — confirmado contra la lista
-- completa de tools antes de diseñar esto. auth.jwt() confirmado seguro de
-- llamar sin contexto de request (devuelve NULL, no error), así que estos
-- DEFAULT no rompen nada cuando esta misma migración corre fuera de una
-- sesión real de PostgREST.
--
-- REQUISITO OPERATIVO: la terminal existente tiene un JWT ya emitido sin
-- este claim. Después de aplicar esto, tiene que cerrar sesión y volver a
-- entrar — mientras tanto va a ver la app sin datos (RLS bloquea todo sin
-- el claim), no rota.
-- ============================================================================

-- 1. El negocio actual se convierte en el primer comercio real (no un dato
--    de prueba: es la operación real de este dueño).
insert into public.stores (id, name, branch_name, owner_name, owner_email, cuit, address, status, created_at)
values (
  'store-rioja-decoraciones',
  'Rioja Decoraciones',
  'Sucursal Principal',
  'Dueño / Administrador',
  'riojadecoraciones@gmail.com',
  '',
  '',
  'ACTIVO',
  now()
)
on conflict (id) do nothing;

-- 2. Tablas operativas simples: agregar store_id, completar lo existente,
--    exigirlo de ahí en más, y reemplazar la policy abierta por una acotada
--    al comercio de la sesión.
do $$
declare
  t text;
begin
  foreach t in array array[
    'users', 'products', 'sales', 'sale_items', 'cash_shifts',
    'cash_movements', 'parked_tickets', 'stock_movements',
    'fixed_expenses', 'app_alerts'
  ]
  loop
    execute format(
      $sql$alter table public.%I
        add column if not exists store_id text
        references public.stores(id)
        default (auth.jwt() -> 'app_metadata' ->> 'store_id')$sql$,
      t
    );

    execute format(
      $sql$update public.%I set store_id = 'store-rioja-decoraciones' where store_id is null$sql$,
      t
    );

    execute format('alter table public.%I alter column store_id set not null', t);

    execute format('drop policy if exists "solo_sesion_autenticada" on public.%I', t);

    execute format(
      $sql$create policy "aislado_por_comercio" on public.%I
        for all to authenticated
        using (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id'))
        with check (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id'))$sql$,
      t
    );
  end loop;
end
$$;

-- 3. categories: mismo tratamiento, más el ajuste del UNIQUE — dos comercios
--    tienen que poder tener ambos una categoría "General".
alter table public.categories
  add column if not exists store_id text
  references public.stores(id)
  default (auth.jwt() -> 'app_metadata' ->> 'store_id');

update public.categories set store_id = 'store-rioja-decoraciones' where store_id is null;

alter table public.categories alter column store_id set not null;

alter table public.categories drop constraint if exists categories_name_key;
alter table public.categories add constraint categories_store_id_name_key unique (store_id, name);

drop policy if exists "solo_sesion_autenticada" on public.categories;
create policy "aislado_por_comercio" on public.categories
  for all to authenticated
  using (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id'))
  with check (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id'));

-- 4. products: mismo caso que categories, pero con el SKU. Sin este ajuste,
--    el primer comercio nuevo que intente cargar un producto con un SKU que
--    ya usó CUALQUIER otro comercio (p.ej. "PROD-001", un patrón obvio)
--    chocaría contra un UNIQUE global sin sentido para su propio catálogo.
--    (products ya recibió store_id en el bloque genérico de arriba — acá
--    sólo se ajusta el constraint de sku.)
alter table public.products drop constraint if exists products_sku_key;
alter table public.products add constraint products_store_id_sku_key unique (store_id, sku);

-- 5. store_settings: pasa de una fila única global ('default') a una fila
--    por comercio. store_id, no id, es la clave real de ahora en más.
alter table public.store_settings
  add column if not exists store_id text
  references public.stores(id)
  default (auth.jwt() -> 'app_metadata' ->> 'store_id');

update public.store_settings set store_id = 'store-rioja-decoraciones' where store_id is null;

alter table public.store_settings alter column store_id set not null;
alter table public.store_settings add constraint store_settings_store_id_key unique (store_id);

-- El default de 'id' era el literal 'default': una fila nueva (de un
-- comercio nuevo) que no mande id explícito volvería a chocar contra la
-- misma fila. Un id generado por fila evita eso.
alter table public.store_settings alter column id set default gen_random_uuid()::text;

drop policy if exists "solo_sesion_autenticada" on public.store_settings;
create policy "aislado_por_comercio" on public.store_settings
  for all to authenticated
  using (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id'))
  with check (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id'));

-- 6. stores: NO lleva store_id (es la tabla de tenants en sí). Sólo la
--    terminal marcada como operadora de la plataforma puede leer/escribir
--    el directorio completo de comercios — si no se cierra esto, apenas se
--    conecte el alta real de comercios (parte de este mismo cambio),
--    cualquier terminal de cualquier comercio podría leer y editar los
--    datos de contacto de TODOS los demás comercios de la plataforma.
drop policy if exists "solo_sesion_autenticada" on public.stores;
create policy "solo_superadmin" on public.stores
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

-- 7. Etiquetar la terminal existente: pertenece a Rioja Decoraciones Y es
--    la operadora de la plataforma (mismo dueño, dos roles).
update auth.users
set raw_app_meta_data = raw_app_meta_data
  || jsonb_build_object('store_id', 'store-rioja-decoraciones', 'role', 'superadmin')
where email = 'terminal@riojadecoraciones.com';
