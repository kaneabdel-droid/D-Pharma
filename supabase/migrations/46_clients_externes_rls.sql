-- Migration 46 : RLS pour la table clients_externes
-- Permet aux utilisateurs authentifiés d'accéder (SELECT, INSERT, UPDATE, DELETE)
-- exclusivement aux clients externes rattachés à leur propre officine (GIE).

ALTER TABLE public.clients_externes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acces Clients Externes par GIE" ON public.clients_externes;
DROP POLICY IF EXISTS "clients_externes_gie_isolation" ON public.clients_externes;

CREATE POLICY "clients_externes_gie_isolation" ON public.clients_externes
    FOR ALL TO authenticated
    USING (gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()))
    WITH CHECK (gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()));
