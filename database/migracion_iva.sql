-- ─── Migración: IVA por producto ───────────────────────────────────────────
-- Ejecutar en: Supabase Dashboard → SQL Editor

-- 1. Agregar columna alicuota_iva a productos (default 21%)
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS alicuota_iva NUMERIC(5,2) NOT NULL DEFAULT 21;

-- 2. También guardar alicuota_iva en ventas_items (para historial)
ALTER TABLE ventas_items
  ADD COLUMN IF NOT EXISTS alicuota_iva NUMERIC(5,2) NOT NULL DEFAULT 21;

-- 3. Verificar
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name IN ('productos', 'ventas_items')
  AND column_name = 'alicuota_iva';
