-- Migration 48 : Ajout des colonnes manquantes sur la table transactions pour d-pharma

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS compte_id UUID REFERENCES public.comptes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS type_piece VARCHAR(100),
  ADD COLUMN IF NOT EXISTS imputation_id UUID REFERENCES public.imputations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_compte_id ON public.transactions(compte_id);
CREATE INDEX IF NOT EXISTS idx_transactions_imputation_id ON public.transactions(imputation_id);
CREATE INDEX IF NOT EXISTS idx_transactions_gie_date ON public.transactions(gie_id, created_at DESC);
