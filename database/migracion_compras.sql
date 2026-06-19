-- ============================================================
-- CajaPro — Migración: módulo de Compras
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- ============================================================
-- TABLAS
-- ============================================================

-- Cabecera de compra
CREATE TABLE IF NOT EXISTS public.compras (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  comercio_id  UUID          NOT NULL REFERENCES public.comercios(id) ON DELETE CASCADE,
  proveedor_id UUID          REFERENCES public.proveedores(id) ON DELETE SET NULL,
  usuario_id   UUID          REFERENCES public.usuarios(id) ON DELETE SET NULL,
  numero       INTEGER,
  fecha        DATE          NOT NULL DEFAULT CURRENT_DATE,
  total        NUMERIC(12,2) NOT NULL DEFAULT 0,
  metodo_pago  TEXT          NOT NULL DEFAULT 'efectivo'
                 CHECK (metodo_pago IN ('efectivo', 'transferencia', 'cheque', 'cuenta_corriente', 'otro')),
  estado       TEXT          NOT NULL DEFAULT 'recibida'
                 CHECK (estado IN ('recibida', 'cancelada')),
  notas        TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_compras_updated_at
  BEFORE UPDATE ON public.compras
  FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();

CREATE INDEX IF NOT EXISTS idx_compras_comercio   ON public.compras(comercio_id);
CREATE INDEX IF NOT EXISTS idx_compras_fecha      ON public.compras(comercio_id, fecha);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor  ON public.compras(proveedor_id);

-- Líneas de la compra
CREATE TABLE IF NOT EXISTS public.compras_items (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id        UUID          NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
  producto_id      UUID          REFERENCES public.productos(id) ON DELETE SET NULL,
  nombre_producto  TEXT          NOT NULL,  -- snapshot del nombre al momento de la compra
  cantidad         NUMERIC(12,3) NOT NULL DEFAULT 1,
  precio_unitario  NUMERIC(12,2) NOT NULL,
  subtotal         NUMERIC(12,2) NOT NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compras_items_compra   ON public.compras_items(compra_id);
CREATE INDEX IF NOT EXISTS idx_compras_items_producto ON public.compras_items(producto_id);

-- ============================================================
-- TRIGGER: actualizar stock y precio de costo al recibir compra
-- Se dispara al insertar cada ítem. Si la compra se cancela,
-- el segundo trigger revierte el movimiento de stock.
-- ============================================================

CREATE OR REPLACE FUNCTION public.stock_entrada_compra()
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
    stock_actual  = stock_actual + NEW.cantidad,
    precio_costo  = NEW.precio_unitario,  -- actualiza al último precio pagado
    updated_at    = now()
  WHERE id = NEW.producto_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stock_entrada_compra
  AFTER INSERT ON public.compras_items
  FOR EACH ROW
  EXECUTE FUNCTION public.stock_entrada_compra();

-- Revertir stock si la compra se cancela
CREATE OR REPLACE FUNCTION public.stock_revertir_compra()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo actuar cuando el estado pasa de 'recibida' a 'cancelada'
  IF OLD.estado = 'recibida' AND NEW.estado = 'cancelada' THEN
    UPDATE public.productos p
    SET
      stock_actual = p.stock_actual - ci.cantidad,
      updated_at   = now()
    FROM public.compras_items ci
    WHERE ci.compra_id = NEW.id
      AND ci.producto_id = p.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stock_revertir_compra
  AFTER UPDATE ON public.compras
  FOR EACH ROW
  EXECUTE FUNCTION public.stock_revertir_compra();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.compras       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_items ENABLE ROW LEVEL SECURITY;

-- compras
CREATE POLICY "compras_ver" ON public.compras
  FOR SELECT TO authenticated
  USING (comercio_id = public.get_comercio_id_actual());

CREATE POLICY "compras_crear" ON public.compras
  FOR INSERT TO authenticated
  WITH CHECK (comercio_id = public.get_comercio_id_actual());

CREATE POLICY "compras_admin_modificar" ON public.compras
  FOR UPDATE TO authenticated
  USING  (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual())
  WITH CHECK (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());

CREATE POLICY "compras_admin_borrar" ON public.compras
  FOR DELETE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());

-- compras_items: hereda acceso de su compra padre
CREATE POLICY "compras_items_ver" ON public.compras_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.compras c
      WHERE c.id = compra_id
        AND c.comercio_id = public.get_comercio_id_actual()
    )
  );

CREATE POLICY "compras_items_crear" ON public.compras_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.compras c
      WHERE c.id = compra_id
        AND c.comercio_id = public.get_comercio_id_actual()
    )
  );

CREATE POLICY "compras_items_admin_borrar" ON public.compras_items
  FOR DELETE TO authenticated
  USING (
    public.es_admin_actual() AND
    EXISTS (
      SELECT 1 FROM public.compras c
      WHERE c.id = compra_id
        AND c.comercio_id = public.get_comercio_id_actual()
    )
  );
