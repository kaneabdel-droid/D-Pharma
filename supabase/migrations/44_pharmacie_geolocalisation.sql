-- Migration 44 : Géolocalisation et hiérarchisation géographique des pharmacies (D-PHARMA)
-- Ajoute les champs de localisation fine (région, ville, commune, coordonnées GPS, garde, horaires)
-- pour la recherche client priorisant la ville et les localités les plus proches.

-- 1. Ajout des colonnes sur la table gies
ALTER TABLE public.gies
  ADD COLUMN IF NOT EXISTS region VARCHAR(100),
  ADD COLUMN IF NOT EXISTS ville VARCHAR(100),
  ADD COLUMN IF NOT EXISTS commune VARCHAR(100),
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 6),
  ADD COLUMN IF NOT EXISTS horaires VARCHAR(255) DEFAULT '8h00 - 22h00',
  ADD COLUMN IF NOT EXISTS est_de_garde BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS service_urgence BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS telephone_whatsapp VARCHAR(50);

-- Index pour accélérer les recherches géographiques
CREATE INDEX IF NOT EXISTS idx_gies_region_ville ON public.gies(region, ville);
CREATE INDEX IF NOT EXISTS idx_gies_garde ON public.gies(est_de_garde);

-- 2. Mise à jour de la pharmacie existante (Pharmacie Centrale de Dakar)
UPDATE public.gies
SET 
  region = 'Dakar',
  ville = 'Dakar',
  commune = 'Dakar-Plateau',
  adresse = '12 Avenue Cheikh Anta Diop, Dakar',
  telephone = '+221 33 824 15 20',
  telephone_whatsapp = '+221 77 824 15 20',
  latitude = 14.693700,
  longitude = -17.444100,
  horaires = '24h/24 - Service continu',
  est_de_garde = true,
  service_urgence = true
WHERE id = 'd4cce610-339b-4747-a3e6-a3eb8751a49d';

-- 3. Mise à jour de update_gie_infos pour accepter région, ville, commune
CREATE OR REPLACE FUNCTION public.update_gie_infos_geo(
  p_nom VARCHAR,
  p_adresse TEXT,
  p_telephone VARCHAR,
  p_telephone_whatsapp VARCHAR,
  p_email VARCHAR,
  p_identification VARCHAR,
  p_devise VARCHAR,
  p_region VARCHAR,
  p_ville VARCHAR,
  p_commune VARCHAR,
  p_horaires VARCHAR,
  p_est_de_garde BOOLEAN
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_gie_id UUID;
BEGIN
  SELECT gie_id INTO v_gie_id FROM public.utilisateurs WHERE id = auth.uid();
  IF v_gie_id IS NULL THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF p_nom IS NULL OR length(trim(p_nom)) = 0 THEN
    RAISE EXCEPTION 'Le nom est requis';
  END IF;

  UPDATE public.gies
  SET nom = trim(p_nom),
      adresse = nullif(trim(coalesce(p_adresse, '')), ''),
      telephone = nullif(trim(coalesce(p_telephone, '')), ''),
      telephone_whatsapp = nullif(trim(coalesce(p_telephone_whatsapp, '')), ''),
      email = nullif(trim(coalesce(p_email, '')), ''),
      identification = nullif(trim(coalesce(p_identification, '')), ''),
      devise = coalesce(p_devise, devise),
      region = nullif(trim(coalesce(p_region, '')), ''),
      ville = nullif(trim(coalesce(p_ville, '')), ''),
      commune = nullif(trim(coalesce(p_commune, '')), ''),
      horaires = coalesce(p_horaires, horaires),
      est_de_garde = coalesce(p_est_de_garde, false)
  WHERE id = v_gie_id;
END;
$$;
