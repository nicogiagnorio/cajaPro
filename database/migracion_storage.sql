-- ============================================================
-- MIGRACIÓN: Storage bucket para imágenes de comercios
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Crear el bucket (idempotente)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'imagenes-comercio',
  'imagenes-comercio',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public            = true,
  file_size_limit   = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

-- ── Políticas RLS para storage.objects ───────────────────────

-- Lectura pública (cualquiera puede ver logos/banners)
DO $$ BEGIN
  CREATE POLICY "storage_imagenes_lectura_publica"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'imagenes-comercio');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Subida: solo usuarios autenticados cuya carpeta coincida con su comercio_id
DO $$ BEGIN
  CREATE POLICY "storage_imagenes_insert_propio"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'imagenes-comercio'
      AND (storage.foldername(name))[1] = (
        SELECT comercio_id::text
        FROM public.usuarios
        WHERE auth_user_id = auth.uid()
        LIMIT 1
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Actualización: solo el comercio dueño de la carpeta
DO $$ BEGIN
  CREATE POLICY "storage_imagenes_update_propio"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'imagenes-comercio'
      AND (storage.foldername(name))[1] = (
        SELECT comercio_id::text
        FROM public.usuarios
        WHERE auth_user_id = auth.uid()
        LIMIT 1
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Eliminación: solo el comercio dueño de la carpeta
DO $$ BEGIN
  CREATE POLICY "storage_imagenes_delete_propio"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'imagenes-comercio'
      AND (storage.foldername(name))[1] = (
        SELECT comercio_id::text
        FROM public.usuarios
        WHERE auth_user_id = auth.uid()
        LIMIT 1
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
