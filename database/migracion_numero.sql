-- ============================================================
-- CajaPro — Migración: número correlativo por comercio
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- Asigna un número correlativo por comercio justo antes del INSERT.
-- Usa SELECT MAX + 1 (suficiente para un POS de comercio de barrio).
CREATE OR REPLACE FUNCTION public.asignar_numero_venta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(MAX(numero), 0) + 1
  INTO NEW.numero
  FROM public.ventas
  WHERE comercio_id = NEW.comercio_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asignar_numero_venta ON public.ventas;
CREATE TRIGGER trg_asignar_numero_venta
  BEFORE INSERT ON public.ventas
  FOR EACH ROW
  WHEN (NEW.numero IS NULL)
  EXECUTE FUNCTION public.asignar_numero_venta();

-- Mismo trigger para compras
CREATE OR REPLACE FUNCTION public.asignar_numero_compra()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(MAX(numero), 0) + 1
  INTO NEW.numero
  FROM public.compras
  WHERE comercio_id = NEW.comercio_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asignar_numero_compra ON public.compras;
CREATE TRIGGER trg_asignar_numero_compra
  BEFORE INSERT ON public.compras
  FOR EACH ROW
  WHEN (NEW.numero IS NULL)
  EXECUTE FUNCTION public.asignar_numero_compra();
