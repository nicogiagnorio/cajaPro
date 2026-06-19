-- ============================================================
-- CajaPro — Migración: módulo de Clientes
-- Ejecutar en: Supabase > SQL Editor
-- Requiere: schema.sql y rls_policies.sql previos
-- ============================================================

-- ============================================================
-- TABLA: clientes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clientes (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  comercio_id UUID         NOT NULL REFERENCES public.comercios(id) ON DELETE CASCADE,
  nombre      TEXT         NOT NULL,
  telefono    TEXT,
  email       TEXT,
  dni         TEXT,
  notas       TEXT,
  activo      BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();

CREATE INDEX IF NOT EXISTS idx_clientes_comercio ON public.clientes(comercio_id);

-- RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_ver" ON public.clientes
  FOR SELECT TO authenticated
  USING (comercio_id = public.get_comercio_id_actual());

CREATE POLICY "clientes_crear" ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (comercio_id = public.get_comercio_id_actual());

CREATE POLICY "clientes_editar" ON public.clientes
  FOR UPDATE TO authenticated
  USING  (comercio_id = public.get_comercio_id_actual())
  WITH CHECK (comercio_id = public.get_comercio_id_actual());

CREATE POLICY "clientes_eliminar" ON public.clientes
  FOR DELETE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual());

-- ============================================================
-- COLUMNA: ventas.cliente_id (FK opcional a clientes)
-- ============================================================
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS cliente_id UUID
    REFERENCES public.clientes(id) ON DELETE SET NULL;
