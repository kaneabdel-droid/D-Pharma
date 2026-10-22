-- Migration 50 : Enrichissement des ventes_pharmacie (annulation, journal de vente, trésorerie et crédit)

ALTER TABLE public.ventes_pharmacie
  ADD COLUMN IF NOT EXISTS statut VARCHAR(20) NOT NULL DEFAULT 'validee',
  ADD COLUMN IF NOT EXISTS motif_annulation TEXT,
  ADD COLUMN IF NOT EXISTS date_annulation TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS annule_par UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS compte_tresorerie_id UUID REFERENCES public.comptes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS part_patient NUMERIC(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS part_credit NUMERIC(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS numero_ticket VARCHAR(100),
  ADD COLUMN IF NOT EXISTS ecriture_id UUID REFERENCES public.ecritures_comptables(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ventes_pharmacie_statut ON public.ventes_pharmacie(statut);
CREATE INDEX IF NOT EXISTS idx_ventes_pharmacie_compte ON public.ventes_pharmacie(compte_tresorerie_id);
CREATE INDEX IF NOT EXISTS idx_ventes_pharmacie_client ON public.ventes_pharmacie(client_id);
