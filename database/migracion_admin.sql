-- ─── MIGRACIÓN: Módulo Administrador CajaPro ────────────────────────────────
-- Ejecutar en el SQL Editor de Supabase
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Permitir comercio_id NULL en usuarios (el superadmin no pertenece a ningún comercio)
ALTER TABLE usuarios ALTER COLUMN comercio_id DROP NOT NULL;

-- 2. Agregar modulos_permitidos a comercios
--    Controla qué módulos puede ver/activar el admin del comercio.
--    Si un módulo NO aparece o es TRUE → permitido.
--    Si es FALSE → bloqueado por el superadmin.
ALTER TABLE comercios
  ADD COLUMN IF NOT EXISTS modulos_permitidos JSONB NOT NULL DEFAULT '{}';

-- 3. Crear el usuario superadmin
-- ─────────────────────────────────────────────────────────────────────────────
-- PASO A: Ir a Supabase Dashboard → Authentication → Users → Add user
--   Email:    nicolas@cajapro.admin
--   Password: administrador
--   Tildar "Auto Confirm User"
-- ─────────────────────────────────────────────────────────────────────────────

-- PASO B: Ejecutar este bloque DESPUÉS de crear el usuario Auth
--   Reemplazar '<UUID_DEL_AUTH_USER>' con el UUID que te da Supabase al crear el usuario

-- INSERT INTO usuarios (nombre, rol, activo, comercio_id, auth_user_id)
-- VALUES (
--   'Nicolás (Admin)',
--   'superadmin',
--   true,
--   NULL,   -- superadmin no tiene comercio propio
--   '<UUID_DEL_AUTH_USER>'
-- );

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTA: el rol 'superadmin' se guarda como texto. Si la tabla tiene un CHECK
-- constraint en 'rol', expandirlo o eliminarlo:
-- ─────────────────────────────────────────────────────────────────────────────
-- ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
-- ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
--   CHECK (rol IN ('admin', 'cajero', 'superadmin'));
-- ─────────────────────────────────────────────────────────────────────────────
