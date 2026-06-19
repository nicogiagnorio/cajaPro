-- ============================================================
-- Migración: Campos de Facturación Electrónica ARCA en ventas
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- Nota: cliente_id ya existe (migracion_clientes.sql)
--       tipo ya existe    (migracion_tipos.sql)
ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS cae             TEXT,
  ADD COLUMN IF NOT EXISTS cae_vencimiento DATE,
  ADD COLUMN IF NOT EXISTS tipo_factura    TEXT CHECK (tipo_factura IN ('A', 'B', 'C')),
  ADD COLUMN IF NOT EXISTS nro_factura     INTEGER,
  ADD COLUMN IF NOT EXISTS punto_venta     INTEGER;

-- Índice para buscar facturas por CAE
CREATE INDEX IF NOT EXISTS idx_ventas_cae ON ventas(cae) WHERE cae IS NOT NULL;

-- Comentarios descriptivos
COMMENT ON COLUMN ventas.cae             IS 'Código de Autorización Electrónico emitido por ARCA';
COMMENT ON COLUMN ventas.cae_vencimiento IS 'Fecha de vencimiento del CAE';
COMMENT ON COLUMN ventas.tipo_factura    IS 'Tipo de comprobante: A, B o C';
COMMENT ON COLUMN ventas.nro_factura     IS 'Número de comprobante autorizado por ARCA';
COMMENT ON COLUMN ventas.punto_venta     IS 'Punto de Venta habilitado en ARCA';
