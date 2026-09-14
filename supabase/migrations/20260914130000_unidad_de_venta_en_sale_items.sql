-- Complemento de 20260914120000_unidad_de_venta_en_products.sql: el ítem de
-- una venta ya guarda unit_price/unit_cost como una COPIA del producto al
-- momento de vender (no una referencia en vivo), justamente para que un
-- ticket viejo no cambie si el producto se edita o se borra después. La
-- unidad de venta necesita el mismo tratamiento — si no, un ticket antiguo
-- de "almendras sueltas" (Kg) mostraría "u." apenas alguien edite ese
-- producto o lo borre del catálogo.
alter table public.sale_items
  add column if not exists unit_type text not null default 'UNIDAD';

alter table public.sale_items
  add constraint sale_items_unit_type_check
  check (unit_type in ('UNIDAD', 'KG', 'GRAMO', 'LITRO', 'ML'));
