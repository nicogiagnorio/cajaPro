-- ============================================================
-- CajaPro — Setup completo para base de datos DEV
-- Ejecutar en: Supabase DEV > SQL Editor
-- Proyecto: beraluhbddytvgtaigdj
--
-- Este script aplica TODAS las migraciones faltantes y crea
-- el comercio CajaPro en el entorno de desarrollo.
-- Es seguro ejecutarlo múltiples veces (IF NOT EXISTS / ON CONFLICT).
-- ============================================================

-- ─── 1. Hacer comercio_id nullable en usuarios (superadmin) ──────────────────
ALTER TABLE usuarios ALTER COLUMN comercio_id DROP NOT NULL;

-- ─── 2. Expandir constraint de rol para incluir superadmin ───────────────────
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('admin', 'cajero', 'superadmin'));

-- ─── 3. Columnas faltantes en comercios ──────────────────────────────────────

-- módulos habilitados (migracion_modulos.sql)
ALTER TABLE comercios
  ADD COLUMN IF NOT EXISTS modulos JSONB NOT NULL DEFAULT
    '{"ventas":true,"caja":true,"compras":true,"gastos":true,"clientes":true,"reportes":true}'::jsonb;

-- branding (migracion_logos.sql)
ALTER TABLE comercios
  ADD COLUMN IF NOT EXISTS logo_url   TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- tema de color (migracion_temas.sql)
ALTER TABLE comercios
  ADD COLUMN IF NOT EXISTS color_tema TEXT NOT NULL DEFAULT 'azul';

-- módulos permitidos por superadmin (migracion_admin.sql)
ALTER TABLE comercios
  ADD COLUMN IF NOT EXISTS modulos_permitidos JSONB NOT NULL DEFAULT '{}';

-- rubro del negocio (funciones.sql)
ALTER TABLE comercios
  ADD COLUMN IF NOT EXISTS rubro TEXT;

-- tipo de perfil de contacto: cliente/paciente (migracion_clientes_perfil.sql)
ALTER TABLE comercios
  ADD COLUMN IF NOT EXISTS tipo_perfil TEXT DEFAULT 'cliente'
    CHECK (tipo_perfil IN ('cliente', 'paciente'));

-- ─── 4. Columnas faltantes en clientes (migracion_clientes_perfil.sql) ───────
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
  ADD COLUMN IF NOT EXISTS obra_social      TEXT,
  ADD COLUMN IF NOT EXISTS numero_afiliado  TEXT,
  ADD COLUMN IF NOT EXISTS especie          TEXT
    CHECK (especie IN ('perro', 'gato', 'ave', 'otro'));

-- ─── 5. Funciones helper de RLS (si no existen) ──────────────────────────────

CREATE OR REPLACE FUNCTION get_comercio_id_actual()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT comercio_id FROM usuarios WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION es_admin_actual()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE auth_user_id = auth.uid()
      AND rol = 'admin'
      AND activo = true
  );
$$;

CREATE OR REPLACE FUNCTION es_superadmin_actual()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE auth_user_id = auth.uid()
      AND rol = 'superadmin'
      AND activo = true
  );
$$;

-- ─── 6. Políticas RLS para comercios ─────────────────────────────────────────
-- (por si no existen en dev)

ALTER TABLE comercios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comercios_ver_propio"              ON comercios;
DROP POLICY IF EXISTS "comercios_superadmin_ver_todos"    ON comercios;
DROP POLICY IF EXISTS "comercios_superadmin_gestionar"    ON comercios;

CREATE POLICY "comercios_ver_propio" ON comercios
  FOR SELECT TO authenticated
  USING (id = get_comercio_id_actual());

CREATE POLICY "comercios_superadmin_ver_todos" ON comercios
  FOR SELECT TO authenticated
  USING (es_superadmin_actual());

CREATE POLICY "comercios_superadmin_gestionar" ON comercios
  FOR ALL TO authenticated
  USING (es_superadmin_actual())
  WITH CHECK (es_superadmin_actual());

-- ─── 7. Políticas RLS para usuarios ──────────────────────────────────────────

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios_ver_propio"            ON usuarios;
DROP POLICY IF EXISTS "usuarios_ver_mismo_comercio"    ON usuarios;
DROP POLICY IF EXISTS "usuarios_superadmin_ver_todos"  ON usuarios;
DROP POLICY IF EXISTS "usuarios_superadmin_gestionar"  ON usuarios;
DROP POLICY IF EXISTS "usuarios_admin_gestionar"       ON usuarios;

CREATE POLICY "usuarios_ver_propio" ON usuarios
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "usuarios_ver_mismo_comercio" ON usuarios
  FOR SELECT TO authenticated
  USING (comercio_id = get_comercio_id_actual());

CREATE POLICY "usuarios_superadmin_ver_todos" ON usuarios
  FOR SELECT TO authenticated
  USING (es_superadmin_actual());

CREATE POLICY "usuarios_superadmin_gestionar" ON usuarios
  FOR ALL TO authenticated
  USING (es_superadmin_actual())
  WITH CHECK (es_superadmin_actual());

CREATE POLICY "usuarios_admin_gestionar" ON usuarios
  FOR ALL TO authenticated
  USING (
    comercio_id = get_comercio_id_actual()
    AND es_admin_actual()
  )
  WITH CHECK (
    comercio_id = get_comercio_id_actual()
    AND es_admin_actual()
  );

-- ─── 8. Crear comercio CajaPro ───────────────────────────────────────────────

INSERT INTO comercios (
  id,
  nombre,
  domicilio,
  email,
  activo,
  modulos,
  color_tema,
  modulos_permitidos,
  rubro,
  tipo_perfil
)
VALUES (
  gen_random_uuid(),
  'CajaPro',
  'Buenos Aires, Argentina',
  'admin@cajapro.app',
  true,
  '{"ventas":true,"caja":true,"compras":true,"gastos":true,"clientes":true,"reportes":true}'::jsonb,
  'azul',
  '{}'::jsonb,
  'software',
  'cliente'
)
ON CONFLICT DO NOTHING;

-- ─── 9. Verificación ─────────────────────────────────────────────────────────
-- Ejecutá estas consultas para confirmar que todo está bien:

-- SELECT id, nombre, rubro, modulos, color_tema FROM comercios;
-- SELECT id, nombre, rol, activo, comercio_id, auth_user_id FROM usuarios;
