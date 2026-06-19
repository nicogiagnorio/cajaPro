-- ============================================================
-- CajaPro — Migración: columnas tipo y categoria_id
-- Ejecutar en: Supabase > SQL Editor
-- Requiere: schema.sql y migracion_compras.sql previos
-- ============================================================

-- Diferencia venta detallada (descuenta stock) vs. rápida (solo registra)
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'detallada'
    CHECK (tipo IN ('detallada', 'rapida'));

-- Categoría opcional en ventas rápidas (reutiliza las del inventario)
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS categoria_id UUID
    REFERENCES public.categorias(id) ON DELETE SET NULL;

-- Diferencia compra detallada (aumenta stock) vs. rápida (solo registra)
ALTER TABLE public.compras
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'detallada'
    CHECK (tipo IN ('detallada', 'rapida'));

-- Categoría opcional en compras rápidas
ALTER TABLE public.compras
  ADD COLUMN IF NOT EXISTS categoria_id UUID
    REFERENCES public.categorias(id) ON DELETE SET NULL;
