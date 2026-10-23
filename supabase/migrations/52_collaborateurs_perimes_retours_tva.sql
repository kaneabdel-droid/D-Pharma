-- =========================================================================================
-- MIGRATION 52 : COLLABORATEURS, GESTION DES PÉRIMÉS (PV HUISSIER/HYGIÈNE), 
-- RETOURS & AVOIRS GROSSISTES, ET DÉCLARATION TVA OFFICINE
-- =========================================================================================

-- 1. EXTENSION DE LA TABLE UTILISATEURS (Collaborateurs d'officine)
ALTER TABLE public.utilisateurs
    ADD COLUMN IF NOT EXISTS nom_complet VARCHAR(255),
    ADD COLUMN IF NOT EXISTS telephone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS identifiant VARCHAR(100),
    ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true;

-- 2. ENRICHISSEMENT DES MÉDICAMENTS / STOCKS AVEC STATUT TVA & CATÉGORIE
ALTER TABLE public.medicaments
    ADD COLUMN IF NOT EXISTS categorie_tva VARCHAR(50) DEFAULT 'medicament_exonere', -- 'medicament_exonere', 'cosmetique_taxable', 'parapharmacie_taxable', 'materiel_taxable'
    ADD COLUMN IF NOT EXISTS taux_tva NUMERIC(5, 2) DEFAULT 0.00, -- 0% pour médicaments, 18% pour cosmétiques/parapharmacie
    ADD COLUMN IF NOT EXISTS prix_achat NUMERIC(15, 2) DEFAULT 0;

ALTER TABLE public.stocks_pharmacie
    ADD COLUMN IF NOT EXISTS prix_achat NUMERIC(15, 2) DEFAULT 0;

-- 3. PLAN COMPTABLE SYSCOHADA : AJOUT DES COMPTES SPÉCIFIQUES PÉRIMÉS & TVA
INSERT INTO public.plan_comptable_pharma (compte, libelle, classe, type, gie_id) VALUES
('6581', 'Pertes sur produits périmés ou avariés (Sorties PV officiel)', 6, 'charge', NULL),
('4094', 'Fournisseurs - Créances pour retours et avoirs à recevoir', 4, 'actif', NULL),
('4431', 'État - TVA facturée / collectée sur cosmétiques & parapharmacie (18%)', 4, 'passif', NULL),
('4452', 'État - TVA déductible sur achats de cosmétiques & parapharmacie (18%)', 4, 'actif', NULL),
('4441', 'État - TVA nette due / à décaisser', 4, 'passif', NULL),
('4456', 'État - Crédit de TVA à reporter', 4, 'actif', NULL),
('6091', 'Rabais, remises et ristournes obtenus sur achats grossistes', 6, 'produit', NULL)
ON CONFLICT DO NOTHING;

-- 4. TABLE DES PV DE DESTRUCTION DE PRODUITS PÉRIMÉS
CREATE TABLE IF NOT EXISTS public.produits_perimes_destructions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
    numero_pv VARCHAR(100) NOT NULL,
    date_destruction DATE NOT NULL DEFAULT CURRENT_DATE,
    motif VARCHAR(255) DEFAULT 'peremption', -- 'peremption', 'avarie', 'rupture_chaine_froid', 'rappel_lot'
    autorite_type VARCHAR(50) NOT NULL DEFAULT 'service_hygiene', -- 'huissier_justice', 'service_hygiene', 'commission_sanitaire', 'interne_officine'
    nom_officier_autorite VARCHAR(255), -- Nom de l'huissier ou du contrôleur d'hygiène
    numero_visa_acte VARCHAR(100), -- Réf acte d'huissier ou du visa d'hygiène
    statut VARCHAR(50) DEFAULT 'valide', -- 'brouillon', 'valide', 'transmis_dgid'
    valeur_achat_ht_totale NUMERIC(15, 2) DEFAULT 0,
    tva_recuperable_totale NUMERIC(15, 2) DEFAULT 0, -- TVA sur cosmétiques régularisable grâce au visa officiel
    valeur_ttc_totale NUMERIC(15, 2) DEFAULT 0,
    ecriture_comptable_id UUID REFERENCES public.ecritures_comptables(id) ON DELETE SET NULL,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE public.produits_perimes_destructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Destructions visibles par l'officine" ON public.produits_perimes_destructions
    FOR ALL TO authenticated USING (
        gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid())
    );

-- 5. LIGNES DE PRODUITS DÉTRUITS DANS LE PV
CREATE TABLE IF NOT EXISTS public.lignes_destruction_perimes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    destruction_id UUID NOT NULL REFERENCES public.produits_perimes_destructions(id) ON DELETE CASCADE,
    gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
    medicament_id UUID REFERENCES public.medicaments(id) ON DELETE SET NULL,
    stock_id UUID REFERENCES public.stocks_pharmacie(id) ON DELETE SET NULL,
    designation VARCHAR(255) NOT NULL,
    lot VARCHAR(100),
    date_peremption DATE,
    quantite NUMERIC(10, 2) NOT NULL,
    type_produit VARCHAR(50) DEFAULT 'medicament', -- 'medicament' (exonéré), 'cosmetique' (18%), 'parapharmacie' (18%), 'materiel' (18%)
    taux_tva NUMERIC(5, 2) DEFAULT 0.00,
    prix_achat_ht NUMERIC(15, 2) NOT NULL,
    montant_ht NUMERIC(15, 2) NOT NULL,
    montant_tva NUMERIC(15, 2) NOT NULL DEFAULT 0,
    montant_ttc NUMERIC(15, 2) NOT NULL
);

ALTER TABLE public.lignes_destruction_perimes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lignes destructions visibles par l'officine" ON public.lignes_destruction_perimes
    FOR ALL TO authenticated USING (
        gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid())
    );

-- 6. TABLE DES RETOURS & AVOIRS GROSSISTES (Laborex, COPHASE, Sodipharm, etc.)
CREATE TABLE IF NOT EXISTS public.retours_grossistes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
    fournisseur_id UUID NOT NULL REFERENCES public.fournisseurs_labo(id) ON DELETE CASCADE,
    numero_bon_retour VARCHAR(100) NOT NULL,
    date_retour DATE NOT NULL DEFAULT CURRENT_DATE,
    statut VARCHAR(50) DEFAULT 'en_attente', -- 'en_attente', 'expedie', 'avoir_recu', 'refuse'
    motif VARCHAR(100) DEFAULT 'perime_reprise', -- 'perime_reprise', 'erreur_livraison', 'produit_abime', 'rappel_lot'
    valeur_estimee_ht NUMERIC(15, 2) DEFAULT 0,
    numero_avoir_grossiste VARCHAR(100),
    date_avoir DATE,
    montant_avoir_ht NUMERIC(15, 2) DEFAULT 0,
    montant_avoir_tva NUMERIC(15, 2) DEFAULT 0,
    montant_avoir_ttc NUMERIC(15, 2) DEFAULT 0,
    taux_reprise_applique NUMERIC(5, 2) DEFAULT 100,
    ecriture_comptable_id UUID REFERENCES public.ecritures_comptables(id) ON DELETE SET NULL,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE public.retours_grossistes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Retours grossistes visibles par l'officine" ON public.retours_grossistes
    FOR ALL TO authenticated USING (
        gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid())
    );

-- 7. LIGNES DES ARTICLES RETOURNÉS AU GROSSISTE
CREATE TABLE IF NOT EXISTS public.lignes_retour_grossiste (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retour_id UUID NOT NULL REFERENCES public.retours_grossistes(id) ON DELETE CASCADE,
    gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
    medicament_id UUID REFERENCES public.medicaments(id) ON DELETE SET NULL,
    designation VARCHAR(255) NOT NULL,
    lot VARCHAR(100),
    date_peremption DATE,
    quantite NUMERIC(10, 2) NOT NULL,
    prix_achat_ht NUMERIC(15, 2) NOT NULL,
    montant_ht NUMERIC(15, 2) NOT NULL
);

ALTER TABLE public.lignes_retour_grossiste ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lignes retour grossiste visibles par l'officine" ON public.lignes_retour_grossiste
    FOR ALL TO authenticated USING (
        gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid())
    );

-- 8. TABLE DES DÉCLARATIONS DE TVA PÉRIODIQUES
CREATE TABLE IF NOT EXISTS public.declarations_tva_pharma (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
    periode_mois SMALLINT NOT NULL CHECK (periode_mois BETWEEN 1 AND 12),
    periode_annee SMALLINT NOT NULL CHECK (periode_annee >= 2020),
    statut VARCHAR(50) DEFAULT 'brouillon', -- 'brouillon', 'declaree', 'payee'
    ca_medicaments_exonere NUMERIC(15, 2) DEFAULT 0,
    ca_taxable_ht NUMERIC(15, 2) DEFAULT 0,
    tva_collectee_brute NUMERIC(15, 2) DEFAULT 0,
    achats_medicaments_exonere NUMERIC(15, 2) DEFAULT 0,
    achats_taxables_ht NUMERIC(15, 2) DEFAULT 0,
    tva_deductible_achats NUMERIC(15, 2) DEFAULT 0,
    tva_deductible_charges NUMERIC(15, 2) DEFAULT 0,
    tva_regularisable_pv_perimes NUMERIC(15, 2) DEFAULT 0,
    total_tva_deductible NUMERIC(15, 2) DEFAULT 0,
    credit_tva_periode_precedente NUMERIC(15, 2) DEFAULT 0,
    tva_nette_due NUMERIC(15, 2) DEFAULT 0,
    credit_tva_a_reporter NUMERIC(15, 2) DEFAULT 0,
    date_declaration DATE,
    reference_teledeclaration VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE (gie_id, periode_mois, periode_annee)
);

ALTER TABLE public.declarations_tva_pharma ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Déclarations TVA visibles par l'officine" ON public.declarations_tva_pharma
    FOR ALL TO authenticated USING (
        gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid())
    );

-- INDEXES POUR LES PERFORMANCES
CREATE INDEX IF NOT EXISTS idx_destructions_gie ON public.produits_perimes_destructions(gie_id, date_destruction);
CREATE INDEX IF NOT EXISTS idx_retours_grossiste_gie ON public.retours_grossistes(gie_id, date_retour);
CREATE INDEX IF NOT EXISTS idx_declarations_tva_gie ON public.declarations_tva_pharma(gie_id, periode_annee, periode_mois);
