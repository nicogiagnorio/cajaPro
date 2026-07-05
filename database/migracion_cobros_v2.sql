-- =============================================================
-- CajaPro — Migración: Cobros v2 — columnas de pago
-- Ejecutar en: Supabase > SQL Editor
-- Agrega las columnas necesarias para registrar el pago de un cobro:
-- fecha_pago, medio_pago, comprobante, observacion_pago
-- =============================================================

ALTER TABLE cajapro_cobros
  ADD COLUMN IF NOT EXISTS fecha_pago       DATE,
  ADD COLUMN IF NOT EXISTS medio_pago       TEXT,
  ADD COLUMN IF NOT EXISTS comprobante      TEXT,
  ADD COLUMN IF NOT EXISTS observacion_pago TEXT;

-- Verificar que la columna estado exista con los valores correctos
-- (ya debería existir de la migración anterior, esto es por las dudas)
ALTER TABLE cajapro_cobros
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'pagado'));

-- Índice para búsquedas por fecha de pago
CREATE INDEX IF NOT EXISTS cajapro_cobros_fecha_pago_idx ON cajapro_cobros(fecha_pago DESC);
