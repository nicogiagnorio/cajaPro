-- ============================================================
-- Migracion Clientes — Sistema de perfil flexible
-- Cliente / Paciente por comercio
-- Ejecutar en Supabase > SQL Editor
-- Fecha: 2026-06-18
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
-- 3. Verificacion
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM comercios WHERE tipo_perfil IS NOT NULL) AS comercios_con_tipo_perfil,
  (SELECT COUNT(*) FROM clientes  WHERE fecha_nacimiento IS NOT NULL
                                    OR  obra_social IS NOT NULL
                                    OR  especie IS NOT NULL)      AS pacientes_con_datos;
