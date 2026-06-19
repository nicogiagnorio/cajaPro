-- ============================================================
-- CajaPro — Esquema de base de datos
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- Extensión para UUIDs (ya viene habilitada en Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- FUNCIÓN: actualizar updated_at automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- COMERCIOS
-- Un registro por cada negocio cliente (arquitectura multi-tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS comercios (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT        NOT NULL,
  domicilio   TEXT,
  telefono    TEXT,
  email       TEXT,
  cuit        TEXT,
  activo      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_comercios_updated_at
  BEFORE UPDATE ON comercios
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

-- ============================================================
-- USUARIOS
-- Vinculados al sistema de auth de Supabase (auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  comercio_id   UUID  NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  auth_user_id  UUID  UNIQUE,           -- UID de Supabase Auth
  nombre        TEXT  NOT NULL,
  email         TEXT  NOT NULL UNIQUE,
  rol           TEXT  NOT NULL DEFAULT 'cajero' CHECK (rol IN ('admin', 'cajero')),
  activo        BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE INDEX idx_usuarios_comercio ON usuarios(comercio_id);

-- ============================================================
-- CATEGORÍAS DE PRODUCTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  comercio_id   UUID  NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  nombre        TEXT  NOT NULL,
  descripcion   TEXT,
  activo        BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_categorias_updated_at
  BEFORE UPDATE ON categorias
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE INDEX idx_categorias_comercio ON categorias(comercio_id);

-- ============================================================
-- PROVEEDORES
-- ============================================================
CREATE TABLE IF NOT EXISTS proveedores (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  comercio_id   UUID  NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  nombre        TEXT  NOT NULL,
  contacto      TEXT,
  telefono      TEXT,
  email         TEXT,
  direccion     TEXT,
  activo        BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_proveedores_updated_at
  BEFORE UPDATE ON proveedores
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE INDEX idx_proveedores_comercio ON proveedores(comercio_id);

-- ============================================================
-- PRODUCTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS productos (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  comercio_id     UUID          NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  categoria_id    UUID          REFERENCES categorias(id) ON DELETE SET NULL,
  proveedor_id    UUID          REFERENCES proveedores(id) ON DELETE SET NULL,
  codigo_barras   TEXT,
  nombre          TEXT          NOT NULL,
  descripcion     TEXT,
  precio_venta    NUMERIC(12,2) NOT NULL DEFAULT 0,
  precio_costo    NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_actual    NUMERIC(12,3) NOT NULL DEFAULT 0,
  stock_minimo    NUMERIC(12,3) NOT NULL DEFAULT 0,
  unidad          TEXT          NOT NULL DEFAULT 'unidad',
  activo          BOOLEAN       NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- El código de barras es único dentro del mismo comercio
  UNIQUE (comercio_id, codigo_barras)
);

CREATE TRIGGER trg_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE INDEX idx_productos_comercio    ON productos(comercio_id);
CREATE INDEX idx_productos_categoria   ON productos(categoria_id);
CREATE INDEX idx_productos_codigo      ON productos(comercio_id, codigo_barras);

-- ============================================================
-- VENTAS (cabecera)
-- ============================================================
CREATE TABLE IF NOT EXISTS ventas (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  comercio_id     UUID          NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  usuario_id      UUID          REFERENCES usuarios(id) ON DELETE SET NULL,
  numero          INTEGER,      -- número correlativo por comercio (se asigna con secuencia)
  fecha           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  descuento       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  metodo_pago     TEXT          NOT NULL DEFAULT 'efectivo'
                    CHECK (metodo_pago IN ('efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'otro')),
  estado          TEXT          NOT NULL DEFAULT 'completada'
                    CHECK (estado IN ('completada', 'cancelada', 'pendiente')),
  notas           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_ventas_updated_at
  BEFORE UPDATE ON ventas
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE INDEX idx_ventas_comercio ON ventas(comercio_id);
CREATE INDEX idx_ventas_fecha    ON ventas(comercio_id, fecha);
CREATE INDEX idx_ventas_usuario  ON ventas(usuario_id);

-- ============================================================
-- VENTAS_ITEMS (líneas de cada venta)
-- Se guarda snapshot del nombre y precio para que el historial
-- no cambie si el producto se modifica después
-- ============================================================
CREATE TABLE IF NOT EXISTS ventas_items (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id          UUID          NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id       UUID          REFERENCES productos(id) ON DELETE SET NULL,
  nombre_producto   TEXT          NOT NULL,   -- snapshot al momento de la venta
  precio_unitario   NUMERIC(12,2) NOT NULL,
  cantidad          NUMERIC(12,3) NOT NULL DEFAULT 1,
  subtotal          NUMERIC(12,2) NOT NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_ventas_items_venta    ON ventas_items(venta_id);
CREATE INDEX idx_ventas_items_producto ON ventas_items(producto_id);

-- ============================================================
-- CATEGORÍAS DE GASTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias_gastos (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  comercio_id   UUID  NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  nombre        TEXT  NOT NULL,
  descripcion   TEXT,
  activo        BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_categorias_gastos_updated_at
  BEFORE UPDATE ON categorias_gastos
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE INDEX idx_categorias_gastos_comercio ON categorias_gastos(comercio_id);

-- ============================================================
-- GASTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS gastos (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  comercio_id     UUID          NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  categoria_id    UUID          REFERENCES categorias_gastos(id) ON DELETE SET NULL,
  usuario_id      UUID          REFERENCES usuarios(id) ON DELETE SET NULL,
  descripcion     TEXT          NOT NULL,
  monto           NUMERIC(12,2) NOT NULL,
  fecha           DATE          NOT NULL DEFAULT CURRENT_DATE,
  comprobante     TEXT,         -- número de factura o recibo
  notas           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_gastos_updated_at
  BEFORE UPDATE ON gastos
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE INDEX idx_gastos_comercio  ON gastos(comercio_id);
CREATE INDEX idx_gastos_fecha     ON gastos(comercio_id, fecha);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Habilitado pero sin políticas activas por ahora.
-- En Sprint 2 se definen las políticas por rol/comercio.
-- ============================================================
ALTER TABLE comercios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias        ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos            ENABLE ROW LEVEL SECURITY;

-- Política temporal: acceso total para usuarios autenticados (reemplazar en Sprint 2)
CREATE POLICY "acceso_total_autenticados" ON comercios         FOR ALL TO authenticated USING (true);
CREATE POLICY "acceso_total_autenticados" ON usuarios          FOR ALL TO authenticated USING (true);
CREATE POLICY "acceso_total_autenticados" ON categorias        FOR ALL TO authenticated USING (true);
CREATE POLICY "acceso_total_autenticados" ON proveedores       FOR ALL TO authenticated USING (true);
CREATE POLICY "acceso_total_autenticados" ON productos         FOR ALL TO authenticated USING (true);
CREATE POLICY "acceso_total_autenticados" ON ventas            FOR ALL TO authenticated USING (true);
CREATE POLICY "acceso_total_autenticados" ON ventas_items      FOR ALL TO authenticated USING (true);
CREATE POLICY "acceso_total_autenticados" ON categorias_gastos FOR ALL TO authenticated USING (true);
CREATE POLICY "acceso_total_autenticados" ON gastos            FOR ALL TO authenticated USING (true);
