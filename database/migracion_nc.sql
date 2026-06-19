-- ─────────────────────────────────────────────────────────────────
-- Migración: columnas para Notas de Crédito electrónicas en ventas
-- Ejecutar en Supabase → SQL Editor
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS nc_cae           TEXT,
  ADD COLUMN IF NOT EXISTS nc_nro_factura   INTEGER,
  ADD COLUMN IF NOT EXISTS nc_tipo_factura  TEXT CHECK (nc_tipo_factura IN ('A','B','C')),
  ADD COLUMN IF NOT EXISTS nc_punto_venta   INTEGER,
  ADD COLUMN IF NOT EXISTS nc_vencimiento   DATE,
  ADD COLUMN IF NOT EXISTS nc_fecha         TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN ventas.nc_cae          IS 'CAE de la Nota de Crédito electrónica (ARCA/AFIP)';
COMMENT ON COLUMN ventas.nc_nro_factura  IS 'Número del comprobante NC';
COMMENT ON COLUMN ventas.nc_tipo_factura IS 'Tipo del comprobante NC: A, B o C';
COMMENT ON COLUMN ventas.nc_punto_venta  IS 'Punto de venta del comprobante NC';
COMMENT ON COLUMN ventas.nc_vencimiento  IS 'Fecha de vencimiento del CAE de la NC';
COMMENT ON COLUMN ventas.nc_fecha        IS 'Fecha y hora de emisión de la NC';
