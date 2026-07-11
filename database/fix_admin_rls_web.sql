-- =============================================================
-- CajaPro — Fix RLS superadmin (idempotente — seguro re-ejecutar)
-- Ejecutar en: Supabase > SQL Editor
-- Propósito: permitir al superadmin leer todos los comercios
--            y todos los usuarios desde la web (sin service_role)
-- =============================================================

-- ── Función helper (CREATE OR REPLACE = idempotente) ────────
CREATE OR REPLACE FUNCTION public.es_superadmin_actual()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE auth_user_id = auth.uid()
      AND rol = 'superadmin'
      AND activo = true
  );
$$;

-- ── Policies para tabla "comercios" ──────────────────────────
-- Leer todos los comercios
DROP POLICY IF EXISTS "comercios_superadmin_ver_todos" ON comercios;
CREATE POLICY "comercios_superadmin_ver_todos"
  ON comercios FOR SELECT
  USING (public.es_superadmin_actual());

-- Actualizar cualquier comercio
DROP POLICY IF EXISTS "comercios_superadmin_actualizar" ON comercios;
CREATE POLICY "comercios_superadmin_actualizar"
  ON comercios FOR UPDATE
  USING (public.es_superadmin_actual())
  WITH CHECK (public.es_superadmin_actual());

-- Insertar nuevos comercios (para crear desde la web)
DROP POLICY IF EXISTS "comercios_superadmin_insertar" ON comercios;
CREATE POLICY "comercios_superadmin_insertar"
  ON comercios FOR INSERT
  WITH CHECK (public.es_superadmin_actual());

-- ── Policies para tabla "usuarios" ───────────────────────────
-- Leer todos los usuarios (para panel Comercios → expandir)
DROP POLICY IF EXISTS "usuarios_superadmin_ver_todos" ON usuarios;
CREATE POLICY "usuarios_superadmin_ver_todos"
  ON usuarios FOR SELECT
  USING (public.es_superadmin_actual());

-- ── Verificación (opcional) ───────────────────────────────────
-- Ejecutá esta query para confirmar que las policies se crearon:
-- SELECT policyname, tablename, cmd
-- FROM pg_policies
-- WHERE policyname LIKE '%superadmin%'
-- ORDER BY tablename, policyname;
