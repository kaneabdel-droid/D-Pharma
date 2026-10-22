-- Migration 49 : Création du bucket de stockage 'logos' et fonction update_gie_logo

-- 1. Création du bucket public 'logos'
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Politiques RLS pour storage.objects sur le bucket 'logos'
DROP POLICY IF EXISTS "logos_public_select" ON storage.objects;
DROP POLICY IF EXISTS "logos_own_folder_insert" ON storage.objects;
DROP POLICY IF EXISTS "logos_own_folder_update" ON storage.objects;
DROP POLICY IF EXISTS "logos_own_folder_delete" ON storage.objects;

CREATE POLICY "logos_public_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

CREATE POLICY "logos_own_folder_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] IN (SELECT gie_id::text FROM public.utilisateurs WHERE id = auth.uid())
  );

CREATE POLICY "logos_own_folder_update" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] IN (SELECT gie_id::text FROM public.utilisateurs WHERE id = auth.uid())
  );

CREATE POLICY "logos_own_folder_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] IN (SELECT gie_id::text FROM public.utilisateurs WHERE id = auth.uid())
  );

-- 3. Fonction RPC update_gie_logo
CREATE OR REPLACE FUNCTION public.update_gie_logo(
  p_logo_url text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_gie_id uuid;
BEGIN
  SELECT gie_id INTO v_gie_id FROM public.utilisateurs WHERE id = auth.uid();
  IF v_gie_id IS NULL THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  UPDATE public.gies SET logo_url = p_logo_url WHERE id = v_gie_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_gie_logo(text) TO authenticated;
