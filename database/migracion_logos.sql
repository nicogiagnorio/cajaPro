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
CREATE POLICY "Lectura publica imagenes comercio"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'imagenes-comercio');

-- Solo admins pueden subir imágenes dentro de su propia carpeta
CREATE POLICY "Admin sube imagenes de su comercio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'imagenes-comercio'
  AND (storage.foldername(name))[1] = get_comercio_id_actual()::text
  AND es_admin_actual()
);

-- Solo admins pueden reemplazar imágenes de su comercio
CREATE POLICY "Admin actualiza imagenes de su comercio"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'imagenes-comercio'
  AND (storage.foldername(name))[1] = get_comercio_id_actual()::text
  AND es_admin_actual()
);

-- Solo admins pueden eliminar imágenes de su comercio
CREATE POLICY "Admin elimina imagenes de su comercio"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'imagenes-comercio'
  AND (storage.foldername(name))[1] = get_comercio_id_actual()::text
  AND es_admin_actual()
);
