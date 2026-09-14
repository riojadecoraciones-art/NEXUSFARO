-- Historial de costos: hasta ahora costPrice era un único campo que se pisa
-- al editar el producto a mano, sin dejar rastro del valor anterior — si
-- hoy compraste a $2 y la semana que viene a $3, no había forma de que el
-- sistema te avisara "el último costo fue $3" al decidir el precio de
-- venta. "Recibir Mercadería" (donde se carga la compra real) tampoco
-- tocaba el costo para nada, dos acciones completamente desconectadas.
--
-- unit_cost en stock_movements queda nullable a propósito: sólo tiene
-- sentido en una recepción real (INGRESO) donde se sabe el costo de esa
-- compra puntual — un ajuste por merma o conteo físico no tiene "costo de
-- compra". Cada fila de este tipo es, de por sí, el historial de costos
-- del producto a lo largo del tiempo (ver "Auditoría de Stock").
alter table public.stock_movements
  add column if not exists unit_cost numeric;
