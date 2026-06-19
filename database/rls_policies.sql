-- ============================================================
-- CajaPro — Políticas RLS (Row Level Security)
-- Ejecutar DESPUÉS de schema.sql en: Supabase > SQL Editor
-- Reemplaza las políticas temporales del Sprint 1
-- ============================================================

-- ============================================================
-- PASO 1: Eliminar políticas temporales del Sprint 1
-- ============================================================
DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'comercios','usuarios','categorias','proveedores','productos',
    'ventas','ventas_items','categorias_gastos','gastos'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "acceso_total_autenticados" ON public.%I', t
    );
  END LOOP;
END $$;

-- ============================================================
-- PASO 2: Funciones auxiliares SECURITY DEFINER
-- Corren con privilegios elevados y se cachean por query (STABLE)
-- evitando un hit a la base por cada fila evaluada
-- ============================================================

-- Retorna el comercio_id del usuario autenticado activo
CREATE OR REPLACE FUNCTION public.get_comercio_id_actual()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT comercio_id
  FROM public.usuarios
  WHERE auth_user_id = auth.uid()
    AND activo = true
  LIMIT 1;
$$;

-- Retorna true si el usuario autenticado tiene rol 'admin'
CREATE OR REPLACE FUNCTION public.es_admin_actual()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT rol = 'admin'
     FROM public.usuarios
     WHERE auth_user_id = auth.uid()
       AND activo = true
     LIMIT 1),
    false
  );
$$;

-- ============================================================
-- PASO 3: Políticas por tabla
-- ============================================================

-- ----------------------------------------------------------
-- COMERCIOS
-- SELECT: cada usuario ve solo su propio comercio
-- UPDATE: solo el admin puede modificar datos del comercio
-- INSERT/DELETE: bloqueado (se gestiona por RPC)
-- ----------------------------------------------------------
CREATE POLICY "comercio_ver_propio" ON comercios
  FOR SELECT TO authenticated
  USING (id = public.get_comercio_id_actual());

CREATE POLICY "comercio_admin_actualizar" ON comercios
  FOR UPDATE TO authenticated
  USING (id = public.get_comercio_id_actual() AND public.es_admin_actual())
  WITH CHECK (id = public.get_comercio_id_actual() AND public.es_admin_actual());

-- ----------------------------------------------------------
-- USUARIOS
-- SELECT: cualquier miembro del comercio ve a los demás
-- INSERT: solo admin puede crear invitaciones (nuevos usuarios)
-- UPDATE: solo admin puede cambiar rol/estado; el propio usuario puede ver su perfil
-- DELETE: bloqueado (se usa activo=false en lugar de borrar)
-- ----------------------------------------------------------
CREATE POLICY "usuarios_ver_del_comercio" ON usuarios
  FOR SELECT TO authenticated
  USING (comercio_id = public.get_comercio_id_actual());

CREATE POLICY "usuarios_admin_crear" ON usuarios
  FOR INSERT TO authenticated
  WITH CHECK (
    comercio_id = public.get_comercio_id_actual()
    AND public.es_admin_actual()
  );

CREATE POLICY "usuarios_admin_modificar" ON usuarios
  FOR UPDATE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual())
  WITH CHECK (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());

-- ----------------------------------------------------------
-- CATEGORÍAS
-- Admin: CRUD completo | Cajero: solo lectura
-- ----------------------------------------------------------
CREATE POLICY "categorias_ver" ON categorias
  FOR SELECT TO authenticated
  USING (comercio_id = public.get_comercio_id_actual());

CREATE POLICY "categorias_admin_crear" ON categorias
  FOR INSERT TO authenticated
  WITH CHECK (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());

CREATE POLICY "categorias_admin_modificar" ON categorias
  FOR UPDATE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual())
  WITH CHECK (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());

CREATE POLICY "categorias_admin_borrar" ON categorias
  FOR DELETE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());

-- ----------------------------------------------------------
-- PROVEEDORES
-- Admin: CRUD completo | Cajero: solo lectura
-- ----------------------------------------------------------
CREATE POLICY "proveedores_ver" ON proveedores
  FOR SELECT TO authenticated
  USING (comercio_id = public.get_comercio_id_actual());

CREATE POLICY "proveedores_admin_crear" ON proveedores
  FOR INSERT TO authenticated
  WITH CHECK (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());

CREATE POLICY "proveedores_admin_modificar" ON proveedores
  FOR UPDATE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual())
  WITH CHECK (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());

CREATE POLICY "proveedores_admin_borrar" ON proveedores
  FOR DELETE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());

-- ----------------------------------------------------------
-- PRODUCTOS
-- Ambos roles pueden crear/editar productos (gestión de stock)
-- Solo admin puede borrar
-- ----------------------------------------------------------
CREATE POLICY "productos_ver" ON productos
  FOR SELECT TO authenticated
  USING (comercio_id = public.get_comercio_id_actual());

CREATE POLICY "productos_crear" ON productos
  FOR INSERT TO authenticated
  WITH CHECK (comercio_id = public.get_comercio_id_actual());

CREATE POLICY "productos_modificar" ON productos
  FOR UPDATE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual())
  WITH CHECK (comercio_id = public.get_comercio_id_actual());

CREATE POLICY "productos_admin_borrar" ON productos
  FOR DELETE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());

-- ----------------------------------------------------------
-- VENTAS
-- Ambos roles pueden crear ventas
-- Solo admin puede cancelar/eliminar
-- ----------------------------------------------------------
CREATE POLICY "ventas_ver" ON ventas
  FOR SELECT TO authenticated
  USING (comercio_id = public.get_comercio_id_actual());

CREATE POLICY "ventas_crear" ON ventas
  FOR INSERT TO authenticated
  WITH CHECK (comercio_id = public.get_comercio_id_actual());

CREATE POLICY "ventas_admin_modificar" ON ventas
  FOR UPDATE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual())
  WITH CHECK (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());

CREATE POLICY "ventas_admin_borrar" ON ventas
  FOR DELETE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());

-- ----------------------------------------------------------
-- VENTAS_ITEMS
-- Sigue el acceso de su venta padre
-- ----------------------------------------------------------
CREATE POLICY "ventas_items_ver" ON ventas_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ventas v
      WHERE v.id = venta_id
        AND v.comercio_id = public.get_comercio_id_actual()
    )
  );

CREATE POLICY "ventas_items_crear" ON ventas_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ventas v
      WHERE v.id = venta_id
        AND v.comercio_id = public.get_comercio_id_actual()
    )
  );

CREATE POLICY "ventas_items_admin_borrar" ON ventas_items
  FOR DELETE TO authenticated
  USING (
    public.es_admin_actual() AND
    EXISTS (
      SELECT 1 FROM ventas v
      WHERE v.id = venta_id
        AND v.comercio_id = public.get_comercio_id_actual()
    )
  );

-- ----------------------------------------------------------
-- CATEGORÍAS DE GASTOS
-- Admin: CRUD completo | Cajero: solo lectura
-- ----------------------------------------------------------
CREATE POLICY "categorias_gastos_ver" ON categorias_gastos
  FOR SELECT TO authenticated
  USING (comercio_id = public.get_comercio_id_actual());

CREATE POLICY "categorias_gastos_admin_crear" ON categorias_gastos
  FOR INSERT TO authenticated
  WITH CHECK (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());

CREATE POLICY "categorias_gastos_admin_modificar" ON categorias_gastos
  FOR UPDATE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual())
  WITH CHECK (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());

CREATE POLICY "categorias_gastos_admin_borrar" ON categorias_gastos
  FOR DELETE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());

-- ----------------------------------------------------------
-- GASTOS
-- Ambos roles pueden cargar gastos
-- Solo admin puede editar/borrar
-- ----------------------------------------------------------
CREATE POLICY "gastos_ver" ON gastos
  FOR SELECT TO authenticated
  USING (comercio_id = public.get_comercio_id_actual());

CREATE POLICY "gastos_crear" ON gastos
  FOR INSERT TO authenticated
  WITH CHECK (comercio_id = public.get_comercio_id_actual());

CREATE POLICY "gastos_admin_modificar" ON gastos
  FOR UPDATE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual())
  WITH CHECK (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());

CREATE POLICY "gastos_admin_borrar" ON gastos
  FOR DELETE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());
