-- ============================================================
-- CajaPro — Migración: tema de color por comercio
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================
ALTER TABLE public.comercios
  ADD COLUMN IF NOT EXISTS color_tema TEXT NOT NULL DEFAULT 'azul';
