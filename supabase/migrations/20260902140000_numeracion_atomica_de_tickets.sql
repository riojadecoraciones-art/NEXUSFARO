-- ============================================================================
-- Numeración de tickets atómica
-- ============================================================================
--
-- El número de ticket se calculaba en el navegador como
-- `TK-${sales.length + 892}`, o sea a partir de la cantidad de ventas que esa
-- terminal tenía cargadas en memoria. Con dos cajas operando al mismo tiempo
-- ambas ven la misma cantidad y generan el MISMO número: dos ventas distintas
-- con el mismo comprobante.
--
-- Ahora el número lo entrega una secuencia de Postgres, que es atómica: dos
-- llamadas simultáneas nunca devuelven el mismo valor.
-- ============================================================================

-- 1. Secuencia, arrancando después del último ticket que ya exista ----------
create sequence if not exists public.ticket_number_seq;

select setval(
  'public.ticket_number_seq',
  greatest(
    coalesce(
      (select max(nullif(regexp_replace(ticket_number, '\D', '', 'g'), '')::bigint)
         from public.sales),
      0
    ),
    891  -- conserva el arranque histórico en TK-00892 para una base vacía
  ),
  true
);

-- 2. Función que entrega el próximo número ----------------------------------
-- SECURITY DEFINER: la app puede pedir el próximo número, pero no manipular la
-- secuencia (nadie puede hacerle setval para reusar números).
create or replace function public.siguiente_numero_ticket()
returns text
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  select 'TK-' || lpad(nextval('public.ticket_number_seq')::text, 5, '0');
$$;

revoke all on function public.siguiente_numero_ticket() from public;
revoke all on function public.siguiente_numero_ticket() from anon;
grant execute on function public.siguiente_numero_ticket() to authenticated;

-- 3. Red de contención: que la base rechace un duplicado --------------------
-- La secuencia hace que los choques no ocurran; esto hace que sean imposibles.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.sales'::regclass
      and conname = 'sales_ticket_number_key'
  ) then
    alter table public.sales
      add constraint sales_ticket_number_key unique (ticket_number);
  end if;
end
$$;
