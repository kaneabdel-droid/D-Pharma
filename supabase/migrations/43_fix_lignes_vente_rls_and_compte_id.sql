-- Migration 43 : Correction des politiques RLS pour les lignes de vente et colonne compte_id sur transactions

-- 1. Sécuriser la table lignes_vente_pharmacie avec les politiques RLS adéquates
ALTER TABLE public.lignes_vente_pharmacie ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pharmacie gestion lignes vente" ON public.lignes_vente_pharmacie;

CREATE POLICY "Pharmacie gestion lignes vente" ON public.lignes_vente_pharmacie
    FOR ALL TO authenticated USING (
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

-- 2. Ajouter la colonne compte_id sur la table transactions si elle est manquante
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS compte_id uuid references public.comptes(id) on delete set null;

CREATE INDEX IF NOT EXISTS idx_transactions_compte_id ON public.transactions(compte_id);

-- 3. Assurer la prise en charge de 'mobile_money' dans abonnement_paiements
ALTER TABLE public.abonnement_paiements DROP CONSTRAINT IF EXISTS abonnement_paiements_moyen_paiement_check;
ALTER TABLE public.abonnement_paiements ADD CONSTRAINT abonnement_paiements_moyen_paiement_check
    CHECK (moyen_paiement IN ('wave', 'orange', 'carte', 'virement', 'chariow', 'maketou', 'mobile_money'));

