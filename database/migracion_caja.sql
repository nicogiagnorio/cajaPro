-- ============================================================
-- CajaPro — Migración: Cierre de Caja
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cierres_caja (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  comercio_id         UUID          NOT NULL REFERENCES public.comercios(id) ON DELETE CASCADE,
  usuario_apertura_id UUID          REFERENCES public.usuarios(id) ON DELETE SET NULL,
  usuario_cierre_id   UUID          REFERENCES public.usuarios(id) ON DELETE SET NULL,
  fecha_apertura      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  fecha_cierre        TIMESTAMPTZ,
  fondo_inicial       NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Totales calculados al cerrar (por método de pago)
  total_efectivo      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_debito        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_credito       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_transferencia NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_otro          NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_ventas        NUMERIC(12,2) NOT NULL DEFAULT 0,
  cantidad_ventas     INTEGER       NOT NULL DEFAULT 0,
  -- Cierre físico
  efectivo_contado    NUMERIC(12,2),
  diferencia          NUMERIC(12,2),
  notas               TEXT,
  estado              TEXT          NOT NULL DEFAULT 'abierto'
                        CHECK (estado IN ('abierto', 'cerrado')),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_cierres_caja_updated_at
  BEFORE UPDATE ON public.cierres_caja
  FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();

CREATE INDEX idx_cierres_caja_comercio ON public.cierres_caja(comercio_id);
CREATE INDEX idx_cierres_caja_estado   ON public.cierres_caja(comercio_id, estado);

ALTER TABLE public.cierres_caja ENABLE ROW LEVEL SECURITY;

-- Ambos roles pueden ver los cierres de su comercio
CREATE POLICY "cierres_ver" ON public.cierres_caja
  FOR SELECT TO authenticated
  USING (comercio_id = public.get_comercio_id_actual());

-- Cualquier usuario puede abrir/cerrar caja
CREATE POLICY "cierres_crear" ON public.cierres_caja
  FOR INSERT TO authenticated
  WITH CHECK (comercio_id = public.get_comercio_id_actual());

CREATE POLICY "cierres_actualizar" ON public.cierres_caja
  FOR UPDATE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual())
  WITH CHECK (comercio_id = public.get_comercio_id_actual());

-- Solo admin puede borrar cierres
CREATE POLICY "cierres_admin_borrar" ON public.cierres_caja
  FOR DELETE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());
