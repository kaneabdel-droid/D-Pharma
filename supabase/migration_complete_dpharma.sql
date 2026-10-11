-- =========================================================================================
-- MIGRATION COMPLÈTE & NETTOYAGE D-PHARMA (Officines Pharmaceutiques)
-- Projet Supabase : https://supabase.com/dashboard/project/tgnqcqfynkvmocxqdxyc
-- À exécuter dans le SQL Editor de Supabase
-- =========================================================================================

-- 1. SUPPRESSION DÉFINITIVE DE TOUT L'ANCIEN SCHÉMA AGRICOLE (SIGGIE)
DROP TABLE IF EXISTS public.distribution_intrants CASCADE;
DROP TABLE IF EXISTS public.credits CASCADE;
DROP TABLE IF EXISTS public.factures CASCADE;
DROP TABLE IF EXISTS public.materiels CASCADE;
DROP TABLE IF EXISTS public.intrants CASCADE;
DROP TABLE IF EXISTS public.campagnes CASCADE;
DROP TABLE IF EXISTS public.membres CASCADE;

-- 2. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. STRUCTURE DES PHARMACIES (TABLE GIES / TENANTS)
ALTER TABLE public.gies 
    ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'pharmacie',
    ADD COLUMN IF NOT EXISTS essai_expire_le TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '14 days'),
    ADD COLUMN IF NOT EXISTS compte_verrouille BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS devise VARCHAR(10) DEFAULT 'XOF',
    ADD COLUMN IF NOT EXISTS pays VARCHAR(10) DEFAULT 'SN',
    ADD COLUMN IF NOT EXISTS pays_nom VARCHAR(100) DEFAULT 'Sénégal',
    ADD COLUMN IF NOT EXISTS ninea VARCHAR(100),
    ADD COLUMN IF NOT EXISTS registre_commerce VARCHAR(100),
    ADD COLUMN IF NOT EXISTS telephone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS adresse TEXT,
    ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 4. STRUCTURE DES UTILISATEURS (PERSONNEL DE LA PHARMACIE)
ALTER TABLE public.utilisateurs 
    ADD COLUMN IF NOT EXISTS permissions JSONB;

-- 5. TARIFS D'ABONNEMENT SAAS
CREATE TABLE IF NOT EXISTS public.tarif_abonnement (
    niveau VARCHAR(50) PRIMARY KEY,
    prix_annuel NUMERIC(15, 2) NOT NULL,
    description TEXT
);

INSERT INTO public.tarif_abonnement (niveau, prix_annuel, description)
VALUES 
    ('pharmacie', 75000, 'Abonnement Annuel Officine Pharmaceutique (POS, stocks, péremptions, caisse)'),
    ('fournisseur', 50000, 'Abonnement Annuel Fournisseur / Laboratoire (commandes, livraisons)'),
    ('standard', 75000, 'Abonnement Standard Officine'),
    ('medium', 75000, 'Abonnement Medium Officine'),
    ('premium', 75000, 'Abonnement Premium Officine')
ON CONFLICT (niveau) DO UPDATE SET 
    prix_annuel = EXCLUDED.prix_annuel,
    description = EXCLUDED.description;

-- 6. PAIEMENTS D'ABONNEMENT & PRODUITS CHARIOW / MAKETOU
CREATE TABLE IF NOT EXISTS public.abonnement_paiements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
    montant NUMERIC(15, 2) NOT NULL,
    devise VARCHAR(10) DEFAULT 'XOF',
    statut VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed
    provider VARCHAR(50) DEFAULT 'maketou', -- maketou, chariow, moneroo, bictorys, virement
    provider_reference VARCHAR(255),
    doublon BOOLEAN DEFAULT false,
    niveau VARCHAR(50) DEFAULT 'pharmacie',
    mois INTEGER DEFAULT 12,
    duree_mois INTEGER DEFAULT 12,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.maketou_produits (
    montant NUMERIC(15, 2) PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.chariow_produits (
    montant NUMERIC(15, 2) PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.paiement_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL,
    event_id VARCHAR(255) UNIQUE,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 7. CLIENTS EXTERNES / PATIENTS
CREATE TABLE IF NOT EXISTS public.clients_externes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    telephone VARCHAR(50),
    adresse TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 8. CATALOGUE GLOBAL DES MÉDICAMENTS (DCI & SPÉCIALITÉS)
CREATE TABLE IF NOT EXISTS public.medicaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_barres VARCHAR(255) UNIQUE,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    principe_actif VARCHAR(255),
    forme VARCHAR(100),
    dosage VARCHAR(100),
    soumis_ordonnance BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 9. GESTION DES STOCKS OFFICINE (FEFO / PÉREMPTIONS / LOTS)
CREATE TABLE IF NOT EXISTS public.stocks_pharmacie (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
    medicament_id UUID NOT NULL REFERENCES public.medicaments(id) ON DELETE CASCADE,
    quantite NUMERIC(10, 2) NOT NULL DEFAULT 0,
    seuil_alerte NUMERIC(10, 2) DEFAULT 5,
    date_peremption DATE NOT NULL,
    prix_vente NUMERIC(15, 2) NOT NULL,
    prix_achat NUMERIC(15, 2) DEFAULT 0,
    lot VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 10. FOURNISSEURS & GROSSISTES (LABOREX, COPHASE, SODIPHARM, PLANET PHARMA, ETC.)
CREATE TABLE IF NOT EXISTS public.fournisseurs_labo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    contact_telephone VARCHAR(50),
    adresse TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 11. COMMANDES FOURNISSEUR
CREATE TABLE IF NOT EXISTS public.commandes_labo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
    fournisseur_id UUID NOT NULL REFERENCES public.fournisseurs_labo(id) ON DELETE CASCADE,
    statut VARCHAR(50) NOT NULL DEFAULT 'brouillon', -- brouillon, envoyee, reçue_partielle, complete
    date_commande TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    date_reception TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.lignes_commande_labo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commande_id UUID NOT NULL REFERENCES public.commandes_labo(id) ON DELETE CASCADE,
    medicament_id UUID NOT NULL REFERENCES public.medicaments(id) ON DELETE CASCADE,
    quantite_commandee NUMERIC(10, 2) NOT NULL,
    quantite_recue NUMERIC(10, 2) DEFAULT 0,
    prix_achat_unitaire NUMERIC(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 12. VENTES POS (POINT DE VENTE OFFICINE)
CREATE TABLE IF NOT EXISTS public.ventes_pharmacie (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients_externes(id) ON DELETE SET NULL,
    montant_total NUMERIC(15, 2) NOT NULL,
    moyen_paiement VARCHAR(50) NOT NULL, -- especes, carte, wave, orange_money
    date_vente TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    vendeur_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.lignes_vente_pharmacie (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vente_id UUID NOT NULL REFERENCES public.ventes_pharmacie(id) ON DELETE CASCADE,
    medicament_id UUID NOT NULL REFERENCES public.medicaments(id) ON DELETE CASCADE,
    quantite NUMERIC(10, 2) NOT NULL,
    prix_unitaire NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 13. TRÉSORERIE DE LA PHARMACIE (CAISSE & COMPTES)
CREATE TABLE IF NOT EXISTS public.comptes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'caisse', -- caisse, banque, mobile_money
    solde NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
    compte_id UUID REFERENCES public.comptes(id) ON DELETE SET NULL,
    type_transaction VARCHAR(50) NOT NULL, -- entree, sortie
    montant NUMERIC(15, 2) NOT NULL,
    motif TEXT NOT NULL,
    date_transaction DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.imputations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- charge_exploitation, loyer, salaire, electricite, etc.
    libelle VARCHAR(255) NOT NULL,
    montant NUMERIC(15, 2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gie_id UUID REFERENCES public.gies(id) ON DELETE SET NULL,
    utilisateur_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sujet VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    reponse TEXT,
    statut VARCHAR(50) DEFAULT 'ouvert',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 14. INDEX DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_medicaments_code_barres ON public.medicaments(code_barres);
CREATE INDEX IF NOT EXISTS idx_medicaments_nom ON public.medicaments(nom);
CREATE INDEX IF NOT EXISTS idx_stocks_pharmacie_gie ON public.stocks_pharmacie(gie_id);
CREATE INDEX IF NOT EXISTS idx_stocks_pharmacie_peremption ON public.stocks_pharmacie(date_peremption);
CREATE INDEX IF NOT EXISTS idx_ventes_pharmacie_gie ON public.ventes_pharmacie(gie_id);
CREATE INDEX IF NOT EXISTS idx_commandes_labo_gie ON public.commandes_labo(gie_id);

-- 15. SÉCURITÉ ROW LEVEL SECURITY (RLS)
ALTER TABLE public.gies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocks_pharmacie ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commandes_labo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventes_pharmacie ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lignes_vente_pharmacie ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comptes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imputations ENABLE ROW LEVEL SECURITY;

-- Politiques de lecture / écriture sécurisées par Officine
DO $$
BEGIN
    DROP POLICY IF EXISTS "Pharmacie lecture de ses stocks" ON public.stocks_pharmacie;
    DROP POLICY IF EXISTS "Pharmacie gestion de ses stocks" ON public.stocks_pharmacie;
    DROP POLICY IF EXISTS "Pharmacie gestion ventes" ON public.ventes_pharmacie;
    DROP POLICY IF EXISTS "Pharmacie gestion commandes" ON public.commandes_labo;
    DROP POLICY IF EXISTS "Catalogue medicaments public en lecture" ON public.medicaments;
END $$;

ALTER TABLE public.medicaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Catalogue medicaments public en lecture" ON public.medicaments
    FOR SELECT TO public USING (true);

CREATE POLICY "Catalogue medicaments insertion authentifiee" ON public.medicaments
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Pharmacie gestion de ses stocks" ON public.stocks_pharmacie
    FOR ALL TO authenticated USING (gie_id IN (
        SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()
    ));

CREATE POLICY "Pharmacie gestion ventes" ON public.ventes_pharmacie
    FOR ALL TO authenticated USING (gie_id IN (
        SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()
    ));

CREATE POLICY "Pharmacie gestion commandes" ON public.commandes_labo
    FOR ALL TO authenticated USING (gie_id IN (
        SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()
    ));

CREATE POLICY "Pharmacie gestion comptes" ON public.comptes
    FOR ALL TO authenticated USING (gie_id IN (
        SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()
    ));

CREATE POLICY "Pharmacie gestion transactions" ON public.transactions
    FOR ALL TO authenticated USING (gie_id IN (
        SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()
    ));

CREATE POLICY "Pharmacie gestion imputations" ON public.imputations
    FOR ALL TO authenticated USING (gie_id IN (
        SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()
    ));

-- 16. JEU INITIAL DE MÉDICAMENTS COURANTS (CATALOGUE DE DÉPART)
INSERT INTO public.medicaments (nom, code_barres, principe_actif, forme, dosage, soumis_ordonnance)
VALUES
    ('Paracétamol 1g', '3400935824915', 'Paracétamol', 'Comprimé', '1000 mg', false),
    ('Paracétamol Sirop Enfant', '3400936239121', 'Paracétamol', 'Sirop', '2.4%', false),
    ('Amoxicilline 500mg', '3400936528713', 'Amoxicilline', 'Gélule', '500 mg', true),
    ('Amoxicilline + Acide Clavulanique 1g', '3400934178231', 'Amoxicilline/Acide Clavulanique', 'Comprimé dispersible', '1000 mg / 125 mg', true),
    ('Ibuprofène 400mg', '3400935517824', 'Ibuprofène', 'Comprimé', '400 mg', false),
    ('Oméprazole 20mg', '3400936852412', 'Oméprazole', 'Gélule gastro-résistante', '20 mg', false),
    ('Artéméther + Luméfantrine (Coartem)', '3400938456123', 'Artéméther / Luméfantrine', 'Comprimé', '20 mg / 120 mg', true),
    ('Cétirizine 10mg', '3400935123490', 'Cétirizine', 'Comprimé pelliculé', '10 mg', false),
    ('Sérum Physiologique 0.9%', '3400931245890', 'Chlorure de sodium', 'Dosette unidose', '5 ml', false),
    ('Bétadine Dermique 10%', '3400931892345', 'Povidone iodée', 'Solution flacon', '125 ml', false)
ON CONFLICT (code_barres) DO NOTHING;
