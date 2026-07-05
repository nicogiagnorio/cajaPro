-- =============================================================
-- CajaPro — Fix RLS: superadmin puede ver todos los comercios
-- Ejecutar en: Supabase > SQL Editor
-- Problema: la policy "comercio_ver_propio" bloquea al superadmin
--           de ver todos los comercios en el panel de Cobros/Finanzas
-- =============================================================

-- Agregar función helper para verificar superadmin (reutilizable)
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

-- Policy: el superadmin puede leer TODOS los comercios
CREATE POLICY "comercios_superadmin_ver_todos"
  ON comercios FOR SELECT
  USING (public.es_superadmin_actual());

-- Policy: el superadmin puede actualizar cualquier comercio
-- (útil para gestión desde el panel admin)
CREATE POLICY "comercios_superadmin_actualizar"
  ON comercios FOR UPDATE
  USING (public.es_superadmin_actual())
  WITH CHECK (public.es_superadmin_actual());
