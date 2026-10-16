-- =========================================================================================
-- MIGRATION 44 : COMPTABILITÉ GÉNÉRALE ET ANALYTIQUE OFFICINALE (D-PHARMA)
-- Plan comptable SYSCOHADA adapté officine, écritures, grand livre et balance
-- =========================================================================================

-- 1. Table du Plan Comptable de l'Officine
CREATE TABLE IF NOT EXISTS public.plan_comptable_pharma (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gie_id UUID REFERENCES public.gies(id) ON DELETE CASCADE, -- NULL = plan de référence partagé
    compte VARCHAR(20) NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    classe SMALLINT NOT NULL,
    type VARCHAR(50) DEFAULT 'general', -- actif, passif, charge, produit
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE public.plan_comptable_pharma ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plan comptable consultable" ON public.plan_comptable_pharma
    FOR SELECT TO authenticated USING (
        gie_id IS NULL OR gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid())
    );

CREATE POLICY "Plan comptable modifiable par la pharmacie" ON public.plan_comptable_pharma
    FOR ALL TO authenticated USING (
        gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid())
    );

-- 2. Insertion des comptes de référence SYSCOHADA Officine
INSERT INTO public.plan_comptable_pharma (compte, libelle, classe, type, gie_id) VALUES
('101', 'Capital social / Fonds commercial officine', 1, 'passif', NULL),
('162', 'Emprunts auprès des établissements de crédit', 1, 'passif', NULL),
('215', 'Agencements & Frigos de stockage des médicaments', 2, 'actif', NULL),
('218', 'Matériel informatique, scanners code-barres & caisses', 2, 'actif', NULL),
('311', 'Stocks de médicaments sous ordonnance & OTC', 3, 'actif', NULL),
('312', 'Stocks de parapharmacie, hygiène & cosmétiques', 3, 'actif', NULL),
('318', 'Consommables pharmaceutiques (sachets, flacons)', 3, 'actif', NULL),
('401', 'Fournisseurs Grossistes & Labos (Laborex, Cophase...)', 4, 'passif', NULL),
('411', 'Clients / Patients au comptoir & Mutuelles', 4, 'actif', NULL),
('412', 'Créances IPM, Assurances & Tiers-Payant', 4, 'actif', NULL),
('421', 'Personnel (Préparateurs, Caissiers, Pharmaciens)', 4, 'passif', NULL),
('431', 'Sécurité sociale & Caisses de prévoyance (IPRES / CSS)', 4, 'passif', NULL),
('441', 'État - Impôts & Taxes', 4, 'passif', NULL),
('521', 'Banque de l''officine', 5, 'actif', NULL),
('531', 'Caisse principale du comptoir', 5, 'actif', NULL),
('571', 'Comptes Mobile Money (Wave, Orange Money)', 5, 'actif', NULL),
('601', 'Achats de médicaments auprès des grossistes', 6, 'charge', NULL),
('602', 'Achats de produits de parapharmacie', 6, 'charge', NULL),
('605', 'Électricité & Climatisation (Conservation chaîne de froid)', 6, 'charge', NULL),
('613', 'Loyer commercial de l''officine', 6, 'charge', NULL),
('622', 'Honoraires comptables & Gardes pharmaceutiques', 6, 'charge', NULL),
('631', 'Salaires et rémunérations du personnel', 6, 'charge', NULL),
('641', 'Charges sociales patronales', 6, 'charge', NULL),
('701', 'Ventes de médicaments au comptoir (Comptant & Ordonnance)', 7, 'produit', NULL),
('702', 'Ventes de produits de parapharmacie & matériel médical', 7, 'produit', NULL),
('706', 'Prestations de garde & conseils pharmaceutiques', 7, 'produit', NULL)
ON CONFLICT DO NOTHING;

-- 3. Table des Écritures Comptables
CREATE TABLE IF NOT EXISTS public.ecritures_comptables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
    journal VARCHAR(50) NOT NULL DEFAULT 'ventes', -- ventes, achats, caisse, banque, od
    date_ecriture DATE NOT NULL DEFAULT CURRENT_DATE,
    numero_piece VARCHAR(100),
    libelle TEXT NOT NULL,
    validee BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE public.ecritures_comptables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Écritures de la pharmacie" ON public.ecritures_comptables
    FOR ALL TO authenticated USING (
        gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid())
    );

-- 4. Table des Lignes d'Écritures (Débit / Crédit)
CREATE TABLE IF NOT EXISTS public.lignes_ecritures_comptables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ecriture_id UUID NOT NULL REFERENCES public.ecritures_comptables(id) ON DELETE CASCADE,
    gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
    compte VARCHAR(20) NOT NULL,
    libelle TEXT,
    debit NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
    credit NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);

ALTER TABLE public.lignes_ecritures_comptables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lignes d'écritures de la pharmacie" ON public.lignes_ecritures_comptables
    FOR ALL TO authenticated USING (
        gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid())
    );

CREATE INDEX IF NOT EXISTS idx_ecritures_pharma_gie ON public.ecritures_comptables(gie_id, date_ecriture);
CREATE INDEX IF NOT EXISTS idx_lignes_ecritures_pharma ON public.lignes_ecritures_comptables(ecriture_id);
CREATE INDEX IF NOT EXISTS idx_lignes_compte ON public.lignes_ecritures_comptables(compte);
