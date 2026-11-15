-- =========================================================================================
-- MIGRATION 56 : POLITIQUES RLS SUR LA TABLE MÉDICAMENTS
-- =========================================================================================

-- Autoriser la lecture, l'insertion, la mise à jour et la suppression des médicaments
-- pour les utilisateurs authentifiés
ALTER TABLE public.medicaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can select medicaments" ON public.medicaments;
CREATE POLICY "Authenticated users can select medicaments" ON public.medicaments
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert medicaments" ON public.medicaments;
CREATE POLICY "Authenticated users can insert medicaments" ON public.medicaments
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update medicaments" ON public.medicaments;
CREATE POLICY "Authenticated users can update medicaments" ON public.medicaments
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete medicaments" ON public.medicaments;
CREATE POLICY "Authenticated users can delete medicaments" ON public.medicaments
    FOR DELETE TO authenticated USING (true);

