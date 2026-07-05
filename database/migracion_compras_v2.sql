-- ============================================================
-- CajaPro — Migración Compras v2: estados independientes
-- Ejecutar en Supabase > SQL Editor DESPUÉS de migracion_compras.sql
-- ============================================================

-- 1. Quitar trigger viejo que actualizaba stock automáticamente
--    (ahora el stock se actualiza manualmente al marcar "recibida")
DROP TRIGGER IF EXISTS trg_stock_entrada_compra ON public.compras_items;
DROP TRIGGER IF EXISTS trg_stock_revertir_compra ON public.compras;

-- 2. Columnas de estado de recepción
ALTER TABLE public.compras
  ADD COLUMN IF NOT EXISTS estado_recepcion TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado_recepcion IN ('pendiente', 'recibida')),
  ADD COLUMN IF NOT EXISTS fecha_recepcion  DATE;

-- 3. Columnas de factura del proveedor
ALTER TABLE public.compras
  ADD COLUMN IF NOT EXISTS facturada              BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS estado_factura         TEXT NOT NULL DEFAULT 'sin_factura'
    CHECK (estado_factura IN ('sin_factura', 'con_factura')),
  ADD COLUMN IF NOT EXISTS numero_factura         TEXT,
  ADD COLUMN IF NOT EXISTS tipo_factura_proveedor TEXT,
  ADD COLUMN IF NOT EXISTS nro_factura_proveedor  TEXT,
  ADD COLUMN IF NOT EXISTS fecha_factura          DATE;

-- 4. Columnas de estado de pago
ALTER TABLE public.compras
  ADD COLUMN IF NOT EXISTS pagada     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS estado_pago TEXT NOT NULL DEFAULT 'pagada'
    CHECK (estado_pago IN ('pendiente', 'pagada')),
  ADD COLUMN IF NOT EXISTS fecha_pago DATE;

-- 5. Para compras ya existentes (tipo detallada), marcarlas como recibidas
--    ya que el trigger viejo ya les actualizó el stock
UPDATE public.compras
SET estado_recepcion = 'recibida', fecha_recepcion = created_at::date
WHERE estado_recepcion = 'pendiente'
  AND tipo = 'detallada';

-- Las compras rápidas siempre están recibidas
UPDATE public.compras
SET estado_recepcion = 'recibida'
WHERE tipo = 'rapida';
