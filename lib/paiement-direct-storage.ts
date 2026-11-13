/**
 * Module d'Encaissement Direct sur Appareils & Comptes de l'Officine (Zéro Agrégateur)
 * D-PHARMA — Économie de 100% des frais de commission d'agrégateur (2% à 3.5% préservés)
 */

export interface CompteMarchandDirect {
  id: string;
  type: 'wave' | 'orange_money' | 'free_money' | 'tpe_banque';
  nom: string;
  numeroOuCode: string;
  banqueOuOperateur: string;
  pointDeVente: string;
  actif: boolean;
  qrCodeData?: string;
  instructions?: string;
}

export interface TransactionDirecte {
  id: string;
  date: string;
  heure: string;
  montant: number;
  devise: string;
  methode: 'wave' | 'orange_money' | 'free_money' | 'tpe_carte' | 'especes';
  methodeLibelle: string;
  referenceExterne: string; // ID transaction Wave, ID Orange Money, N° Autorisation STAN TPE
  terminalOuCompteNom: string;
  clientNom: string;
  commandeRef: string; // Vente POS / Ticket / Ordonnance
  pointDeVente: string;
  caissier: string;
  statut: 'valide' | 'annule';
  fraisAggregateurEconomises: number; // 2.5% du montant préservés
  notes?: string;
}

const STORAGE_KEY_COMPTES = 'dpharma_comptes_marchands_directs';
const STORAGE_KEY_TRANSACTIONS = 'dpharma_transactions_directes';

export const COMPTES_MARCHANDS_DEFAUT: CompteMarchandDirect[] = [
  {
    id: 'cpt-wave-pharma',
    type: 'wave',
    nom: 'Wave Marchand Caisse Pharmacie',
    numeroOuCode: '+221 77 650 00 00',
    banqueOuOperateur: 'Wave Business Sénégal',
    pointDeVente: 'Comptoir Caisse #01',
    actif: true,
    qrCodeData: 'https://pay.wave.com/m/M_sn_pharmacie_centrale',
    instructions: 'Scanner le QR Wave ou envoyer au numéro marchand direct de la pharmacie',
  },
  {
    id: 'cpt-om-pharma',
    type: 'orange_money',
    nom: 'Orange Money Marchand Pharmacie',
    numeroOuCode: '892140',
    banqueOuOperateur: 'Orange Money Sénégal',
    pointDeVente: 'Comptoir Caisse #01',
    actif: true,
    instructions: 'Composer #144#391*892140*Montant# ou scanner le QR code officiel de la pharmacie',
  },
  {
    id: 'cpt-tpe-pharma-cbao',
    type: 'tpe_banque',
    nom: 'TPE Bancaire Comptoir CBAO #01',
    numeroOuCode: 'TPE-CBAO-PHARMA-01',
    banqueOuOperateur: 'CBAO Attijariwafa Bank (Visa / Mastercard / GIM-UEMOA)',
    pointDeVente: 'Comptoir Caisse #01',
    actif: true,
    instructions: 'Insérer ou approcher la carte bancaire sur le terminal CBAO du comptoir',
  },
  {
    id: 'cpt-tpe-garde',
    type: 'tpe_banque',
    nom: 'TPE Mobile Guichet Garde de Nuit',
    numeroOuCode: 'TPE-SGBS-GARDE-02',
    banqueOuOperateur: 'Société Générale Sénégal (Sans Contact)',
    pointDeVente: 'Guichet de Garde / Nuit',
    actif: true,
    instructions: 'Terminal mobile autonome pour ordonnances d’urgence au guichet de nuit',
  },
  {
    id: 'cpt-free-pharma',
    type: 'free_money',
    nom: 'Free Money Marchand',
    numeroOuCode: '39410',
    banqueOuOperateur: 'Free Money Sénégal',
    pointDeVente: 'Comptoir Caisse #01',
    actif: false,
    instructions: 'Code Marchand Free Money direct',
  },
];

export const TRANSACTIONS_DIRECTES_DEFAUT: TransactionDirecte[] = [
  {
    id: 'TX-PHA-2026-001',
    date: '2026-11-13',
    heure: '09:15',
    montant: 32400,
    devise: 'XOF',
    methode: 'wave',
    methodeLibelle: 'Wave Direct Marchand (0% agrégateur)',
    referenceExterne: 'W-994102914',
    terminalOuCompteNom: 'Wave Marchand Caisse Pharmacie',
    clientNom: 'Patient Ousmane Diallo',
    commandeRef: 'POS-PHA-0182 (Antibiotiques & Antalgiques)',
    pointDeVente: 'Comptoir Caisse #01',
    caissier: 'Dr. Mariama Ba',
    statut: 'valide',
    fraisAggregateurEconomises: 810, // 32 400 * 2.5%
    notes: 'Paiement direct Wave vérifié sur smartphone marchand pharmacie',
  },
  {
    id: 'TX-PHA-2026-002',
    date: '2026-11-13',
    heure: '10:05',
    montant: 18500,
    devise: 'XOF',
    methode: 'orange_money',
    methodeLibelle: 'Orange Money Direct (Code 892140)',
    referenceExterne: 'MP261113.1005.E88102',
    terminalOuCompteNom: 'Orange Money Marchand Pharmacie',
    clientNom: 'Mme Fatou Kiné Ndiaye',
    commandeRef: 'POS-PHA-0183 (Vitamines & Puériculture)',
    pointDeVente: 'Comptoir Caisse #01',
    caissier: 'Samba Diop',
    statut: 'valide',
    fraisAggregateurEconomises: 463,
    notes: 'Code marchand composé au comptoir, SMS de confirmation reçu',
  },
  {
    id: 'TX-PHA-2026-003',
    date: '2026-11-13',
    heure: '10:50',
    montant: 185000,
    devise: 'XOF',
    methode: 'tpe_carte',
    methodeLibelle: 'TPE Carte Bancaire CBAO (STAN: 074129)',
    referenceExterne: 'STAN-074129 / AUTH-339102',
    terminalOuCompteNom: 'TPE Bancaire Comptoir CBAO #01',
    clientNom: 'M. Jean-Paul Mendy',
    commandeRef: 'POS-PHA-0184 (Traitement mensuel cardiologie)',
    pointDeVente: 'Comptoir Caisse #01',
    caissier: 'Dr. Mariama Ba',
    statut: 'valide',
    fraisAggregateurEconomises: 4625, // 185 000 * 2.5%
    notes: 'Carte bancaire Visa sur terminal CBAO de l’officine. Ticket joint à l’ordonnance.',
  },
  {
    id: 'TX-PHA-2026-004',
    date: '2026-11-13',
    heure: '11:20',
    montant: 8500,
    devise: 'XOF',
    methode: 'especes',
    methodeLibelle: 'Espèces / Caisse Directe',
    referenceExterne: 'ESP-1120-PHA',
    terminalOuCompteNom: 'Tiroir-Caisse Comptoir',
    clientNom: 'Patient Comptoir',
    commandeRef: 'POS-PHA-0185 (Paracétamol & Sirop)',
    pointDeVente: 'Comptoir Caisse #01',
    caissier: 'Samba Diop',
    statut: 'valide',
    fraisAggregateurEconomises: 0,
    notes: 'Règlement espèces immédiat.',
  },
];

export function getComptesMarchandsDirects(): CompteMarchandDirect[] {
  if (typeof window === 'undefined') return COMPTES_MARCHANDS_DEFAUT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COMPTES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_COMPTES, JSON.stringify(COMPTES_MARCHANDS_DEFAUT));
      return COMPTES_MARCHANDS_DEFAUT;
    }
    return JSON.parse(raw);
  } catch {
    return COMPTES_MARCHANDS_DEFAUT;
  }
}

export function saveCompteMarchandDirect(compte: CompteMarchandDirect): void {
  if (typeof window === 'undefined') return;
  const existants = getComptesMarchandsDirects();
  const index = existants.findIndex((c) => c.id === compte.id);
  let maj: CompteMarchandDirect[];
  if (index >= 0) {
    maj = [...existants];
    maj[index] = compte;
  } else {
    maj = [compte, ...existants];
  }
  localStorage.setItem(STORAGE_KEY_COMPTES, JSON.stringify(maj));
}

export function supprimerCompteMarchandDirect(id: string): void {
  if (typeof window === 'undefined') return;
  const existants = getComptesMarchandsDirects();
  const maj = existants.filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY_COMPTES, JSON.stringify(maj));
}

export function getTransactionsDirectes(): TransactionDirecte[] {
  if (typeof window === 'undefined') return TRANSACTIONS_DIRECTES_DEFAUT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(TRANSACTIONS_DIRECTES_DEFAUT));
      return TRANSACTIONS_DIRECTES_DEFAUT;
    }
    return JSON.parse(raw);
  } catch {
    return TRANSACTIONS_DIRECTES_DEFAUT;
  }
}

export function enregistrerTransactionDirecte(tx: Omit<TransactionDirecte, 'id' | 'fraisAggregateurEconomises'>): TransactionDirecte {
  const fraisAggregateurEconomises = tx.methode === 'especes' ? 0 : Math.round(tx.montant * 0.025);
  const nouvelle: TransactionDirecte = {
    ...tx,
    id: `TX-PHA-${Date.now().toString().slice(-6)}`,
    fraisAggregateurEconomises,
  };

  if (typeof window !== 'undefined') {
    const existantes = getTransactionsDirectes();
    const maj = [nouvelle, ...existantes];
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(maj));
  }
  return nouvelle;
}

export function getTotalEconomiesAggregateurs(): { totalEncaisseDirect: number; totalEconomise: number; nombreTransactions: number } {
  const txs = getTransactionsDirectes();
  const valides = txs.filter((t) => t.statut === 'valide');
  const totalEncaisseDirect = valides.reduce((sum, t) => sum + t.montant, 0);
  const totalEconomise = valides.reduce((sum, t) => sum + t.fraisAggregateurEconomises, 0);
  return {
    totalEncaisseDirect,
    totalEconomise,
    nombreTransactions: valides.length,
  };
}

