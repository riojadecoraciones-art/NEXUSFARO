-- Unidad de venta por producto: hasta ahora todo se vendía "por unidad
-- entera" (1, 2, 3...). Un negocio que vende cosas sueltas por peso o
-- volumen (almacén naturista, dietética, fiambrería) no tenía forma de
-- cargar eso — cantidad y precio sólo tenían sentido para unidades enteras.
--
-- stock/min_stock/sale_items.quantity ya son `numeric` desde el vamos (no
-- `integer`), así que esta migración no necesita tocar esas columnas: sólo
-- agrega la etiqueta de qué unidad usa cada producto. El resto (aceptar
-- cantidades fraccionarias en el carrito, mostrar "0.350 kg" en el ticket)
-- es trabajo del cliente, no de la base.
alter table public.products
  add column if not exists unit_type text not null default 'UNIDAD';

alter table public.products
  add constraint products_unit_type_check
  check (unit_type in ('UNIDAD', 'KG', 'GRAMO', 'LITRO', 'ML'));
