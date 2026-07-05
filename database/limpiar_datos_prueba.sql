-- ============================================================
-- LIMPIAR DATOS DE PRUEBA — Nico Productos Veterinarios
-- Borra solo datos transaccionales. Conserva el comercio y usuarios.
-- Ejecutar en Supabase SQL Editor.
-- ============================================================

DO $$
DECLARE
  v_comercio_id uuid;
BEGIN

  -- Obtener el ID del comercio por nombre
  SELECT id INTO v_comercio_id
  FROM public.comercios
  WHERE LOWER(nombre) ILIKE '%nico%veterinario%'
     OR LOWER(nombre) ILIKE '%nico productos%'
  LIMIT 1;

  IF v_comercio_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el comercio. Verificá el nombre en la tabla comercios.';
  END IF;

  RAISE NOTICE 'Limpiando comercio_id: %', v_comercio_id;

  -- 1. Turnos
  DELETE FROM public.turnos            WHERE comercio_id = v_comercio_id;
  DELETE FROM public.horarios_disponibles WHERE comercio_id = v_comercio_id;
  DELETE FROM public.servicios_turnos  WHERE comercio_id = v_comercio_id;
  DELETE FROM public.profesionales     WHERE comercio_id = v_comercio_id;

  -- 2. Ventas (primero items, luego cabecera)
  DELETE FROM public.ventas_items
    WHERE venta_id IN (SELECT id FROM public.ventas WHERE comercio_id = v_comercio_id);
  DELETE FROM public.ventas            WHERE comercio_id = v_comercio_id;

  -- 3. Compras (primero items, luego cabecera)
  DELETE FROM public.compras_items
    WHERE compra_id IN (SELECT id FROM public.compras WHERE comercio_id = v_comercio_id);
  DELETE FROM public.compras           WHERE comercio_id = v_comercio_id;

  -- 4. Gastos
  DELETE FROM public.gastos            WHERE comercio_id = v_comercio_id;
  DELETE FROM public.categorias_gastos WHERE comercio_id = v_comercio_id;

  -- 5. Cierres de caja
  DELETE FROM public.cierres_caja      WHERE comercio_id = v_comercio_id;

  -- 6. Clientes
  DELETE FROM public.clientes          WHERE comercio_id = v_comercio_id;

  -- 7. Productos, categorías y proveedores
  DELETE FROM public.productos         WHERE comercio_id = v_comercio_id;
  DELETE FROM public.categorias        WHERE comercio_id = v_comercio_id;
  DELETE FROM public.proveedores       WHERE comercio_id = v_comercio_id;

  RAISE NOTICE '✓ Datos de prueba eliminados correctamente para comercio_id: %', v_comercio_id;

END $$;
