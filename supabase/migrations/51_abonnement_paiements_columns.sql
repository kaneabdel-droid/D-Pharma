-- Migration 51: Compléter les colonnes manquantes sur public.abonnement_paiements pour le checkout
ALTER TABLE public.abonnement_paiements
  ADD COLUMN IF NOT EXISTS moyen_paiement VARCHAR(50),
  ADD COLUMN IF NOT EXISTS checkout_url TEXT,
  ADD COLUMN IF NOT EXISTS abandonne_le TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS raw_webhook JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS abonnement_paiements_un_en_cours_par_gie
  ON public.abonnement_paiements (gie_id)
  WHERE statut = 'pending' AND abandonne_le IS NULL;

NOTIFY pgrst, 'reload schema';
