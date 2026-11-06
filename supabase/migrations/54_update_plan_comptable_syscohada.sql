-- =========================================================================================
-- MIGRATION 54 : MISE À JOUR COMPLÈTE DU PLAN COMPTABLE SYSCOHADA OFFICINE (D-PHARMA)
-- Conforme à la nomenclature officielle SYSCOHADA Révisé spécialité pharmacie d'officine
-- Incluant 551 pour Mobile Money, caisses 571/572, et la nomenclature complète classes 1 à 8
-- =========================================================================================

-- 1. Nettoyage des anciens comptes par défaut (gie_id IS NULL)
DELETE FROM public.plan_comptable_pharma WHERE gie_id IS NULL;

-- 2. Insertion du Plan Comptable SYSCOHADA Spécialité Pharmacie Officine
INSERT INTO public.plan_comptable_pharma (compte, libelle, classe, type, gie_id, actif) VALUES

-- CLASSE 1 : CAPITAUX ET RESSOURCES DURABLES
('101', 'Capital social (ou Capital individuel pour une officine en nom propre)', 1, 'passif', NULL, true),
('105', 'Primes liées au capital social', 1, 'passif', NULL, true),
('106', 'Réserves (légales, statutaires)', 1, 'passif', NULL, true),
('111', 'Report à nouveau créditeur', 1, 'passif', NULL, true),
('112', 'Report à nouveau débiteur', 1, 'passif', NULL, true),
('121', 'Résultat net de l''exercice (Bénéfice)', 1, 'passif', NULL, true),
('122', 'Résultat net de l''exercice (Perte)', 1, 'passif', NULL, true),
('131', 'Subventions d''investissement', 1, 'passif', NULL, true),
('161', 'Emprunts auprès des établissements de crédit (financement du fonds de commerce)', 1, 'passif', NULL, true),
('165', 'Dépôts et cautionnements reçus', 1, 'passif', NULL, true),

-- CLASSE 2 : ACTIF IMMOBILISÉ
('211', 'Frais de recherche et développement (ex: progiciel de gestion d''officine)', 2, 'actif', NULL, true),
('215', 'Fonds commercial (valeur d''achat de la patientèle / emplacement de la pharmacie)', 2, 'actif', NULL, true),
('221', 'Terrains', 2, 'actif', NULL, true),
('231', 'Bâtiments (locaux de la pharmacie)', 2, 'actif', NULL, true),
('241', 'Matériel et outillage (automates de dispensation, balances de précision)', 2, 'actif', NULL, true),
('242', 'Matériel de transport (véhicule de livraison de médicaments)', 2, 'actif', NULL, true),
('243', 'Matériel de bureau', 2, 'actif', NULL, true),
('244', 'Matériel informatique (postes de vente comptoir, serveurs)', 2, 'actif', NULL, true),
('245', 'Agencements, aménagements et installations (rayonnages, comptoirs, enseigne lumineuse, croix verte)', 2, 'actif', NULL, true),
('274', 'Prêts octroyés', 2, 'actif', NULL, true),
('275', 'Dépôts et cautionnements versés (caution bail commercial)', 2, 'actif', NULL, true),

-- CLASSE 3 : STOCKS ET EN-COURS
('311', 'Stocks de marchandises – Médicaments éthiques / Princeps', 3, 'actif', NULL, true),
('312', 'Stocks de marchandises – Médicaments Génériques', 3, 'actif', NULL, true),
('313', 'Stocks de marchandises – Parapharmacie et cosmétiques', 3, 'actif', NULL, true),
('314', 'Stocks de marchandises – Matériel médical et orthopédie', 3, 'actif', NULL, true),
('315', 'Stocks de marchandises – Préparations magistrales et officinales', 3, 'actif', NULL, true),
('335', 'Stocks de produits finis (préparations réalisées à l''avance)', 3, 'actif', NULL, true),
('391', 'Dépréciations des stocks de marchandises (produits périmés ou obsolètes)', 3, 'actif', NULL, true),

-- CLASSE 4 : COMPTES DE TIERS
('401', 'Fournisseurs (Grossistes-répartiteurs comme Laborex, Ubipharm, Copharma, ou laboratoires directs)', 4, 'passif', NULL, true),
('404', 'Fournisseurs d''immobilisations', 4, 'passif', NULL, true),
('4094', 'Fournisseurs - Créances pour retours et avoirs à recevoir', 4, 'actif', NULL, true),
('411', 'Clients – Ventes au comptoir (Espèces/Cartes)', 4, 'actif', NULL, true),
('412', 'Clients – Organismes de Tiers Payant (Mutuelles, Assurances, CNAM, IPM)', 4, 'actif', NULL, true),
('416', 'Clients créances douteuses ou litigieuses', 4, 'actif', NULL, true),
('421', 'Personnel, rémunérations dues (pharmaciens adjoints, préparateurs, stagiaires)', 4, 'passif', NULL, true),
('431', 'Organismes sociaux (sécurité sociale, caisses de retraite)', 4, 'passif', NULL, true),
('443', 'État, impôts sur le résultat', 4, 'passif', NULL, true),
('444', 'État, taxes sur le chiffre d''affaires (TVA collectée et déductible)', 4, 'passif', NULL, true),
('4431', 'État - TVA facturée / collectée sur cosmétiques & parapharmacie (18%)', 4, 'passif', NULL, true),
('4452', 'État - TVA déductible sur achats de cosmétiques & parapharmacie (18%)', 4, 'actif', NULL, true),
('467', 'Débiteurs ou créditeurs divers', 4, 'passif', NULL, true),

-- CLASSE 5 : COMPTES DE TRÉSORERIE
('521', 'Banques locales (comptes d''exploitation de la pharmacie)', 5, 'actif', NULL, true),
('531', 'Chèques à encaisser (chèques reçus des clients ou mutuelles)', 5, 'actif', NULL, true),
('551', 'Comptes Mobile money (Wave, Orange Money, Free Money)', 5, 'actif', NULL, true),
('561', 'Banques, crédits de trésorerie (découverts bancaires courants)', 5, 'passif', NULL, true),
('571', 'Caisse principale de l''officine', 5, 'actif', NULL, true),
('572', 'Caisses secondaires (fonds de roulement des différents postes de vente / comptoirs)', 5, 'actif', NULL, true),
('585', 'Virements de fonds (liens caisses vers banque / transferts internes)', 5, 'actif', NULL, true),

-- CLASSE 6 : COMPTES DE CHARGES
('601', 'Achats de marchandises (médicaments et parapharmacie)', 6, 'charge', NULL, true),
('603', 'Variations des stocks de marchandises', 6, 'charge', NULL, true),
('605', 'Achats de fournitures non stockables (eau, électricité pour les réfrigérateurs à vaccins)', 6, 'charge', NULL, true),
('611', 'Transports sur achats / ventes', 6, 'charge', NULL, true),
('622', 'Locations et charges locatives (loyer du local commercial)', 6, 'charge', NULL, true),
('624', 'Entretien, réparations et maintenance (maintenance du logiciel de gestion et des terminaux)', 6, 'charge', NULL, true),
('625', 'Primes d''assurance (responsabilité civile professionnelle du pharmacien, assurance stocks)', 6, 'charge', NULL, true),
('632', 'Rémunérations d''intermédiaires et honoraires (comptable, conseil juridique)', 6, 'charge', NULL, true),
('633', 'Frais de télécommunications (abonnements internet pour les télétransmissions)', 6, 'charge', NULL, true),
('641', 'Impôts et taxes directs (patentes, licences)', 6, 'charge', NULL, true),
('6581', 'Pertes sur produits périmés ou avariés (Sorties PV officiel)', 6, 'charge', NULL, true),
('661', 'Rémunérations directes versées au personnel', 6, 'charge', NULL, true),
('663', 'Charges sociales (parts patronales)', 6, 'charge', NULL, true),
('671', 'Intérêts des dettes financières (intérêts de l''emprunt d''acquisition)', 6, 'charge', NULL, true),
('681', 'Dotations aux amortissements des immobilisations', 6, 'charge', NULL, true),

-- CLASSE 7 : COMPTES DE PRODUITS
('701', 'Ventes de marchandises – Médicaments sous ordonnance (soumis ou non à prescription)', 7, 'produit', NULL, true),
('702', 'Ventes de marchandises – Produits de parapharmacie et cosmétiques', 7, 'produit', NULL, true),
('703', 'Ventes de marchandises – Matériel médical et orthopédie', 7, 'produit', NULL, true),
('705', 'Ventes de produits finis (préparations magistrales)', 7, 'produit', NULL, true),
('707', 'Remises, rabais et ristournes accordés', 7, 'produit', NULL, true),
('754', 'Subventions d''exploitation reçues', 7, 'produit', NULL, true),
('771', 'Intérêts et produits assimilés', 7, 'produit', NULL, true),
('781', 'Reprises d''amortissements et de provisions', 7, 'produit', NULL, true),

-- CLASSE 8 : COMPTES DE L'AUTRE ACTIVITÉ ORDINAIRE (HAO) ET ÉLÉMENTS EXTRAORDINAIRES
('811', 'Valeurs comptables des cessions d''immobilisations (ex: revente d''un automate)', 8, 'charge', NULL, true),
('821', 'Produits des cessions d''immobilisations', 8, 'produit', NULL, true),
('831', 'Charges hors activités ordinaires (pénalités, sinistres)', 8, 'charge', NULL, true),
('841', 'Produits hors activités ordinaires (indemnités d''assurance reçues après sinistre)', 8, 'produit', NULL, true)

ON CONFLICT DO NOTHING;
