-- ============================================================================
-- IVA por categoría, con excepción puntual por producto
-- ============================================================================
--
-- Hasta ahora había una única tasa de IVA para todo el carrito, y encima
-- ni siquiera vivía en la base: se guardaba en el localStorage del
-- navegador (nexus_tax_percent), así que no viajaba entre dispositivos ni
-- la podía ver Llave Maestra. Un solo número tampoco alcanza para negocios
-- que venden productos con distinto tratamiento de IVA (por ejemplo, una
-- dietética con alimentos a tasa reducida/exenta y cosmética al 21%).
--
-- Ahora el IVA se define por categoría (categories.tax_percent, todas
-- arrancan en 21 para no cambiarle el cálculo a nadie que no lo toque) y,
-- si un producto puntual necesita algo distinto al de su categoría, se le
-- puede pisar con products.tax_percent (NULL = hereda de la categoría).
-- ============================================================================

alter table public.categories
  add column if not exists tax_percent numeric not null default 21;

alter table public.products
  add column if not exists tax_percent numeric;
