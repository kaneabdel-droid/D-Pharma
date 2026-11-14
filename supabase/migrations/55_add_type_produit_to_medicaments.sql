-- =========================================================================================
-- MIGRATION 55 : AJOUT DU TYPE DE PRODUIT (MÉDICAMENT / MATÉRIEL / SERVICE) DANS LE CATALOGUE
-- =========================================================================================

ALTER TABLE public.medicaments
    ADD COLUMN IF NOT EXISTS type_produit VARCHAR(50) DEFAULT 'medicament';

-- Index pour optimiser les filtres par type
CREATE INDEX IF NOT EXISTS idx_medicaments_type_produit ON public.medicaments(type_produit);

