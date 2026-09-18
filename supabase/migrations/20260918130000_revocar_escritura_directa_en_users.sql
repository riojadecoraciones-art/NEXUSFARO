-- ============================================================================
-- Cerrar escritura directa en users (documentar estado que ya está en vivo)
-- ============================================================================
--
-- Una revisión de seguridad anterior en esta misma sesión (Vuln 1: escalada
-- de privilegios vía escritura directa en users) detectó y corrigió que
-- cualquier sesión autenticada de un comercio podía escribir directo en
-- `public.users` — la policy genérica "aislado_por_comercio" (creada para
-- TODAS las tablas operativas por igual) sólo exige store_id, sin mirar el
-- rol de quien escribe. Eso permitía que un Cajero se auto-asignara el rol
-- DUEÑO, o pisara el PIN del Dueño real, sin pasar por la Edge Function
-- manage-employee (que sí valida PIN/contraseña maestra del lado servidor).
--
-- La corrección se aplicó en su momento directo contra la base (revocar los
-- grants de escritura) pero nunca quedó guardada como archivo de migración
-- acá — confirmado ahora al auditar de nuevo: el código en
-- supabaseService.ts y manage-employee/index.ts ya tenía comentarios
-- citando esta migración por nombre, pero el archivo no existía. Sin este
-- archivo, reconstruir la base desde cero (un ambiente nuevo, un restore)
-- NO recrearía la protección, aunque la producción actual sí la tenga.
--
-- Este archivo documenta y vuelve a dejar explícito ese estado: revoca la
-- escritura directa y reduce la policy a sólo lectura. Toda alta/edición/
-- baja de usuarios pasa exclusivamente por la Edge Function manage-employee
-- (cliente service_role, con su propia verificación de PIN/contraseña
-- maestra del lado servidor).
-- ============================================================================

revoke insert, update, delete on public.users from authenticated;

drop policy if exists "aislado_por_comercio" on public.users;

create policy "lectura_por_comercio" on public.users
  for select to authenticated
  using (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id'));
