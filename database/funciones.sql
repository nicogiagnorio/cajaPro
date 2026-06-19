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
CREATE TRIGGER trg_vincular_auth_usuario
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.vincular_auth_usuario();
