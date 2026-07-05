-- ============================================================
-- CajaPro — MIGRACIÓN COMPLETA (orden correcto)
-- Pegar en Supabase > SQL Editor y ejecutar de una vez
-- ============================================================



-- ============================================================
-- [01] schema.sql
--     Base: tablas principales + RLS básico
-- ============================================================

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

DROP TRIGGER IF EXISTS trg_comercios_updated_at ON comercios;
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

DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON usuarios;
CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE INDEX IF NOT EXISTS idx_usuarios_comercio ON usuarios(comercio_id);

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

DROP TRIGGER IF EXISTS trg_categorias_updated_at ON categorias;
CREATE TRIGGER trg_categorias_updated_at
  BEFORE UPDATE ON categorias
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE INDEX IF NOT EXISTS idx_categorias_comercio ON categorias(comercio_id);

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

DROP TRIGGER IF EXISTS trg_proveedores_updated_at ON proveedores;
CREATE TRIGGER trg_proveedores_updated_at
  BEFORE UPDATE ON proveedores
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE INDEX IF NOT EXISTS idx_proveedores_comercio ON proveedores(comercio_id);

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

DROP TRIGGER IF EXISTS trg_productos_updated_at ON productos;
CREATE TRIGGER trg_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE INDEX IF NOT EXISTS idx_productos_comercio    ON productos(comercio_id);
CREATE INDEX IF NOT EXISTS idx_productos_categoria   ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_codigo      ON productos(comercio_id, codigo_barras);

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

DROP TRIGGER IF EXISTS trg_ventas_updated_at ON ventas;
CREATE TRIGGER trg_ventas_updated_at
  BEFORE UPDATE ON ventas
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE INDEX IF NOT EXISTS idx_ventas_comercio ON ventas(comercio_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha    ON ventas(comercio_id, fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_usuario  ON ventas(usuario_id);

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

CREATE INDEX IF NOT EXISTS idx_ventas_items_venta    ON ventas_items(venta_id);
CREATE INDEX IF NOT EXISTS idx_ventas_items_producto ON ventas_items(producto_id);

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

DROP TRIGGER IF EXISTS trg_categorias_gastos_updated_at ON categorias_gastos;
CREATE TRIGGER trg_categorias_gastos_updated_at
  BEFORE UPDATE ON categorias_gastos
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE INDEX IF NOT EXISTS idx_categorias_gastos_comercio ON categorias_gastos(comercio_id);

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

DROP TRIGGER IF EXISTS trg_gastos_updated_at ON gastos;
CREATE TRIGGER trg_gastos_updated_at
  BEFORE UPDATE ON gastos
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE INDEX IF NOT EXISTS idx_gastos_comercio  ON gastos(comercio_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha     ON gastos(comercio_id, fecha);

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
DO $$ BEGIN
  CREATE POLICY "acceso_total_autenticados" ON comercios         FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "acceso_total_autenticados" ON usuarios          FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "acceso_total_autenticados" ON categorias        FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "acceso_total_autenticados" ON proveedores       FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "acceso_total_autenticados" ON productos         FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "acceso_total_autenticados" ON ventas            FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "acceso_total_autenticados" ON ventas_items      FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "acceso_total_autenticados" ON categorias_gastos FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "acceso_total_autenticados" ON gastos            FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- [02] rls_policies.sql
--     Políticas RLS por comercio
-- ============================================================

-- ============================================================
-- CajaPro — Políticas RLS (Row Level Security)
-- Ejecutar DESPUÉS de schema.sql en: Supabase > SQL Editor
-- Reemplaza las políticas temporales del Sprint 1
-- ============================================================

-- ============================================================
-- PASO 1: Eliminar políticas temporales del Sprint 1
-- ============================================================
DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'comercios','usuarios','categorias','proveedores','productos',
    'ventas','ventas_items','categorias_gastos','gastos'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "acceso_total_autenticados" ON public.%I', t
    );
  END LOOP;
END $$;

-- ============================================================
-- PASO 2: Funciones auxiliares SECURITY DEFINER
-- Corren con privilegios elevados y se cachean por query (STABLE)
-- evitando un hit a la base por cada fila evaluada
-- ============================================================

-- Retorna el comercio_id del usuario autenticado activo
CREATE OR REPLACE FUNCTION public.get_comercio_id_actual()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT comercio_id
  FROM public.usuarios
  WHERE auth_user_id = auth.uid()
    AND activo = true
  LIMIT 1;
$$;

-- Retorna true si el usuario autenticado tiene rol 'admin'
CREATE OR REPLACE FUNCTION public.es_admin_actual()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT rol = 'admin'
     FROM public.usuarios
     WHERE auth_user_id = auth.uid()
       AND activo = true
     LIMIT 1),
    false
  );
$$;

-- ============================================================
-- PASO 3: Políticas por tabla
-- ============================================================

-- ----------------------------------------------------------
-- COMERCIOS
-- SELECT: cada usuario ve solo su propio comercio
-- UPDATE: solo el admin puede modificar datos del comercio
-- INSERT/DELETE: bloqueado (se gestiona por RPC)
-- ----------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "comercio_ver_propio" ON comercios
  FOR SELECT TO authenticated
  USING (id = public.get_comercio_id_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "comercio_admin_actualizar" ON comercios
  FOR UPDATE TO authenticated
  USING (id = public.get_comercio_id_actual() AND public.es_admin_actual())
  WITH CHECK (id = public.get_comercio_id_actual() AND public.es_admin_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------
-- USUARIOS
-- SELECT: cualquier miembro del comercio ve a los demás
-- INSERT: solo admin puede crear invitaciones (nuevos usuarios)
-- UPDATE: solo admin puede cambiar rol/estado; el propio usuario puede ver su perfil
-- DELETE: bloqueado (se usa activo=false en lugar de borrar)
-- ----------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "usuarios_ver_del_comercio" ON usuarios
  FOR SELECT TO authenticated
  USING (comercio_id = public.get_comercio_id_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "usuarios_admin_crear" ON usuarios
  FOR INSERT TO authenticated
  WITH CHECK (
    comercio_id = public.get_comercio_id_actual()
    AND public.es_admin_actual()
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "usuarios_admin_modificar" ON usuarios
  FOR UPDATE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual())
  WITH CHECK (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------
-- CATEGORÍAS
-- Admin: CRUD completo | Cajero: solo lectura
-- ----------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "categorias_ver" ON categorias
  FOR SELECT TO authenticated
  USING (comercio_id = public.get_comercio_id_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "categorias_admin_crear" ON categorias
  FOR INSERT TO authenticated
  WITH CHECK (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "categorias_admin_modificar" ON categorias
  FOR UPDATE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual())
  WITH CHECK (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "categorias_admin_borrar" ON categorias
  FOR DELETE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------
-- PROVEEDORES
-- Admin: CRUD completo | Cajero: solo lectura
-- ----------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "proveedores_ver" ON proveedores
  FOR SELECT TO authenticated
  USING (comercio_id = public.get_comercio_id_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "proveedores_admin_crear" ON proveedores
  FOR INSERT TO authenticated
  WITH CHECK (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "proveedores_admin_modificar" ON proveedores
  FOR UPDATE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual())
  WITH CHECK (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "proveedores_admin_borrar" ON proveedores
  FOR DELETE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------
-- PRODUCTOS
-- Ambos roles pueden crear/editar productos (gestión de stock)
-- Solo admin puede borrar
-- ----------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "productos_ver" ON productos
  FOR SELECT TO authenticated
  USING (comercio_id = public.get_comercio_id_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "productos_crear" ON productos
  FOR INSERT TO authenticated
  WITH CHECK (comercio_id = public.get_comercio_id_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "productos_modificar" ON productos
  FOR UPDATE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual())
  WITH CHECK (comercio_id = public.get_comercio_id_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "productos_admin_borrar" ON productos
  FOR DELETE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------
-- VENTAS
-- Ambos roles pueden crear ventas
-- Solo admin puede cancelar/eliminar
-- ----------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "ventas_ver" ON ventas
  FOR SELECT TO authenticated
  USING (comercio_id = public.get_comercio_id_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ventas_crear" ON ventas
  FOR INSERT TO authenticated
  WITH CHECK (comercio_id = public.get_comercio_id_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ventas_admin_modificar" ON ventas
  FOR UPDATE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual())
  WITH CHECK (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ventas_admin_borrar" ON ventas
  FOR DELETE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------
-- VENTAS_ITEMS
-- Sigue el acceso de su venta padre
-- ----------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "ventas_items_ver" ON ventas_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ventas v
      WHERE v.id = venta_id
        AND v.comercio_id = public.get_comercio_id_actual()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ventas_items_crear" ON ventas_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ventas v
      WHERE v.id = venta_id
        AND v.comercio_id = public.get_comercio_id_actual()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ventas_items_admin_borrar" ON ventas_items
  FOR DELETE TO authenticated
  USING (
    public.es_admin_actual() AND
    EXISTS (
      SELECT 1 FROM ventas v
      WHERE v.id = venta_id
        AND v.comercio_id = public.get_comercio_id_actual()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------
-- CATEGORÍAS DE GASTOS
-- Admin: CRUD completo | Cajero: solo lectura
-- ----------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "categorias_gastos_ver" ON categorias_gastos
  FOR SELECT TO authenticated
  USING (comercio_id = public.get_comercio_id_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "categorias_gastos_admin_crear" ON categorias_gastos
  FOR INSERT TO authenticated
  WITH CHECK (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "categorias_gastos_admin_modificar" ON categorias_gastos
  FOR UPDATE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual())
  WITH CHECK (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "categorias_gastos_admin_borrar" ON categorias_gastos
  FOR DELETE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------
-- GASTOS
-- Ambos roles pueden cargar gastos
-- Solo admin puede editar/borrar
-- ----------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "gastos_ver" ON gastos
  FOR SELECT TO authenticated
  USING (comercio_id = public.get_comercio_id_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "gastos_crear" ON gastos
  FOR INSERT TO authenticated
  WITH CHECK (comercio_id = public.get_comercio_id_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "gastos_admin_modificar" ON gastos
  FOR UPDATE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual())
  WITH CHECK (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "gastos_admin_borrar" ON gastos
  FOR DELETE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- [03] funciones.sql
--     Columna rubro en comercios
-- ============================================================

-- ============================================================
-- CajaPro — Funciones y Triggers de Negocio
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- Campo rubro en comercios (no incluido en schema inicial)
ALTER TABLE public.comercios ADD COLUMN IF NOT EXISTS rubro TEXT;

-- ============================================================
-- RPC: crear_comercio_con_admin
-- Crea el comercio y el usuario admin en una sola transacción.
-- SECURITY DEFINER permite bypassear RLS durante el registro.
-- ============================================================
CREATE OR REPLACE FUNCTION public.crear_comercio_con_admin(
  p_auth_user_id  UUID,
  p_email         TEXT,
  p_nombre_admin  TEXT,
  p_nombre_comercio TEXT,
  p_rubro         TEXT    DEFAULT NULL,
  p_domicilio     TEXT    DEFAULT NULL,
  p_telefono      TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comercio_id UUID;
BEGIN
  -- Verificar que el auth_user_id corresponde a un usuario real en auth
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_auth_user_id) THEN
    RAISE EXCEPTION 'Usuario de autenticación no encontrado';
  END IF;

  -- Evitar registros duplicados
  IF EXISTS (SELECT 1 FROM public.usuarios WHERE auth_user_id = p_auth_user_id) THEN
    RAISE EXCEPTION 'Este usuario ya tiene un comercio registrado';
  END IF;

  INSERT INTO public.comercios (nombre, rubro, domicilio, telefono, email)
  VALUES (p_nombre_comercio, p_rubro, p_domicilio, p_telefono, p_email)
  RETURNING id INTO v_comercio_id;

  INSERT INTO public.usuarios (comercio_id, auth_user_id, nombre, email, rol, activo)
  VALUES (v_comercio_id, p_auth_user_id, p_nombre_admin, p_email, 'admin', true);

  RETURN v_comercio_id;
END;
$$;

-- ============================================================
-- TRIGGER: vincular_auth_usuario
-- Se ejecuta cuando un cajero invitado completa su registro.
-- Busca una fila en `usuarios` con el mismo email y sin
-- auth_user_id, y la vincula automáticamente.
-- ============================================================
CREATE OR REPLACE FUNCTION public.vincular_auth_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.usuarios
  SET
    auth_user_id = NEW.id,
    activo       = true
  WHERE
    email         = NEW.email
    AND auth_user_id IS NULL;

  RETURN NEW;
END;
$$;

-- Trigger sobre auth.users (requiere permisos de superuser — disponible en SQL Editor de Supabase)
DROP TRIGGER IF EXISTS trg_vincular_auth_usuario ON auth.users;
DROP TRIGGER IF EXISTS trg_vincular_auth_usuario ON auth.users;
CREATE TRIGGER trg_vincular_auth_usuario
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.vincular_auth_usuario();


-- ============================================================
-- [04] migracion_ventas.sql
--     Triggers de stock para ventas
-- ============================================================

-- ============================================================
-- CajaPro — Migración: módulo de Ventas (POS)
-- Ejecutar en: Supabase > SQL Editor
-- Requiere: schema.sql, rls_policies.sql y funciones.sql previos
-- ============================================================

-- ============================================================
-- TRIGGER: descontar stock al registrar ítem de venta
-- ============================================================

CREATE OR REPLACE FUNCTION public.stock_salida_venta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.producto_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.productos
  SET
    stock_actual = stock_actual - NEW.cantidad,
    updated_at   = now()
  WHERE id = NEW.producto_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_salida_venta ON public.ventas_items;
DROP TRIGGER IF EXISTS trg_stock_salida_venta ON public.ventas_items;
CREATE TRIGGER trg_stock_salida_venta
  AFTER INSERT ON public.ventas_items
  FOR EACH ROW
  EXECUTE FUNCTION public.stock_salida_venta();

-- ============================================================
-- TRIGGER: revertir stock si la venta se cancela
-- ============================================================

CREATE OR REPLACE FUNCTION public.stock_revertir_venta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.estado = 'completada' AND NEW.estado = 'cancelada' THEN
    UPDATE public.productos p
    SET
      stock_actual = p.stock_actual + vi.cantidad,
      updated_at   = now()
    FROM public.ventas_items vi
    WHERE vi.venta_id = NEW.id
      AND vi.producto_id = p.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_revertir_venta ON public.ventas;
DROP TRIGGER IF EXISTS trg_stock_revertir_venta ON public.ventas;
CREATE TRIGGER trg_stock_revertir_venta
  AFTER UPDATE ON public.ventas
  FOR EACH ROW
  EXECUTE FUNCTION public.stock_revertir_venta();


-- ============================================================
-- [05] migracion_numero.sql
--     Número correlativo de ventas y compras
-- ============================================================

-- ============================================================
-- CajaPro — Migración: número correlativo por comercio
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- Asigna un número correlativo por comercio justo antes del INSERT.
-- Usa SELECT MAX + 1 (suficiente para un POS de comercio de barrio).
CREATE OR REPLACE FUNCTION public.asignar_numero_venta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(MAX(numero), 0) + 1
  INTO NEW.numero
  FROM public.ventas
  WHERE comercio_id = NEW.comercio_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asignar_numero_venta ON public.ventas;
DROP TRIGGER IF EXISTS trg_asignar_numero_venta ON public.ventas;
CREATE TRIGGER trg_asignar_numero_venta
  BEFORE INSERT ON public.ventas
  FOR EACH ROW
  WHEN (NEW.numero IS NULL)
  EXECUTE FUNCTION public.asignar_numero_venta();

-- ============================================================
-- [06] migracion_temas.sql
--     color_tema en comercios
-- ============================================================

-- ============================================================
-- CajaPro — Migración: tema de color por comercio
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================
ALTER TABLE public.comercios
  ADD COLUMN IF NOT EXISTS color_tema TEXT NOT NULL DEFAULT 'azul';


-- ============================================================
-- [07] migracion_logos.sql
--     logo_url / banner_url en comercios
-- ============================================================

-- ============================================================
-- CajaPro — Migración: branding por comercio
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- Campos de imágenes en la tabla comercios
ALTER TABLE public.comercios
  ADD COLUMN IF NOT EXISTS logo_url   TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- ============================================================
-- Storage bucket para imágenes de comercios
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'imagenes-comercio',
  'imagenes-comercio',
  true,
  5242880,  -- 5 MB máximo por archivo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Lectura pública (las imágenes se muestran en la app sin autenticación)
DO $$ BEGIN
  CREATE POLICY "Lectura publica imagenes comercio"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'imagenes-comercio');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Solo admins pueden subir imágenes dentro de su propia carpeta
DO $$ BEGIN
  CREATE POLICY "Admin sube imagenes de su comercio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'imagenes-comercio'
  AND (storage.foldername(name))[1] = get_comercio_id_actual()::text
  AND es_admin_actual()
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Solo admins pueden reemplazar imágenes de su comercio
DO $$ BEGIN
  CREATE POLICY "Admin actualiza imagenes de su comercio"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'imagenes-comercio'
  AND (storage.foldername(name))[1] = get_comercio_id_actual()::text
  AND es_admin_actual()
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Solo admins pueden eliminar imágenes de su comercio
DO $$ BEGIN
  CREATE POLICY "Admin elimina imagenes de su comercio"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'imagenes-comercio'
  AND (storage.foldername(name))[1] = get_comercio_id_actual()::text
  AND es_admin_actual()
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- [08] migracion_modulos.sql
--     modulos JSONB en comercios
-- ============================================================

-- ============================================================
-- CajaPro — Migración: módulos habilitados por comercio
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

ALTER TABLE public.comercios
  ADD COLUMN IF NOT EXISTS modulos JSONB NOT NULL DEFAULT
    '{"ventas":true,"caja":true,"compras":true,"gastos":true,"clientes":true,"reportes":true}'::jsonb;


-- ============================================================
-- [09] migracion_admin.sql
--     comercio_id nullable + modulos_permitidos
-- ============================================================

-- ─── MIGRACIÓN: Módulo Administrador CajaPro ────────────────────────────────
-- Ejecutar en el SQL Editor de Supabase
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Permitir comercio_id NULL en usuarios (el superadmin no pertenece a ningún comercio)
ALTER TABLE usuarios ALTER COLUMN comercio_id DROP NOT NULL;

-- 2. Agregar modulos_permitidos a comercios
--    Controla qué módulos puede ver/activar el admin del comercio.
--    Si un módulo NO aparece o es TRUE → permitido.
--    Si es FALSE → bloqueado por el superadmin.
ALTER TABLE comercios
  ADD COLUMN IF NOT EXISTS modulos_permitidos JSONB NOT NULL DEFAULT '{}';

-- 3. Crear el usuario superadmin
-- ─────────────────────────────────────────────────────────────────────────────
-- PASO A: Ir a Supabase Dashboard → Authentication → Users → Add user
--   Email:    nicolas@cajapro.admin
--   Password: administrador
--   Tildar "Auto Confirm User"
-- ─────────────────────────────────────────────────────────────────────────────

-- PASO B: Ejecutar este bloque DESPUÉS de crear el usuario Auth
--   Reemplazar '<UUID_DEL_AUTH_USER>' con el UUID que te da Supabase al crear el usuario

-- INSERT INTO usuarios (nombre, rol, activo, comercio_id, auth_user_id)
-- VALUES (
--   'Nicolás (Admin)',
--   'superadmin',
--   true,
--   NULL,   -- superadmin no tiene comercio propio
--   '<UUID_DEL_AUTH_USER>'
-- );

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTA: el rol 'superadmin' se guarda como texto. Si la tabla tiene un CHECK
-- constraint en 'rol', expandirlo o eliminarlo:
-- ─────────────────────────────────────────────────────────────────────────────
-- ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
-- ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
--   CHECK (rol IN ('admin', 'cajero', 'superadmin'));
-- ─────────────────────────────────────────────────────────────────────────────


-- ============================================================
-- [10] migracion_tipos.sql
--     tipo + categoria_id en ventas y compras
-- ============================================================

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


-- ============================================================
-- [11] migracion_clientes.sql
--     Tabla clientes + cliente_id en ventas
-- ============================================================

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

DROP TRIGGER IF EXISTS trg_clientes_updated_at ON public.clientes;
CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();

CREATE INDEX IF NOT EXISTS idx_clientes_comercio ON public.clientes(comercio_id);

-- RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "clientes_ver" ON public.clientes
  FOR SELECT TO authenticated
  USING (comercio_id = public.get_comercio_id_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "clientes_crear" ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (comercio_id = public.get_comercio_id_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "clientes_editar" ON public.clientes
  FOR UPDATE TO authenticated
  USING  (comercio_id = public.get_comercio_id_actual())
  WITH CHECK (comercio_id = public.get_comercio_id_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "clientes_eliminar" ON public.clientes
  FOR DELETE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- COLUMNA: ventas.cliente_id (FK opcional a clientes)
-- ============================================================
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS cliente_id UUID
    REFERENCES public.clientes(id) ON DELETE SET NULL;


-- ============================================================
-- [12] migracion_clientes_perfil.sql
--     tipo_perfil + campos paciente en clientes
-- ============================================================

-- ============================================================
-- Migracion Clientes — Sistema de perfil flexible
-- Cliente / Paciente por comercio
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- 1. Nueva columna en comercios: tipo de perfil de contacto
ALTER TABLE comercios
  ADD COLUMN IF NOT EXISTS tipo_perfil TEXT DEFAULT 'cliente'
    CHECK (tipo_perfil IN ('cliente', 'paciente'));

-- 2. Nuevas columnas en clientes: campos para pacientes
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
  ADD COLUMN IF NOT EXISTS obra_social      TEXT,
  ADD COLUMN IF NOT EXISTS numero_afiliado  TEXT,
  ADD COLUMN IF NOT EXISTS especie          TEXT
    CHECK (especie IN ('perro', 'gato', 'ave', 'otro'));


-- ============================================================
-- [13] migracion_arca.sql
--     Columnas CAE en ventas
-- ============================================================

-- ============================================================
-- Migración: Campos de Facturación Electrónica ARCA en ventas
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- Nota: cliente_id ya existe (migracion_clientes.sql)
--       tipo ya existe    (migracion_tipos.sql)
ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS cae             TEXT,
  ADD COLUMN IF NOT EXISTS cae_vencimiento DATE,
  ADD COLUMN IF NOT EXISTS tipo_factura    TEXT CHECK (tipo_factura IN ('A', 'B', 'C')),
  ADD COLUMN IF NOT EXISTS nro_factura     INTEGER,
  ADD COLUMN IF NOT EXISTS punto_venta     INTEGER;

-- Índice para buscar facturas por CAE
CREATE INDEX IF NOT EXISTS idx_ventas_cae ON ventas(cae) WHERE cae IS NOT NULL;

-- Comentarios descriptivos
COMMENT ON COLUMN ventas.cae             IS 'Código de Autorización Electrónico emitido por ARCA';
COMMENT ON COLUMN ventas.cae_vencimiento IS 'Fecha de vencimiento del CAE';
COMMENT ON COLUMN ventas.tipo_factura    IS 'Tipo de comprobante: A, B o C';
COMMENT ON COLUMN ventas.nro_factura     IS 'Número de comprobante autorizado por ARCA';
COMMENT ON COLUMN ventas.punto_venta     IS 'Punto de Venta habilitado en ARCA';


-- ============================================================
-- [14] migracion_nc.sql
--     Columnas Nota de Crédito en ventas
-- ============================================================

-- ─────────────────────────────────────────────────────────────────
-- Migración: columnas para Notas de Crédito electrónicas en ventas
-- Ejecutar en Supabase → SQL Editor
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS nc_cae           TEXT,
  ADD COLUMN IF NOT EXISTS nc_nro_factura   INTEGER,
  ADD COLUMN IF NOT EXISTS nc_tipo_factura  TEXT CHECK (nc_tipo_factura IN ('A','B','C')),
  ADD COLUMN IF NOT EXISTS nc_punto_venta   INTEGER,
  ADD COLUMN IF NOT EXISTS nc_vencimiento   DATE,
  ADD COLUMN IF NOT EXISTS nc_fecha         TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN ventas.nc_cae          IS 'CAE de la Nota de Crédito electrónica (ARCA/AFIP)';
COMMENT ON COLUMN ventas.nc_nro_factura  IS 'Número del comprobante NC';
COMMENT ON COLUMN ventas.nc_tipo_factura IS 'Tipo del comprobante NC: A, B o C';
COMMENT ON COLUMN ventas.nc_punto_venta  IS 'Punto de venta del comprobante NC';
COMMENT ON COLUMN ventas.nc_vencimiento  IS 'Fecha de vencimiento del CAE de la NC';
COMMENT ON COLUMN ventas.nc_fecha        IS 'Fecha y hora de emisión de la NC';


-- ============================================================
-- [15] migracion_iva.sql
--     alicuota_iva en productos y ventas_items
-- ============================================================

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


-- ============================================================
-- [16] migracion_caja.sql
--     Tabla cierres_caja
-- ============================================================

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

DROP TRIGGER IF EXISTS trg_cierres_caja_updated_at ON public.cierres_caja;
CREATE TRIGGER trg_cierres_caja_updated_at
  BEFORE UPDATE ON public.cierres_caja
  FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();

CREATE INDEX IF NOT EXISTS idx_cierres_caja_comercio ON public.cierres_caja(comercio_id);
CREATE INDEX IF NOT EXISTS idx_cierres_caja_estado   ON public.cierres_caja(comercio_id, estado);

ALTER TABLE public.cierres_caja ENABLE ROW LEVEL SECURITY;

-- Ambos roles pueden ver los cierres de su comercio
DO $$ BEGIN
  CREATE POLICY "cierres_ver" ON public.cierres_caja
  FOR SELECT TO authenticated
  USING (comercio_id = public.get_comercio_id_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Cualquier usuario puede abrir/cerrar caja
DO $$ BEGIN
  CREATE POLICY "cierres_crear" ON public.cierres_caja
  FOR INSERT TO authenticated
  WITH CHECK (comercio_id = public.get_comercio_id_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "cierres_actualizar" ON public.cierres_caja
  FOR UPDATE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual())
  WITH CHECK (comercio_id = public.get_comercio_id_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Solo admin puede borrar cierres
DO $$ BEGIN
  CREATE POLICY "cierres_admin_borrar" ON public.cierres_caja
  FOR DELETE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- [17] migracion_compras.sql
--     Tablas compras + compras_items
-- ============================================================

-- ============================================================
-- CajaPro — Migración: módulo de Compras
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- ============================================================
-- TABLAS
-- ============================================================

-- Cabecera de compra
CREATE TABLE IF NOT EXISTS public.compras (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  comercio_id  UUID          NOT NULL REFERENCES public.comercios(id) ON DELETE CASCADE,
  proveedor_id UUID          REFERENCES public.proveedores(id) ON DELETE SET NULL,
  usuario_id   UUID          REFERENCES public.usuarios(id) ON DELETE SET NULL,
  numero       INTEGER,
  fecha        DATE          NOT NULL DEFAULT CURRENT_DATE,
  total        NUMERIC(12,2) NOT NULL DEFAULT 0,
  metodo_pago  TEXT          NOT NULL DEFAULT 'efectivo'
                 CHECK (metodo_pago IN ('efectivo', 'transferencia', 'cheque', 'cuenta_corriente', 'otro')),
  estado       TEXT          NOT NULL DEFAULT 'recibida'
                 CHECK (estado IN ('recibida', 'cancelada')),
  notas        TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_compras_updated_at ON public.compras;
CREATE TRIGGER trg_compras_updated_at
  BEFORE UPDATE ON public.compras
  FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();

CREATE INDEX IF NOT EXISTS idx_compras_comercio   ON public.compras(comercio_id);
CREATE INDEX IF NOT EXISTS idx_compras_fecha      ON public.compras(comercio_id, fecha);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor  ON public.compras(proveedor_id);

-- Mismo trigger para compras
CREATE OR REPLACE FUNCTION public.asignar_numero_compra()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(MAX(numero), 0) + 1
  INTO NEW.numero
  FROM public.compras
  WHERE comercio_id = NEW.comercio_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asignar_numero_compra ON public.compras;
DROP TRIGGER IF EXISTS trg_asignar_numero_compra ON public.compras;
CREATE TRIGGER trg_asignar_numero_compra
  BEFORE INSERT ON public.compras
  FOR EACH ROW
  WHEN (NEW.numero IS NULL)
  EXECUTE FUNCTION public.asignar_numero_compra();

-- Diferencia compra detallada (aumenta stock) vs. rápida (solo registra)
ALTER TABLE public.compras
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'detallada'
    CHECK (tipo IN ('detallada', 'rapida'));

-- Categoría opcional en compras rápidas
ALTER TABLE public.compras
  ADD COLUMN IF NOT EXISTS categoria_id UUID
    REFERENCES public.categorias(id) ON DELETE SET NULL;

-- Líneas de la compra
CREATE TABLE IF NOT EXISTS public.compras_items (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id        UUID          NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
  producto_id      UUID          REFERENCES public.productos(id) ON DELETE SET NULL,
  nombre_producto  TEXT          NOT NULL,  -- snapshot del nombre al momento de la compra
  cantidad         NUMERIC(12,3) NOT NULL DEFAULT 1,
  precio_unitario  NUMERIC(12,2) NOT NULL,
  subtotal         NUMERIC(12,2) NOT NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compras_items_compra   ON public.compras_items(compra_id);
CREATE INDEX IF NOT EXISTS idx_compras_items_producto ON public.compras_items(producto_id);

-- ============================================================
-- TRIGGER: actualizar stock y precio de costo al recibir compra
-- Se dispara al insertar cada ítem. Si la compra se cancela,
-- el segundo trigger revierte el movimiento de stock.
-- ============================================================

CREATE OR REPLACE FUNCTION public.stock_entrada_compra()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.producto_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.productos
  SET
    stock_actual  = stock_actual + NEW.cantidad,
    precio_costo  = NEW.precio_unitario,  -- actualiza al último precio pagado
    updated_at    = now()
  WHERE id = NEW.producto_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_entrada_compra ON public.compras_items;
CREATE TRIGGER trg_stock_entrada_compra
  AFTER INSERT ON public.compras_items
  FOR EACH ROW
  EXECUTE FUNCTION public.stock_entrada_compra();

-- Revertir stock si la compra se cancela
CREATE OR REPLACE FUNCTION public.stock_revertir_compra()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo actuar cuando el estado pasa de 'recibida' a 'cancelada'
  IF OLD.estado = 'recibida' AND NEW.estado = 'cancelada' THEN
    UPDATE public.productos p
    SET
      stock_actual = p.stock_actual - ci.cantidad,
      updated_at   = now()
    FROM public.compras_items ci
    WHERE ci.compra_id = NEW.id
      AND ci.producto_id = p.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_revertir_compra ON public.compras;
CREATE TRIGGER trg_stock_revertir_compra
  AFTER UPDATE ON public.compras
  FOR EACH ROW
  EXECUTE FUNCTION public.stock_revertir_compra();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.compras       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_items ENABLE ROW LEVEL SECURITY;

-- compras
DO $$ BEGIN
  CREATE POLICY "compras_ver" ON public.compras
  FOR SELECT TO authenticated
  USING (comercio_id = public.get_comercio_id_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "compras_crear" ON public.compras
  FOR INSERT TO authenticated
  WITH CHECK (comercio_id = public.get_comercio_id_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "compras_admin_modificar" ON public.compras
  FOR UPDATE TO authenticated
  USING  (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual())
  WITH CHECK (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "compras_admin_borrar" ON public.compras
  FOR DELETE TO authenticated
  USING (comercio_id = public.get_comercio_id_actual() AND public.es_admin_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- compras_items: hereda acceso de su compra padre
DO $$ BEGIN
  CREATE POLICY "compras_items_ver" ON public.compras_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.compras c
      WHERE c.id = compra_id
        AND c.comercio_id = public.get_comercio_id_actual()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "compras_items_crear" ON public.compras_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.compras c
      WHERE c.id = compra_id
        AND c.comercio_id = public.get_comercio_id_actual()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "compras_items_admin_borrar" ON public.compras_items
  FOR DELETE TO authenticated
  USING (
    public.es_admin_actual() AND
    EXISTS (
      SELECT 1 FROM public.compras c
      WHERE c.id = compra_id
        AND c.comercio_id = public.get_comercio_id_actual()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- [18] migracion_compras_v2.sql
--     Estados independientes en compras
-- ============================================================

-- ============================================================
-- CajaPro — Migración Compras v2: estados independientes
-- Ejecutar en Supabase > SQL Editor DESPUÉS de migracion_compras.sql
-- ============================================================

-- 1. Quitar trigger viejo que actualizaba stock automáticamente
--    (ahora el stock se actualiza manualmente al marcar "recibida")
DROP TRIGGER IF EXISTS trg_stock_entrada_compra ON public.compras_items;
DROP TRIGGER IF EXISTS trg_stock_revertir_compra ON public.compras;

-- 2. Columnas de estado de recepción
ALTER TABLE public.compras
  ADD COLUMN IF NOT EXISTS estado_recepcion TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado_recepcion IN ('pendiente', 'recibida')),
  ADD COLUMN IF NOT EXISTS fecha_recepcion  DATE;

-- 3. Columnas de factura del proveedor
ALTER TABLE public.compras
  ADD COLUMN IF NOT EXISTS facturada              BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS estado_factura         TEXT NOT NULL DEFAULT 'sin_factura'
    CHECK (estado_factura IN ('sin_factura', 'con_factura')),
  ADD COLUMN IF NOT EXISTS numero_factura         TEXT,
  ADD COLUMN IF NOT EXISTS tipo_factura_proveedor TEXT,
  ADD COLUMN IF NOT EXISTS nro_factura_proveedor  TEXT,
  ADD COLUMN IF NOT EXISTS fecha_factura          DATE;

-- 4. Columnas de estado de pago
ALTER TABLE public.compras
  ADD COLUMN IF NOT EXISTS pagada     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS estado_pago TEXT NOT NULL DEFAULT 'pagada'
    CHECK (estado_pago IN ('pendiente', 'pagada')),
  ADD COLUMN IF NOT EXISTS fecha_pago DATE;

-- 5. Para compras ya existentes (tipo detallada), marcarlas como recibidas
--    ya que el trigger viejo ya les actualizó el stock
UPDATE public.compras
SET estado_recepcion = 'recibida', fecha_recepcion = created_at::date
WHERE estado_recepcion = 'pendiente'
  AND tipo = 'detallada';

-- Las compras rápidas siempre están recibidas
UPDATE public.compras
SET estado_recepcion = 'recibida'
WHERE tipo = 'rapida';


-- ============================================================
-- [19] migracion_turnos.sql
--     Módulo turnos: profesionales, servicios, horarios
-- ============================================================

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
DO $$ BEGIN
  CREATE POLICY "profesionales_comercio" ON profesionales
  FOR ALL USING (
    comercio_id = (
      SELECT comercio_id FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Servicios de turnos
DO $$ BEGIN
  CREATE POLICY "servicios_turnos_comercio" ON servicios_turnos
  FOR ALL USING (
    comercio_id = (
      SELECT comercio_id FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Horarios disponibles (a través del profesional)
DO $$ BEGIN
  CREATE POLICY "horarios_disponibles_comercio" ON horarios_disponibles
  FOR ALL USING (
    profesional_id IN (
      SELECT id FROM profesionales
      WHERE comercio_id = (
        SELECT comercio_id FROM usuarios WHERE auth_user_id = auth.uid()
      )
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Turnos
DO $$ BEGIN
  CREATE POLICY "turnos_comercio" ON turnos
  FOR ALL USING (
    comercio_id = (
      SELECT comercio_id FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Comentarios
COMMENT ON TABLE profesionales       IS 'Profesionales/prestadores de servicios';
COMMENT ON TABLE servicios_turnos    IS 'Tipos de servicios con duración y precio';
COMMENT ON TABLE horarios_disponibles IS 'Disponibilidad horaria por profesional y día';
COMMENT ON TABLE turnos              IS 'Citas/turnos agendados';


-- ============================================================
-- [20] migracion_admin_panel.sql
--     Panel admin: cajapro_cobros + cajapro_gastos
-- ============================================================

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
DO $$ BEGIN
  CREATE POLICY "cajapro_cobros_superadmin_select"
  ON cajapro_cobros FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM usuarios WHERE rol = 'superadmin' AND activo = true
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- cobros: INSERT
DO $$ BEGIN
  CREATE POLICY "cajapro_cobros_superadmin_insert"
  ON cajapro_cobros FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT auth_user_id FROM usuarios WHERE rol = 'superadmin' AND activo = true
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- cobros: UPDATE
DO $$ BEGIN
  CREATE POLICY "cajapro_cobros_superadmin_update"
  ON cajapro_cobros FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM usuarios WHERE rol = 'superadmin' AND activo = true
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- cobros: DELETE
DO $$ BEGIN
  CREATE POLICY "cajapro_cobros_superadmin_delete"
  ON cajapro_cobros FOR DELETE
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM usuarios WHERE rol = 'superadmin' AND activo = true
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- gastos: SELECT
DO $$ BEGIN
  CREATE POLICY "cajapro_gastos_superadmin_select"
  ON cajapro_gastos FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM usuarios WHERE rol = 'superadmin' AND activo = true
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- gastos: INSERT
DO $$ BEGIN
  CREATE POLICY "cajapro_gastos_superadmin_insert"
  ON cajapro_gastos FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT auth_user_id FROM usuarios WHERE rol = 'superadmin' AND activo = true
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- gastos: UPDATE
DO $$ BEGIN
  CREATE POLICY "cajapro_gastos_superadmin_update"
  ON cajapro_gastos FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM usuarios WHERE rol = 'superadmin' AND activo = true
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- gastos: DELETE
DO $$ BEGIN
  CREATE POLICY "cajapro_gastos_superadmin_delete"
  ON cajapro_gastos FOR DELETE
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM usuarios WHERE rol = 'superadmin' AND activo = true
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Índices para performance ──────────────────────────────────
CREATE INDEX IF NOT EXISTS cajapro_cobros_comercio_id_idx ON cajapro_cobros(comercio_id);
CREATE INDEX IF NOT EXISTS cajapro_cobros_fecha_idx       ON cajapro_cobros(fecha DESC);
CREATE INDEX IF NOT EXISTS cajapro_cobros_estado_idx      ON cajapro_cobros(estado);
CREATE INDEX IF NOT EXISTS cajapro_gastos_fecha_idx       ON cajapro_gastos(fecha DESC);
CREATE INDEX IF NOT EXISTS cajapro_gastos_categoria_idx   ON cajapro_gastos(categoria);


-- ============================================================
-- [21] migracion_cobros_v2.sql
--     Columnas adicionales en cajapro_cobros
-- ============================================================

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


-- ============================================================
-- [22] migracion_admin_rls_fix.sql
--     RLS fix para superadmin
-- ============================================================

-- =============================================================
-- CajaPro — Fix RLS: superadmin puede ver todos los comercios
-- Ejecutar en: Supabase > SQL Editor
-- Problema: la policy "comercio_ver_propio" bloquea al superadmin
--           de ver todos los comercios en el panel de Cobros/Finanzas
-- =============================================================

-- Agregar función helper para verificar superadmin (reutilizable)
CREATE OR REPLACE FUNCTION public.es_superadmin_actual()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE auth_user_id = auth.uid()
      AND rol = 'superadmin'
      AND activo = true
  );
$$;

-- Policy: el superadmin puede leer TODOS los comercios
DO $$ BEGIN
  CREATE POLICY "comercios_superadmin_ver_todos"
  ON comercios FOR SELECT
  USING (public.es_superadmin_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policy: el superadmin puede actualizar cualquier comercio
-- (útil para gestión desde el panel admin)
DO $$ BEGIN
  CREATE POLICY "comercios_superadmin_actualizar"
  ON comercios FOR UPDATE
  USING (public.es_superadmin_actual())
  WITH CHECK (public.es_superadmin_actual());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;