-- ============================================================
-- CajaPro — Migración: módulos habilitados por comercio
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

ALTER TABLE public.comercios
  ADD COLUMN IF NOT EXISTS modulos JSONB NOT NULL DEFAULT
    '{"ventas":true,"caja":true,"compras":true,"gastos":true,"clientes":true,"reportes":true}'::jsonb;
