-- ============================================================
-- CajaPro — Migración: módulo de Ventas (POS)
-- Ejecutar en: Supabase > SQL Editor
-- Requiere: schema.sql, rls_policies.sql y funciones.sql previos
-- ============================================================

-- ============================================================
-- TRIGGER: descontar stock al registrar ítem de venta
-- ============================================================

CREATE OR REPLACE FUNCTION public.stock_salida_venta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.producto_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.productos
  SET
    stock_actual = stock_actual - NEW.cantidad,
    updated_at   = now()
  WHERE id = NEW.producto_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_salida_venta ON public.ventas_items;
CREATE TRIGGER trg_stock_salida_venta
  AFTER INSERT ON public.ventas_items
  FOR EACH ROW
  EXECUTE FUNCTION public.stock_salida_venta();

-- ============================================================
-- TRIGGER: revertir stock si la venta se cancela
-- ============================================================

CREATE OR REPLACE FUNCTION public.stock_revertir_venta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.estado = 'completada' AND NEW.estado = 'cancelada' THEN
    UPDATE public.productos p
    SET
      stock_actual = p.stock_actual + vi.cantidad,
      updated_at   = now()
    FROM public.ventas_items vi
    WHERE vi.venta_id = NEW.id
      AND vi.producto_id = p.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_revertir_venta ON public.ventas;
CREATE TRIGGER trg_stock_revertir_venta
  AFTER UPDATE ON public.ventas
  FOR EACH ROW
  EXECUTE FUNCTION public.stock_revertir_venta();
