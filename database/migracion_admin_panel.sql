-- =============================================================
-- CajaPro — Migración: Panel de administrador (finanzas propias)
-- Tablas exclusivas del superadmin: cajapro_cobros, cajapro_gastos
-- NO ejecutar automáticamente — correr manualmente en Supabase SQL Editor
-- =============================================================

-- ─── Tabla: cobros a clientes ─────────────────────────────────
CREATE TABLE IF NOT EXISTS cajapro_cobros (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  comercio_id UUID        REFERENCES comercios(id) ON DELETE SET NULL,
  tipo        TEXT        NOT NULL CHECK (tipo IN ('implementacion', 'abono_mensual', 'mejora')),
  monto       NUMERIC(12,2) NOT NULL CHECK (monto >= 0),
  fecha       DATE        NOT NULL,
  observacion TEXT,
  estado      TEXT        NOT NULL DEFAULT 'pagado' CHECK (estado IN ('pagado', 'pendiente')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Tabla: gastos operativos propios de CajaPro ──────────────
CREATE TABLE IF NOT EXISTS cajapro_gastos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion TEXT        NOT NULL,
  monto       NUMERIC(12,2) NOT NULL CHECK (monto >= 0),
  categoria   TEXT        NOT NULL CHECK (categoria IN ('suscripciones', 'infraestructura', 'marketing', 'otros')),
  fecha       DATE        NOT NULL,
  metodo_pago TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── RLS: habilitar seguridad por fila ────────────────────────
ALTER TABLE cajapro_cobros ENABLE ROW LEVEL SECURITY;
ALTER TABLE cajapro_gastos ENABLE ROW LEVEL SECURITY;

-- ─── Policies: solo el superadmin puede operar ────────────────
-- La política compara el auth.uid() con el id del usuario
-- que tiene rol = 'superadmin' en la tabla usuarios.
-- Esto no requiere hardcodear ningún UUID.

-- cobros: SELECT
CREATE POLICY "cajapro_cobros_superadmin_select"
  ON cajapro_cobros FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM usuarios WHERE rol = 'superadmin' AND activo = true
    )
  );

-- cobros: INSERT
CREATE POLICY "cajapro_cobros_superadmin_insert"
  ON cajapro_cobros FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT auth_user_id FROM usuarios WHERE rol = 'superadmin' AND activo = true
    )
  );

-- cobros: UPDATE
CREATE POLICY "cajapro_cobros_superadmin_update"
  ON cajapro_cobros FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM usuarios WHERE rol = 'superadmin' AND activo = true
    )
  );

-- cobros: DELETE
CREATE POLICY "cajapro_cobros_superadmin_delete"
  ON cajapro_cobros FOR DELETE
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM usuarios WHERE rol = 'superadmin' AND activo = true
    )
  );

-- gastos: SELECT
CREATE POLICY "cajapro_gastos_superadmin_select"
  ON cajapro_gastos FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM usuarios WHERE rol = 'superadmin' AND activo = true
    )
  );

-- gastos: INSERT
CREATE POLICY "cajapro_gastos_superadmin_insert"
  ON cajapro_gastos FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT auth_user_id FROM usuarios WHERE rol = 'superadmin' AND activo = true
    )
  );

-- gastos: UPDATE
CREATE POLICY "cajapro_gastos_superadmin_update"
  ON cajapro_gastos FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM usuarios WHERE rol = 'superadmin' AND activo = true
    )
  );

-- gastos: DELETE
CREATE POLICY "cajapro_gastos_superadmin_delete"
  ON cajapro_gastos FOR DELETE
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM usuarios WHERE rol = 'superadmin' AND activo = true
    )
  );

-- ─── Índices para performance ──────────────────────────────────
CREATE INDEX IF NOT EXISTS cajapro_cobros_comercio_id_idx ON cajapro_cobros(comercio_id);
CREATE INDEX IF NOT EXISTS cajapro_cobros_fecha_idx       ON cajapro_cobros(fecha DESC);
CREATE INDEX IF NOT EXISTS cajapro_cobros_estado_idx      ON cajapro_cobros(estado);
CREATE INDEX IF NOT EXISTS cajapro_gastos_fecha_idx       ON cajapro_gastos(fecha DESC);
CREATE INDEX IF NOT EXISTS cajapro_gastos_categoria_idx   ON cajapro_gastos(categoria);
