-- Migration 43 : Mise à jour des tarifs d'abonnement D-PHARMA
-- 75 000 FCFA / an pour les Pharmacies (Officines)
-- 50 000 FCFA / an pour les Fournisseurs / Laboratoires

-- 1. Insérer ou mettre à jour les forfaits 'pharmacie' et 'fournisseur'
insert into public.tarif_abonnement (niveau, prix_annuel, description)
values
  ('pharmacie', 75000, 'Abonnement Annuel Pharmacie / Officine (POS, stocks, péremptions, caisse)'),
  ('fournisseur', 50000, 'Abonnement Annuel Fournisseur / Laboratoire (catalogue, commandes, livraisons)')
on conflict (niveau) do update set
  prix_annuel = excluded.prix_annuel,
  description = excluded.description;

-- 2. Conserver les anciens enregistrements pour rétrocompatibilité avec les GIE existants
update public.tarif_abonnement
set prix_annuel = 75000, description = 'Abonnement Annuel Pharmacie (équivalent Standard/Medium)'
where niveau in ('standard', 'medium');

update public.tarif_abonnement
set prix_annuel = 75000, description = 'Abonnement Annuel Pharmacie (équivalent Premium)'
where niveau = 'premium';
