-- ============================================================================
-- Habilitar la sincronización en tiempo real
-- ============================================================================
--
-- La aplicación ya se suscribía a cambios con `postgres_changes`, pero la
-- publicación `supabase_realtime` no tenía NINGUNA tabla: Postgres no emitía
-- nada y los eventos no llegaban nunca. En la práctica, dos cajas abiertas al
-- mismo tiempo no se veían entre sí — cada una mostraba el stock que había
-- cargado al arrancar.
--
-- Se publican sólo las tablas a las que la app se suscribe. Agregar tablas que
-- nadie escucha sólo agranda el WAL sin beneficio.
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'products',        -- stock compartido entre cajas
    'sales',           -- historial y totales del turno
    'cash_shifts',     -- apertura, cierre y arqueo
    'cash_movements',  -- entradas y retiros de efectivo
    'parked_tickets',  -- pedidos en espera, retomables desde otra caja
    'fixed_expenses',  -- gastos fijos
    'store_settings'   -- datos del comercio y del ticket
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;

-- ----------------------------------------------------------------------------
-- REPLICA IDENTITY FULL en las tablas donde borrar es parte del uso normal
-- ----------------------------------------------------------------------------
--
-- Con la identidad por defecto, un DELETE sólo escribe la clave primaria en el
-- WAL. Como estas tablas tienen RLS, Realtime no puede evaluar la policy contra
-- una fila que no tiene, y el evento de borrado puede no entregarse.
--
-- El caso concreto que importa: al retomar un ticket aparcado se borra la fila.
-- Sin el evento, la otra caja lo sigue mostrando disponible y dos cajeros pueden
-- terminar atendiendo el mismo pedido.
--
-- Sólo se aplica donde hace falta: FULL hace que cada UPDATE y DELETE escriba la
-- fila vieja completa en el WAL. En sales, cash_shifts, cash_movements y
-- store_settings no se borra en el uso normal, así que quedan con la identidad
-- por defecto.

alter table public.parked_tickets replica identity full;
alter table public.products replica identity full;
alter table public.fixed_expenses replica identity full;
