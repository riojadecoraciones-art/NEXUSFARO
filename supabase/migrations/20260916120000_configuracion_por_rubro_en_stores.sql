-- ============================================================================
-- Configuración por rubro, a cargo de Llave Maestra: vencimientos y talles
-- ============================================================================
--
-- Distintos clientes necesitan funcionalidad distinta según su rubro: un
-- almacén o dietética necesita rastrear vencimientos: una tienda de ropa o
-- calzado necesita manejar talles/variantes. En vez de que cada comercio
-- vea todo prendido siempre, el Superadmin lo configura al dar de alta (o
-- editar) el negocio desde el Portal Maestro — mismo mecanismo ya usado por
-- paid_until/terminal_email en esta tabla.
--
-- has_size_variants queda guardable desde ya, pero todavía no dispara
-- ningún comportamiento nuevo en la app: el trabajo de variantes por talle
-- es un esfuerzo aparte, mucho mayor (tabla de variantes, selector en el
-- POS, stock por variante), y se implementa en otra pasada.
alter table public.stores
  add column if not exists tracks_expiration boolean not null default false,
  add column if not exists has_size_variants boolean not null default false;

-- Sin RLS nueva: solo_superadmin (escritura) y lee_su_propio_comercio
-- (lectura) ya cubren toda la fila sin restricción de columna, igual que
-- pasó con paid_until y terminal_email antes.
