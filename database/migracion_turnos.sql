-- ============================================================
-- Migración: Módulo de Turnos
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- ── Profesionales ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profesionales (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comercio_id   UUID NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  especialidad  TEXT,
  email         TEXT,
  telefono      TEXT,
  color         TEXT NOT NULL DEFAULT '#3B82F6',
  google_calendar_id TEXT,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profesionales_comercio ON profesionales(comercio_id);

-- ── Servicios de Turnos ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS servicios_turnos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comercio_id       UUID NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  nombre            TEXT NOT NULL,
  duracion_minutos  INTEGER NOT NULL DEFAULT 30,
  precio            NUMERIC(12,2),
  descripcion       TEXT,
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_servicios_turnos_comercio ON servicios_turnos(comercio_id);

-- ── Horarios disponibles (por profesional y día de la semana) ─
CREATE TABLE IF NOT EXISTS horarios_disponibles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profesional_id  UUID NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
  dia_semana      INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Dom … 6=Sáb
  hora_inicio     TIME NOT NULL,
  hora_fin        TIME NOT NULL,
  activo          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_horarios_profesional ON horarios_disponibles(profesional_id);

-- ── Turnos (citas) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS turnos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comercio_id       UUID NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  profesional_id    UUID NOT NULL REFERENCES profesionales(id),
  servicio_id       UUID REFERENCES servicios_turnos(id),
  cliente_id        UUID REFERENCES clientes(id),
  cliente_nombre    TEXT,
  cliente_telefono  TEXT,
  fecha             DATE NOT NULL,
  hora_inicio       TIME NOT NULL,
  hora_fin          TIME NOT NULL,
  estado            TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','confirmado','cancelado','completado')),
  notas             TEXT,
  google_event_id   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turnos_comercio    ON turnos(comercio_id);
CREATE INDEX IF NOT EXISTS idx_turnos_fecha       ON turnos(fecha);
CREATE INDEX IF NOT EXISTS idx_turnos_profesional ON turnos(profesional_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE profesionales      ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios_turnos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE horarios_disponibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos              ENABLE ROW LEVEL SECURITY;

-- Profesionales: solo usuarios del mismo comercio
CREATE POLICY "profesionales_comercio" ON profesionales
  FOR ALL USING (
    comercio_id = (
      SELECT comercio_id FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );

-- Servicios de turnos
CREATE POLICY "servicios_turnos_comercio" ON servicios_turnos
  FOR ALL USING (
    comercio_id = (
      SELECT comercio_id FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );

-- Horarios disponibles (a través del profesional)
CREATE POLICY "horarios_disponibles_comercio" ON horarios_disponibles
  FOR ALL USING (
    profesional_id IN (
      SELECT id FROM profesionales
      WHERE comercio_id = (
        SELECT comercio_id FROM usuarios WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Turnos
CREATE POLICY "turnos_comercio" ON turnos
  FOR ALL USING (
    comercio_id = (
      SELECT comercio_id FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );

-- Comentarios
COMMENT ON TABLE profesionales       IS 'Profesionales/prestadores de servicios';
COMMENT ON TABLE servicios_turnos    IS 'Tipos de servicios con duración y precio';
COMMENT ON TABLE horarios_disponibles IS 'Disponibilidad horaria por profesional y día';
COMMENT ON TABLE turnos              IS 'Citas/turnos agendados';
