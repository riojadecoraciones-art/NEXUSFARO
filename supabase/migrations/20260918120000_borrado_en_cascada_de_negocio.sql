-- ============================================================================
-- Borrado real de un negocio: cascada en las 15 tablas que dependen de stores
-- ============================================================================
--
-- El botón "Eliminar" del Portal Maestro intenta borrar sólo la fila de
-- `stores`, pero las 15 tablas que tienen store_id (empleados, productos,
-- ventas, stock, alertas, gastos, proveedores, contenidos, auditoría, etc.)
-- referencian esa fila con NO ACTION — Postgres frena el borrado apenas hay
-- UNA fila dependiente, y todo negocio real tiene como mínimo su usuario
-- dueño/terminal en `users`. Confirmado contra el log real de un intento
-- fallido: "violates foreign key constraint users_store_id_fkey".
--
-- El Dueño pidió que el botón funcione solo, sin depender de una corrección
-- manual por código cada vez, y qué el borrado sea permanente de verdad (no
-- una baja reversible). Acá se cambian las 15 constraints a ON DELETE
-- CASCADE, así un solo DELETE sobre `stores` arrastra atómicamente todo lo
-- de ese negocio. Deliberado: irreversible, sin posibilidad de recuperación
-- salvo restaurar un backup — el Portal Maestro es el único lugar que puede
-- ejecutarlo (policy "solo_superadmin" de stores).
--
-- Nota para migraciones futuras: toda tabla nueva con store_id debe crear su
-- FK con "on delete cascade" desde el vamos, o va a reproducir este mismo
-- bloqueo apenas tenga una fila cargada.
-- ============================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'users', 'products', 'sales', 'sale_items', 'cash_shifts',
    'cash_movements', 'parked_tickets', 'stock_movements',
    'fixed_expenses', 'app_alerts', 'categories', 'store_settings',
    'superadmin_audit_log', 'content_ideas', 'suppliers'
  ]
  loop
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_store_id_fkey');
    execute format(
      $sql$alter table public.%I
        add constraint %I foreign key (store_id) references public.stores(id) on delete cascade$sql$,
      t, t || '_store_id_fkey'
    );
  end loop;
end
$$;
