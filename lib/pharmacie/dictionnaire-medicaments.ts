/**
 * Référentiel pharmaceutique de base (Sénégal & Afrique de l'Ouest)
 * Permet l'auto-complétion instantanée du nom, de la forme/dosage,
 * de la catégorie et du prix indicatif lors du scan de code-barres (CIP13/EAN13 ou GS1 DataMatrix).
 */

export type MedicamentReferentiel = {
  code_barres: string;
  nom: string;
  principe_actif?: string; // Formule / DCI (ex: Paracétamol, Tiémonium méthylsulfate)
  dosage?: string;
  forme?: string;
  type_produit: 'medicament' | 'materiel' | 'service';
  prix_vente_indicatif: number;
  prix_achat_indicatif?: number;
  categorie?: string;
};

export const DICTIONNAIRE_PHARMA: Record<string, MedicamentReferentiel> = {
  // --- MÉDICAMENTS COURANTS SÉNÉGAL / AFRIQUE DE L'OUEST ---
  '6009819850787': {
    code_barres: '6009819850787',
    nom: 'Phartrim 480 mg (Cotrimoxazole)',
    principe_actif: 'Cotrimoxazole (Sulfaméthoxazole + Triméthoprime)',
    dosage: '480 mg',
    forme: 'Boîte de 20 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 1500,
    prix_achat_indicatif: 950,
    categorie: 'Antibactérien'
  },
  '6008819859697': {
    code_barres: '6008819859697',
    nom: 'Phartrim 480 mg (Cotrimoxazole)',
    principe_actif: 'Cotrimoxazole (Sulfaméthoxazole + Triméthoprime)',
    dosage: '480 mg',
    forme: 'Boîte de 20 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 1500,
    prix_achat_indicatif: 950,
    categorie: 'Antibactérien'
  },
  '600882985697': {
    code_barres: '600882985697',
    nom: 'Phartrim 480 mg',
    principe_actif: 'Cotrimoxazole (Sulfaméthoxazole + Triméthoprime)',
    dosage: '480 mg',
    forme: 'Boîte de 20 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 1500,
    prix_achat_indicatif: 950,
    categorie: 'Antibactérien'
  },
  '6118000081760': {
    code_barres: '6118000081760',
    nom: 'Viscéralgine 50 mg (Tiémonium méthylsulfate)',
    principe_actif: 'Tiémonium méthylsulfate',
    dosage: '50 mg',
    forme: 'Boîte de 20 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 1615,
    prix_achat_indicatif: 1100,
    categorie: 'Antispasmodique'
  },
  '06118000081760': {
    code_barres: '6118000081760',
    nom: 'Viscéralgine 50 mg (Tiémonium méthylsulfate)',
    principe_actif: 'Tiémonium méthylsulfate',
    dosage: '50 mg',
    forme: 'Boîte de 20 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 1615,
    prix_achat_indicatif: 1100,
    categorie: 'Antispasmodique'
  },
  '200000618162': {
    code_barres: '200000618162',
    nom: 'Viscéralgine 50 mg (Tiémonium méthylsulfate)',
    principe_actif: 'Tiémonium méthylsulfate',
    dosage: '50 mg',
    forme: 'Boîte de 20 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 1615,
    prix_achat_indicatif: 1100,
    categorie: 'Antispasmodique'
  },
  '0200000618162': {
    code_barres: '200000618162',
    nom: 'Viscéralgine 50 mg (Tiémonium méthylsulfate)',
    principe_actif: 'Tiémonium méthylsulfate',
    dosage: '50 mg',
    forme: 'Boîte de 20 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 1615,
    prix_achat_indicatif: 1100,
    categorie: 'Antispasmodique'
  },
  '2000006181625': {
    code_barres: '2000006181625',
    nom: 'Viscéralgine 50 mg (Tiémonium méthylsulfate)',
    principe_actif: 'Tiémonium méthylsulfate',
    dosage: '50 mg',
    forme: 'Boîte de 20 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 1615,
    prix_achat_indicatif: 1100,
    categorie: 'Antispasmodique'
  },
  '3400931181628': {
    code_barres: '3400931181628',
    nom: 'Viscéralgine 50 mg (Tiémonium méthylsulfate)',
    principe_actif: 'Tiémonium méthylsulfate',
    dosage: '50 mg',
    forme: 'Boîte de 20 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 1615,
    prix_achat_indicatif: 1100,
    categorie: 'Antispasmodique'
  },
  '3400930061816': {
    code_barres: '3400930061816',
    nom: 'Viscéralgine 50 mg (Tiémonium méthylsulfate)',
    principe_actif: 'Tiémonium méthylsulfate',
    dosage: '50 mg',
    forme: 'Boîte de 20 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 1615,
    prix_achat_indicatif: 1100,
    categorie: 'Antispasmodique'
  },
  '3400930061817': {
    code_barres: '3400930061817',
    nom: 'Viscéralgine Sirop 125ml',
    principe_actif: 'Tiémonium méthylsulfate',
    dosage: '2 mg/ml',
    forme: 'Flacon de 125 ml',
    type_produit: 'medicament',
    prix_vente_indicatif: 1850,
    prix_achat_indicatif: 1250,
    categorie: 'Antispasmodique'
  },
  '8906067081629': {
    code_barres: '8906067081629',
    nom: 'Artrim-GH (Artéméther + Luméfantrine)',
    principe_actif: 'Artéméther + Luméfantrine',
    dosage: '20/120 mg',
    forme: 'Boîte de 24 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 2800,
    prix_achat_indicatif: 1900,
    categorie: 'Antipaludique CTA'
  },

  // --- ANALGÉSIQUES & ANTIPYRÉTIQUES ---
  '3400935955838': {
    code_barres: '3400935955838',
    nom: 'Doliprane 1000 mg comprimés',
    principe_actif: 'Paracétamol',
    dosage: '1000 mg',
    forme: 'Boîte de 8 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 1400,
    prix_achat_indicatif: 980,
    categorie: 'Antalgique / Antipyrétique'
  },
  '03400935955838': {
    code_barres: '3400935955838',
    nom: 'Doliprane 1000 mg comprimés',
    principe_actif: 'Paracétamol',
    dosage: '1000 mg',
    forme: 'Boîte de 8 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 1400,
    prix_achat_indicatif: 980,
    categorie: 'Antalgique / Antipyrétique'
  },
  '3400935824915': {
    code_barres: '3400935824915',
    nom: 'Doliprane 1000 mg comprimés effervescents',
    principe_actif: 'Paracétamol',
    dosage: '1000 mg',
    forme: 'Boîte de 8 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 1500,
    prix_achat_indicatif: 1050,
    categorie: 'Antalgique / Antipyrétique'
  },
  '03400935824915': {
    code_barres: '3400935824915',
    nom: 'Doliprane 1000 mg comprimés effervescents',
    principe_actif: 'Paracétamol',
    dosage: '1000 mg',
    forme: 'Boîte de 8 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 1500,
    prix_achat_indicatif: 1050,
    categorie: 'Antalgique / Antipyrétique'
  },
  '3400935987102': {
    code_barres: '3400935987102',
    nom: 'Doliprane 1000 mg gélules',
    principe_actif: 'Paracétamol',
    dosage: '1000 mg',
    forme: 'Boîte de 8 gélules',
    type_produit: 'medicament',
    prix_vente_indicatif: 1500,
    prix_achat_indicatif: 1050,
    categorie: 'Antalgique / Antipyrétique'
  },
  '3400935987041': {
    code_barres: '3400935987041',
    nom: 'Doliprane 1000 mg comprimés',
    principe_actif: 'Paracétamol',
    dosage: '1000 mg',
    forme: 'Boîte de 8 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 1400,
    prix_achat_indicatif: 980,
    categorie: 'Antalgique / Antipyrétique'
  },
  '3400935986877': {
    code_barres: '3400935986877',
    nom: 'Doliprane 500 mg gélules',
    principe_actif: 'Paracétamol',
    dosage: '500 mg',
    forme: 'Boîte de 16 gélules',
    type_produit: 'medicament',
    prix_vente_indicatif: 1300,
    prix_achat_indicatif: 900,
    categorie: 'Antalgique / Antipyrétique'
  },
  '3400935398243': {
    code_barres: '3400935398243',
    nom: 'Doliprane 2.4% sirop pédiatrique 100ml',
    principe_actif: 'Paracétamol',
    dosage: '2.4%',
    forme: 'Flacon de 100 ml',
    type_produit: 'medicament',
    prix_vente_indicatif: 1850,
    prix_achat_indicatif: 1300,
    categorie: 'Pédiatrie'
  },
  '3400933560640': {
    code_barres: '3400933560640',
    nom: 'Efferalgan 500 mg comprimés effervescents',
    principe_actif: 'Paracétamol',
    dosage: '500 mg',
    forme: 'Boîte de 16 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 1600,
    prix_achat_indicatif: 1100,
    categorie: 'Antalgique'
  },
  '3400935579970': {
    code_barres: '3400935579970',
    nom: 'Efferalgan 1 g comprimés effervescents',
    principe_actif: 'Paracétamol',
    dosage: '1 g',
    forme: 'Boîte de 8 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 1750,
    prix_achat_indicatif: 1250,
    categorie: 'Antalgique'
  },
  '3400930001015': {
    code_barres: '3400930001015',
    nom: 'Paracétamol Générique 500 mg',
    principe_actif: 'Paracétamol',
    dosage: '500 mg',
    forme: 'Boîte de 20 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 600,
    prix_achat_indicatif: 350,
    categorie: 'Antalgique'
  },
  '3400930001022': {
    code_barres: '3400930001022',
    nom: 'Paracétamol Générique 1000 mg',
    principe_actif: 'Paracétamol',
    dosage: '1000 mg',
    forme: 'Boîte de 10 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 900,
    prix_achat_indicatif: 550,
    categorie: 'Antalgique'
  },

  // --- ANTIPALUDIQUES (CTA & TRAITEMENTS DE RÉFÉRENCE) ---
  '3400937402016': {
    code_barres: '3400937402016',
    nom: 'Coartem 20/120 mg (Artéméther + Luméfantrine)',
    principe_actif: 'Artéméther + Luméfantrine',
    dosage: '20 mg / 120 mg',
    forme: 'Boîte de 24 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 3500,
    prix_achat_indicatif: 2600,
    categorie: 'Antipaludique'
  },
  '6151100000000': {
    code_barres: '6151100000000',
    nom: 'Artefan 20/120 mg',
    principe_actif: 'Artéméther + Luméfantrine',
    dosage: '20/120 mg',
    forme: 'Boîte de 24 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 3000,
    prix_achat_indicatif: 2200,
    categorie: 'Antipaludique'
  },
  '6151100000017': {
    code_barres: '6151100000017',
    nom: 'Lumartem Dispersible 20/120 mg',
    principe_actif: 'Artéméther + Luméfantrine',
    dosage: '20/120 mg',
    forme: 'Boîte de 6 comprimés dispersibles',
    type_produit: 'medicament',
    prix_vente_indicatif: 1800,
    prix_achat_indicatif: 1200,
    categorie: 'Antipaludique pédiatrique'
  },

  // --- ANTIBIOTIQUES ---
  '3400936528713': {
    code_barres: '3400936528713',
    nom: 'Amoxicilline 500 mg gélules',
    principe_actif: 'Amoxicilline',
    dosage: '500 mg',
    forme: 'Boîte de 12 gélules',
    type_produit: 'medicament',
    prix_vente_indicatif: 1950,
    prix_achat_indicatif: 1350,
    categorie: 'Antibiotique'
  },
  '03400936528713': {
    code_barres: '3400936528713',
    nom: 'Amoxicilline 500 mg gélules',
    principe_actif: 'Amoxicilline',
    dosage: '500 mg',
    forme: 'Boîte de 12 gélules',
    type_produit: 'medicament',
    prix_vente_indicatif: 1950,
    prix_achat_indicatif: 1350,
    categorie: 'Antibiotique'
  },
  '3400936307374': {
    code_barres: '3400936307374',
    nom: 'Amoxicilline 500 mg gélules',
    principe_actif: 'Amoxicilline',
    dosage: '500 mg',
    forme: 'Boîte de 12 gélules',
    type_produit: 'medicament',
    prix_vente_indicatif: 1950,
    prix_achat_indicatif: 1350,
    categorie: 'Antibiotique'
  },
  '3400936307725': {
    code_barres: '3400936307725',
    nom: 'Amoxicilline 1 g comprimés dispersibles',
    principe_actif: 'Amoxicilline',
    dosage: '1 g',
    forme: 'Boîte de 14 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 2900,
    prix_achat_indicatif: 2000,
    categorie: 'Antibiotique'
  },
  '3400934178231': {
    code_barres: '3400934178231',
    nom: 'Augmentin 1 g / 125 mg comprimés pelliculés',
    principe_actif: 'Amoxicilline + Acide Clavulanique',
    dosage: '1 g / 125 mg',
    forme: 'Boîte de 16 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 6500,
    prix_achat_indicatif: 4800,
    categorie: 'Antibiotique'
  },
  '03400934178231': {
    code_barres: '3400934178231',
    nom: 'Augmentin 1 g / 125 mg comprimés pelliculés',
    principe_actif: 'Amoxicilline + Acide Clavulanique',
    dosage: '1 g / 125 mg',
    forme: 'Boîte de 16 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 6500,
    prix_achat_indicatif: 4800,
    categorie: 'Antibiotique'
  },
  '3400934079868': {
    code_barres: '3400934079868',
    nom: 'Augmentin 1 g / 125 mg Adulte',
    principe_actif: 'Amoxicilline + Acide Clavulanique',
    dosage: '1 g / 125 mg',
    forme: 'Boîte de 16 sachets',
    type_produit: 'medicament',
    prix_vente_indicatif: 6500,
    prix_achat_indicatif: 4800,
    categorie: 'Antibiotique'
  },
  '3400934079929': {
    code_barres: '3400934079929',
    nom: 'Augmentin Enfant Suspension 100 mg/ml',
    principe_actif: 'Amoxicilline + Acide Clavulanique',
    dosage: '100 mg / 12.5 mg',
    forme: 'Flacon de 60 ml',
    type_produit: 'medicament',
    prix_vente_indicatif: 4200,
    prix_achat_indicatif: 3100,
    categorie: 'Antibiotique pédiatrique'
  },
  '3400936495675': {
    code_barres: '3400936495675',
    nom: 'Ciprofloxacine 500 mg',
    principe_actif: 'Ciprofloxacine',
    dosage: '500 mg',
    forme: 'Boîte de 10 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 2800,
    prix_achat_indicatif: 1900,
    categorie: 'Antibiotique'
  },
  '3400937748435': {
    code_barres: '3400937748435',
    nom: 'Azithromycine 500 mg',
    principe_actif: 'Azithromycine',
    dosage: '500 mg',
    forme: 'Boîte de 3 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 3400,
    prix_achat_indicatif: 2400,
    categorie: 'Antibiotique'
  },
  '3400930397554': {
    code_barres: '3400930397554',
    nom: 'Flagyl 500 mg (Métronidazole)',
    principe_actif: 'Métronidazole',
    dosage: '500 mg',
    forme: 'Boîte de 14 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 2200,
    prix_achat_indicatif: 1550,
    categorie: 'Anti-infectieux / Antiparasitaire'
  },
  '3400930397615': {
    code_barres: '3400930397615',
    nom: 'Flagyl 125 mg / 5 ml Suspension',
    principe_actif: 'Métronidazole',
    dosage: '125 mg/5ml',
    forme: 'Flacon de 120 ml',
    type_produit: 'medicament',
    prix_vente_indicatif: 2400,
    prix_achat_indicatif: 1700,
    categorie: 'Pédiatrie'
  },

  // --- ANTI-INFLAMMATOIRES & ANTISPASMODIQUES ---
  '3400936087795': {
    code_barres: '3400936087795',
    nom: 'Ibuprofène 400 mg',
    principe_actif: 'Ibuprofène',
    dosage: '400 mg',
    forme: 'Boîte de 20 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 1600,
    prix_achat_indicatif: 1100,
    categorie: 'Anti-inflammatoire (AINS)'
  },
  '3400936109961': {
    code_barres: '3400936109961',
    nom: 'Advil 400 mg comprimés enrobés',
    principe_actif: 'Ibuprofène',
    dosage: '400 mg',
    forme: 'Boîte de 14 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 2600,
    prix_achat_indicatif: 1850,
    categorie: 'Anti-inflammatoire'
  },
  '3400931969248': {
    code_barres: '3400931969248',
    nom: 'Spasfon comprimés (Phloroglucinol)',
    principe_actif: 'Phloroglucinol + Triméthylphloroglucinol',
    dosage: '80 mg',
    forme: 'Boîte de 30 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 2850,
    prix_achat_indicatif: 2050,
    categorie: 'Antispasmodique'
  },
  '3400933100341': {
    code_barres: '3400933100341',
    nom: 'Diclofénac 50 mg comprimés',
    principe_actif: 'Diclofénac sodique',
    dosage: '50 mg',
    forme: 'Boîte de 30 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 1700,
    prix_achat_indicatif: 1150,
    categorie: 'Anti-inflammatoire'
  },
  '3400932822145': {
    code_barres: '3400932822145',
    nom: 'Voltarène Emulgel 1% tube 50g',
    principe_actif: 'Diclofénac diéthylamine',
    dosage: '1%',
    forme: 'Tube de 50 g',
    type_produit: 'medicament',
    prix_vente_indicatif: 3200,
    prix_achat_indicatif: 2300,
    categorie: 'Anti-inflammatoire topique'
  },

  // --- DIGESTIF & GASTRO-ENTÉROLOGIE ---
  '3400936906232': {
    code_barres: '3400936906232',
    nom: 'Oméprazole 20 mg gélules gastro-résistantes',
    principe_actif: 'Oméprazole',
    dosage: '20 mg',
    forme: 'Boîte de 14 gélules',
    type_produit: 'medicament',
    prix_vente_indicatif: 2400,
    prix_achat_indicatif: 1600,
    categorie: 'Anti-ulcéreux'
  },
  '3400933221916': {
    code_barres: '3400933221916',
    nom: 'Smecta sachets (Diosmectite)',
    principe_actif: 'Diosmectite',
    dosage: '3 g',
    forme: 'Boîte de 30 sachets',
    type_produit: 'medicament',
    prix_vente_indicatif: 3900,
    prix_achat_indicatif: 2800,
    categorie: 'Anti-diarrhéique'
  },
  '3400934383439': {
    code_barres: '3400934383439',
    nom: 'Gaviscon suspension buvable en sachets',
    principe_actif: 'Alginate de sodium + Bicarbonate de sodium',
    dosage: 'Sachets-doses',
    forme: 'Boîte de 24 sachets',
    type_produit: 'medicament',
    prix_vente_indicatif: 3600,
    prix_achat_indicatif: 2600,
    categorie: 'Anti-acide / Reflux'
  },
  '3400932857444': {
    code_barres: '3400932857444',
    nom: 'Maalox comprimés à croquer',
    principe_actif: 'Hydroxyde d\'aluminium + Hydroxyde de magnésium',
    dosage: 'Hydroxydes Al/Mg',
    forme: 'Boîte de 40 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 2500,
    prix_achat_indicatif: 1750,
    categorie: 'Anti-acide'
  },

  // --- ANTALLERGIQUES & RESPIRATOIRE ---
  '3400936471969': {
    code_barres: '3400936471969',
    nom: 'Cétirizine 10 mg comprimés pelliculés',
    dosage: '10 mg',
    forme: 'Boîte de 15 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 1900,
    prix_achat_indicatif: 1300,
    categorie: 'Antiallergique'
  },
  '3400935384635': {
    code_barres: '3400935384635',
    nom: 'Loratadine 10 mg',
    dosage: '10 mg',
    forme: 'Boîte de 10 comprimés',
    type_produit: 'medicament',
    prix_vente_indicatif: 1800,
    prix_achat_indicatif: 1200,
    categorie: 'Antiallergique'
  },
  '3400932454179': {
    code_barres: '3400932454179',
    nom: 'Ventoline 100 µg aérosol doseur (Salbutamol)',
    dosage: '100 µg/dose',
    forme: 'Flacon pressurisé 200 doses',
    type_produit: 'medicament',
    prix_vente_indicatif: 3800,
    prix_achat_indicatif: 2800,
    categorie: 'Bronchodilatateur'
  },

  // --- ANTISEPTIQUES, HYGIÈNE & MATÉRIEL MÉDICAL ---
  '3400932585255': {
    code_barres: '3400932585255',
    nom: 'Bétadine dermique jaune 10% 125ml',
    dosage: '10%',
    forme: 'Flacon de 125 ml',
    type_produit: 'medicament',
    prix_vente_indicatif: 2300,
    prix_achat_indicatif: 1650,
    categorie: 'Antiseptique'
  },
  '3400932585484': {
    code_barres: '3400932585484',
    nom: 'Bétadine Scrub rouge 4% 125ml',
    dosage: '4%',
    forme: 'Flacon de 125 ml',
    type_produit: 'medicament',
    prix_vente_indicatif: 2400,
    prix_achat_indicatif: 1700,
    categorie: 'Antiseptique moussant'
  },
  '3400930000001': {
    code_barres: '3400930000001',
    nom: 'Sérum Physiologique stérile 0.9% (30 unidoses 5ml)',
    dosage: '0.9%',
    forme: 'Boîte de 30 dosettes',
    type_produit: 'materiel',
    prix_vente_indicatif: 2200,
    prix_achat_indicatif: 1500,
    categorie: 'Hygiène nasale / oculaire'
  },
  '3400930000002': {
    code_barres: '3400930000002',
    nom: 'Alcool modifié 70° 250ml',
    dosage: '70°',
    forme: 'Flacon 250 ml',
    type_produit: 'materiel',
    prix_vente_indicatif: 1200,
    prix_achat_indicatif: 800,
    categorie: 'Désinfectant'
  },
  '3400930000003': {
    code_barres: '3400930000003',
    nom: 'Éosine aqueuse 2% (10 dosettes de 5ml)',
    dosage: '2%',
    forme: 'Boîte de 10 unidoses',
    type_produit: 'materiel',
    prix_vente_indicatif: 1500,
    prix_achat_indicatif: 1000,
    categorie: 'Asséchant cutané'
  },
  '3400930000004': {
    code_barres: '3400930000004',
    nom: 'Compresses de gaze stériles 7.5 x 7.5 cm (Boîte de 10 sachets)',
    dosage: '7.5 x 7.5 cm',
    forme: 'Boîte de 10 x 2',
    type_produit: 'materiel',
    prix_vente_indicatif: 1100,
    prix_achat_indicatif: 700,
    categorie: 'Pansements & Soins'
  },
  '3400930000006': {
    code_barres: '3400930000006',
    nom: 'Gants d\'examen latex non poudrés (Boîte de 100)',
    dosage: 'Taille M',
    forme: 'Boîte de 100 gants',
    type_produit: 'materiel',
    prix_vente_indicatif: 4500,
    prix_achat_indicatif: 3200,
    categorie: 'Protection & Diagnostic'
  },
  '3400930000007': {
    code_barres: '3400930000007',
    nom: 'Tensiomètre électronique de bras automatique',
    dosage: 'Brassard universel',
    forme: 'Unité avec étui',
    type_produit: 'materiel',
    prix_vente_indicatif: 18500,
    prix_achat_indicatif: 13500,
    categorie: 'Dispositif médical'
  },
  '3400930000008': {
    code_barres: '3400930000008',
    nom: 'Thermomètre digital électronique médical',
    dosage: 'Embout flexible',
    forme: 'Unité',
    type_produit: 'materiel',
    prix_vente_indicatif: 2500,
    prix_achat_indicatif: 1600,
    categorie: 'Dispositif médical'
  },
  '3400930000009': {
    code_barres: '3400930000009',
    nom: 'Test de Diagnostic Rapide Paludisme (TDR Palu Ag Pf/Pan)',
    dosage: 'Test unitaire',
    forme: 'Boîte de 25 tests',
    type_produit: 'materiel',
    prix_vente_indicatif: 1500,
    prix_achat_indicatif: 950,
    categorie: 'Test diagnostic'
  },
  '3400930000010': {
    code_barres: '3400930000010',
    nom: 'Test de Grossesse précoce hCG urinaire',
    dosage: '25 mUI/ml',
    forme: 'Sachet unitaire',
    type_produit: 'materiel',
    prix_vente_indicatif: 1500,
    prix_achat_indicatif: 800,
    categorie: 'Test diagnostic'
  },

  // --- SERVICES D'OFFICINE & ACTES PHARMACEUTIQUES ---
  'SERV-TENSION-01': {
    code_barres: 'SERV-TENSION-01',
    nom: 'Prise de Tension Artérielle Officinale',
    forme: 'Acte infirmier / officinal',
    type_produit: 'service',
    prix_vente_indicatif: 500,
    prix_achat_indicatif: 0,
    categorie: 'Service de santé'
  },
  'SERV-GLYCEMIE-01': {
    code_barres: 'SERV-GLYCEMIE-01',
    nom: 'Test Dépistage Glycémie Capillaire',
    forme: 'Bandelette + Acte',
    type_produit: 'service',
    prix_vente_indicatif: 1000,
    prix_achat_indicatif: 400,
    categorie: 'Service de santé'
  },
  'SERV-INJECTION-01': {
    code_barres: 'SERV-INJECTION-01',
    nom: 'Administration Injection / Pansement de petite urgence',
    forme: 'Acte de soin',
    type_produit: 'service',
    prix_vente_indicatif: 1500,
    prix_achat_indicatif: 300,
    categorie: 'Service de santé'
  },
};

/**
 * Nettoie une chaîne de caractères pour comparaison insensible aux accents, à la casse et à la ponctuation
 */
export function normaliserTexteComparaison(texte: string): string {
  if (!texte) return '';
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents (é -> e, etc.)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ') // Remplace la ponctuation par des espaces
    .replace(/\s+/g, ' ')
    .trim();
}

// Mots génériques pharmaceutiques à exclure de la recherche floue
const STOPWORDS_PHARMA = new Set([
  'comprime', 'comprimes', 'gelule', 'gelules', 'sirop', 'suspension', 'solution',
  'buvable', 'injectable', 'ampoule', 'ampoules', 'flacon', 'boite', 'boites',
  'sachet', 'sachets', 'pommade', 'creme', 'voie', 'orale', 'cutanee', 'rectale',
  'usage', 'interne', 'externe', 'laboratoire', 'laboratoires', 'fabrique', 'distribue',
  'adultes', 'enfants', 'nourrissons', 'notice', 'posologie', 'composition', 'conserver',
  'temperature', 'degres', 'peremption', 'lot', 'exp', 'fabrication', 'prix', 'cfa',
  'fcfa', 'vente', 'achat', 'cip', 'ean', 'grossiste', 'medicament', 'medicaments',
  'oral', 'effervescent', 'sublingual', 'pellicule', 'pellicules', 'enrobe', 'enrobes'
]);

/**
 * Recherche intelligente dans le dictionnaire pharmaceutique
 * par code-barres exact, GTIN-14, ou par nom (insensible aux accents et à la casse)
 */
export function chercherDansDictionnaire(query: string): MedicamentReferentiel | null {
  if (!query) return null;
  const qBrut = query.trim();
  const qCode = qBrut.toLowerCase();
  const qNorm = normaliserTexteComparaison(qBrut);
  const qDigits = qBrut.replace(/\D/g, '');

  // 1. Recherche par code exact direct
  if (DICTIONNAIRE_PHARMA[qBrut]) {
    return DICTIONNAIRE_PHARMA[qBrut];
  }

  // 2. Recherche par chiffres purs (gère 13 et 14 chiffres avec ou sans le 0 de GTIN)
  if (qDigits.length === 13 || qDigits.length === 14) {
    const d13 = qDigits.length === 14 && qDigits.startsWith('0') ? qDigits.substring(1) : qDigits;
    const d14 = qDigits.length === 13 ? `0${qDigits}` : qDigits;
    if (DICTIONNAIRE_PHARMA[d13]) return DICTIONNAIRE_PHARMA[d13];
    if (DICTIONNAIRE_PHARMA[d14]) return DICTIONNAIRE_PHARMA[d14];
    if (DICTIONNAIRE_PHARMA[qDigits]) return DICTIONNAIRE_PHARMA[qDigits];
  } else if (qDigits.length >= 7 && DICTIONNAIRE_PHARMA[qDigits]) {
    return DICTIONNAIRE_PHARMA[qDigits];
  }

  // 3. Recherche si GTIN-14 (enlever le 0 initial pour obtenir le CIP-13)
  if (qCode.length === 14 && qCode.startsWith('0')) {
    const cip13 = qCode.substring(1);
    if (DICTIONNAIRE_PHARMA[cip13]) {
      return DICTIONNAIRE_PHARMA[cip13];
    }
  }

  // 4. Recherche inverse (CIP-13 cherché avec 0 devant)
  if (qCode.length === 13) {
    const gtin14 = `0${qCode}`;
    if (DICTIONNAIRE_PHARMA[gtin14]) {
      return DICTIONNAIRE_PHARMA[gtin14];
    }
  }

  // 5. Recherche par correspondance sur les clés (codes-barres)
  for (const [code, item] of Object.entries(DICTIONNAIRE_PHARMA)) {
    const codeLow = code.toLowerCase();
    if (codeLow === qCode || (qCode.length >= 7 && (codeLow.includes(qCode) || qCode.includes(codeLow)))) {
      return item;
    }
  }

  // Si la requête est un mot générique pharmaceutique seul, ne pas faire de faux positif
  if (STOPWORDS_PHARMA.has(qNorm)) {
    return null;
  }

  // 5. Recherche par nom (insensible aux accents, à la casse et aux espaces)
  if (qNorm.length >= 3) {
    const qMots = qNorm.split(' ').filter(m => m.length >= 3 && !STOPWORDS_PHARMA.has(m));

    // Si après filtrage des stopwords il ne reste aucun mot significatif, abandonner
    if (qMots.length === 0) {
      return null;
    }

    for (const item of Object.values(DICTIONNAIRE_PHARMA)) {
      const nomNorm = normaliserTexteComparaison(item.nom);

      // Correspondance exacte
      if (nomNorm === qNorm) {
        return item;
      }

      // Si le nom du dictionnaire est contenu dans le texte scanné (ex: "VISCERALGINE 50MG BOITE DE 20" contient "visceralgine")
      // On teste d'abord les mots principaux du médicament
      const nomMots = nomNorm.split(' ').filter(m => m.length >= 4 && !STOPWORDS_PHARMA.has(m));
      if (nomMots.length > 0) {
        const motClePrincipal = nomMots[0]; // Ex: "visceralgine", "phartrim", "doliprane"
        if (qNorm.includes(motClePrincipal)) {
          return item;
        }
      }

      // Correspondance multi-mots significatifs
      if (qMots.length >= 2 && qMots.every(mot => nomNorm.includes(mot))) {
        return item;
      }
    }
  }

  return null;
}

