-- Migration 47 : Politiques RLS pour fournisseurs_labo et tables associées sur d-pharma

-- 1. Fournisseurs & Grossistes (fournisseurs_labo)
ALTER TABLE public.fournisseurs_labo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fournisseurs_labo_gie_isolation" ON public.fournisseurs_labo;
DROP POLICY IF EXISTS "Pharmacie gestion fournisseurs" ON public.fournisseurs_labo;

CREATE POLICY "fournisseurs_labo_gie_isolation" ON public.fournisseurs_labo
    FOR ALL TO authenticated
    USING (gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()))
    WITH CHECK (gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()));

-- 2. Lignes de Commande Fournisseur (lignes_commande_labo)
ALTER TABLE public.lignes_commande_labo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Pharmacie gestion lignes commande" ON public.lignes_commande_labo;

CREATE POLICY "Pharmacie gestion lignes commande" ON public.lignes_commande_labo
    FOR ALL TO authenticated
    USING (
        commande_id IN (
            SELECT id FROM public.commandes_labo WHERE gie_id IN (
                SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()
            )
        )
    )
    WITH CHECK (
        commande_id IN (
            SELECT id FROM public.commandes_labo WHERE gie_id IN (
                SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()
            )
        )
    );

-- 3. Lignes de Vente POS (lignes_vente_pharmacie)
ALTER TABLE public.lignes_vente_pharmacie ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Pharmacie gestion lignes vente" ON public.lignes_vente_pharmacie;

CREATE POLICY "Pharmacie gestion lignes vente" ON public.lignes_vente_pharmacie
    FOR ALL TO authenticated
    USING (
        vente_id IN (
            SELECT id FROM public.ventes_pharmacie WHERE gie_id IN (
                SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()
            )
        )
    )
    WITH CHECK (
        vente_id IN (
            SELECT id FROM public.ventes_pharmacie WHERE gie_id IN (
                SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()
            )
        )
    );

-- 4. Lecture du GIE par ses membres (gies)
ALTER TABLE public.gies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Les utilisateurs voient leur propre GIE" ON public.gies;

CREATE POLICY "Les utilisateurs voient leur propre GIE" ON public.gies
    FOR SELECT TO authenticated
    USING (id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()));

-- 5. Support & Messages (support_messages)
ALTER TABLE public.support_messages 
    ADD COLUMN IF NOT EXISTS user_id uuid references auth.users(id) on delete set null,
    ADD COLUMN IF NOT EXISTS email text,
    ADD COLUMN IF NOT EXISTS email_envoye boolean default false;

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture support_messages par GIE" ON public.support_messages;
DROP POLICY IF EXISTS "Creation support_messages par GIE" ON public.support_messages;

CREATE POLICY "Lecture support_messages par GIE" ON public.support_messages
    FOR SELECT TO authenticated
    USING (gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()));

CREATE POLICY "Creation support_messages par GIE" ON public.support_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid())
    );

-- 6. Tarifs d'abonnement (tarif_abonnement)
ALTER TABLE public.tarif_abonnement ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture publique tarif_abonnement" ON public.tarif_abonnement;

CREATE POLICY "Lecture publique tarif_abonnement" ON public.tarif_abonnement
    FOR SELECT TO public
    USING (true);

-- 7. Produits Maketou & Chariow (maketou_produits, chariow_produits)
ALTER TABLE public.maketou_produits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture maketou_produits" ON public.maketou_produits;

CREATE POLICY "Lecture maketou_produits" ON public.maketou_produits
    FOR SELECT TO public
    USING (true);

ALTER TABLE public.chariow_produits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture chariow_produits" ON public.chariow_produits;

CREATE POLICY "Lecture chariow_produits" ON public.chariow_produits
    FOR SELECT TO public
    USING (true);

-- 8. Paiements d'abonnement (abonnement_paiements)
ALTER TABLE public.abonnement_paiements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Les utilisateurs voient les paiements de leur GIE" ON public.abonnement_paiements;
DROP POLICY IF EXISTS "Les utilisateurs créent des paiements pour leur GIE" ON public.abonnement_paiements;
DROP POLICY IF EXISTS "Les utilisateurs modifient leurs paiements en attente" ON public.abonnement_paiements;

CREATE POLICY "Les utilisateurs voient les paiements de leur GIE" ON public.abonnement_paiements
    FOR SELECT TO authenticated
    USING (gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()));

CREATE POLICY "Les utilisateurs créent des paiements pour leur GIE" ON public.abonnement_paiements
    FOR INSERT TO authenticated
    WITH CHECK (gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()));

CREATE POLICY "Les utilisateurs modifient leurs paiements en attente" ON public.abonnement_paiements
    FOR UPDATE TO authenticated
    USING (gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()))
    WITH CHECK (
        gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid())
        AND statut <> 'completed'
    );
