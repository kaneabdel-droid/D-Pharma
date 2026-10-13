const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Chargement sécurisé depuis l'environnement ou .env.local
let envKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tgnqcqfynkvmocxqdxyc.supabase.co';

if (!envKey) {
  try {
    const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
    const matchKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
    const matchUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
    if (matchKey) envKey = matchKey[1].trim();
    if (matchUrl) envUrl = matchUrl[1].trim();
  } catch (e) {}
}

const GIE_ID = process.env.DEMO_GIE_ID || 'd4cce610-339b-4747-a3e6-a3eb8751a49d';

const sb = createClient(envUrl, envKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log('--- 1. MISE À JOUR DE LA PHARMACIE CENTRALE DE DAKAR ---');
  const { data: gie, error: eg } = await sb
    .from('gies')
    .update({
      nom: 'Pharmacie Centrale de Dakar',
      adresse: '12 Avenue Cheikh Anta Diop, Dakar',
      telephone: '+221 33 824 15 20',
      ninea: '005489123 2V3',
      registre_commerce: 'SN.DKR.2024.B.4891',
      devise: 'XOF',
      pays: 'SN',
      pays_nom: 'Sénégal',
      subscription_tier: 'pharmacie',
      abonnement_statut: 'actif',
      compte_verrouille: false,
      date_expiration: null,
      essai_expire_le: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    })
    .eq('id', GIE_ID)
    .select();
  if (eg) console.error('Erreur GIE:', eg);
  else console.log('Pharmacie configurée:', gie[0].nom);

  console.log('\n--- 2. CATALOGUE DES MÉDICAMENTS (DCI & CIP) ---');
  const medicamentsData = [
    { code_barres: '3400935824915', nom: 'Paracétamol 1g', principe_actif: 'Paracétamol', forme: 'Comprimé', dosage: '1000 mg', soumis_ordonnance: false },
    { code_barres: '3400936239121', nom: 'Paracétamol Sirop Enfant', principe_actif: 'Paracétamol', forme: 'Sirop', dosage: '2.4%', soumis_ordonnance: false },
    { code_barres: '3400936528713', nom: 'Amoxicilline 500mg', principe_actif: 'Amoxicilline', forme: 'Gélule', dosage: '500 mg', soumis_ordonnance: true },
    { code_barres: '3400934178231', nom: 'Augmentin 1g/125mg', principe_actif: 'Amoxicilline / Acide Clavulanique', forme: 'Comprimé', dosage: '1000 mg / 125 mg', soumis_ordonnance: true },
    { code_barres: '3400935517824', nom: 'Ibuprofène 400mg', principe_actif: 'Ibuprofène', forme: 'Comprimé', dosage: '400 mg', soumis_ordonnance: false },
    { code_barres: '3400938456123', nom: 'Artéméther + Luméfantrine (Coartem)', principe_actif: 'Artéméther / Luméfantrine', forme: 'Comprimé', dosage: '20 mg / 120 mg', soumis_ordonnance: true },
    { code_barres: '3400936852412', nom: 'Oméprazole 20mg', principe_actif: 'Oméprazole', forme: 'Gélule', dosage: '20 mg', soumis_ordonnance: false },
    { code_barres: '3400935123490', nom: 'Cétirizine 10mg', principe_actif: 'Cétirizine', forme: 'Comprimé', dosage: '10 mg', soumis_ordonnance: false },
    { code_barres: '3400931245890', nom: 'Sérum Physiologique 0.9%', principe_actif: 'Chlorure de sodium', forme: 'Dosette', dosage: '5 ml', soumis_ordonnance: false },
    { code_barres: '3400931892345', nom: 'Bétadine Dermique 10%', principe_actif: 'Povidone iodée', forme: 'Flacon', dosage: '125 ml', soumis_ordonnance: false },
    { code_barres: '3400934278912', nom: 'Spasfon Lyoc 80mg', principe_actif: 'Phloroglucinol', forme: 'Comprimé lyophilisat', dosage: '80 mg', soumis_ordonnance: false },
    { code_barres: '3400932567812', nom: 'Ventoline 100 µg', principe_actif: 'Salbutamol', forme: 'Aérosol-doseur', dosage: '100 mcg', soumis_ordonnance: true },
    { code_barres: '3400933456781', nom: 'Metformine 850mg (Glucophage)', principe_actif: 'Metformine', forme: 'Comprimé', dosage: '850 mg', soumis_ordonnance: true },
    { code_barres: '3400934567890', nom: 'Amlodipine 5mg (Amlor)', principe_actif: 'Amlodipine', forme: 'Gélule', dosage: '5 mg', soumis_ordonnance: true },
    { code_barres: '3400935678901', nom: 'Azithromycine 500mg', principe_actif: 'Azithromycine', forme: 'Comprimé', dosage: '500 mg', soumis_ordonnance: true },
    { code_barres: '3400936789012', nom: 'Vitamine C 1000mg Effervescente', principe_actif: 'Acide ascorbique', forme: 'Comprimé effervescent', dosage: '1000 mg', soumis_ordonnance: false }
  ];

  for (const m of medicamentsData) {
    await sb.from('medicaments').upsert(m, { onConflict: 'code_barres' });
  }

  const { data: allMeds } = await sb.from('medicaments').select('id, nom, code_barres');
  console.log('Médicaments disponibles dans le catalogue:', allMeds.length);
  const medMap = {};
  allMeds.forEach(m => { medMap[m.code_barres] = m.id; });

  console.log('\n--- 3. FOURNISSEURS & GROSSISTES RÉPARTITEURS ---');
  await sb.from('fournisseurs_labo').delete().eq('gie_id', GIE_ID);
  const fournisseursData = [
    { gie_id: GIE_ID, nom: 'Laborex Sénégal', contact_email: 'commandes@laborex-sn.com', contact_telephone: '+221 33 839 88 00', adresse: 'Km 2.5 Boulevard du Centenaire, Dakar' },
    { gie_id: GIE_ID, nom: 'COPHASE Sénégal', contact_email: 'service.client@cophase.sn', contact_telephone: '+221 33 869 45 45', adresse: 'Zone Industrielle Bel-Air, Dakar' },
    { gie_id: GIE_ID, nom: 'SODIPHARM Distribution', contact_email: 'commandes@sodipharm.sn', contact_telephone: '+221 33 832 10 10', adresse: 'Dakar Hann Maristes' },
    { gie_id: GIE_ID, nom: 'Planet Pharma West Africa', contact_email: 'contact@planetpharma-sn.com', contact_telephone: '+221 33 820 00 22', adresse: 'Ngor Almadies, Dakar' },
  ];
  const { data: insertedFournisseurs } = await sb.from('fournisseurs_labo').insert(fournisseursData).select();
  console.log('Fournisseurs enregistrés:', insertedFournisseurs.length);
  const laborexId = insertedFournisseurs.find(f => f.nom.includes('Laborex'))?.id;
  const cophaseId = insertedFournisseurs.find(f => f.nom.includes('COPHASE'))?.id;

  console.log('\n--- 4. STOCKS OFFICINE (FEFO, LOTS, PÉREMPTIONS) ---');
  await sb.from('stocks_pharmacie').delete().eq('gie_id', GIE_ID);
  const stocksData = [
    { code: '3400935824915', q: 140, seuil: 15, pa: 750, pv: 1200, lot: 'LOT-P28-01', peremption: '2028-04-30' },
    { code: '3400936239121', q: 45, seuil: 10, pa: 900, pv: 1500, lot: 'LOT-PS27-04', peremption: '2027-11-15' },
    { code: '3400936528713', q: 85, seuil: 15, pa: 1400, pv: 2200, lot: 'LOT-AMX-12', peremption: '2027-09-30' },
    { code: '3400934178231', q: 60, seuil: 10, pa: 3800, pv: 5600, lot: 'LOT-AUG-88', peremption: '2027-12-31' },
    { code: '3400935517824', q: 110, seuil: 20, pa: 950, pv: 1600, lot: 'LOT-IBU-33', peremption: '2028-02-28' },
    { code: '3400938456123', q: 75, seuil: 15, pa: 2500, pv: 3900, lot: 'LOT-COA-09', peremption: '2027-08-15' },
    { code: '3400936852412', q: 50, seuil: 10, pa: 1800, pv: 2900, lot: 'LOT-OME-54', peremption: '2027-10-31' },
    { code: '3400935123490', q: 35, seuil: 10, pa: 1200, pv: 2000, lot: 'LOT-CET-21', peremption: '2027-07-20' },
    { code: '3400931245890', q: 95, seuil: 20, pa: 1100, pv: 1800, lot: 'LOT-PHY-76', peremption: '2028-06-30' },
    { code: '3400931892345', q: 40, seuil: 10, pa: 1600, pv: 2500, lot: 'LOT-BET-19', peremption: '2028-01-15' },
    { code: '3400934278912', q: 55, seuil: 10, pa: 1700, pv: 2800, lot: 'LOT-SPA-42', peremption: '2027-11-30' },
    // 2 Médicaments sous le seuil d'alerte pour tester le compteur Stock Faible
    { code: '3400932567812', q: 6, seuil: 10, pa: 2200, pv: 3500, lot: 'LOT-VEN-05', peremption: '2027-05-15' },
    { code: '3400933456781', q: 4, seuil: 10, pa: 1500, pv: 2400, lot: 'LOT-MET-18', peremption: '2027-09-30' },
    // 2 Médicaments avec péremption proche (dans 30-60 jours) pour tester l'alerte FEFO
    { code: '3400934567890', q: 28, seuil: 10, pa: 2100, pv: 3400, lot: 'LOT-AML-02', peremption: '2026-11-20' },
    { code: '3400935678901', q: 30, seuil: 10, pa: 3000, pv: 4800, lot: 'LOT-AZI-11', peremption: '2026-12-05' },
    { code: '3400936789012', q: 70, seuil: 15, pa: 1300, pv: 2100, lot: 'LOT-VIT-90', peremption: '2028-03-31' },
  ];

  const stocksToInsert = stocksData.map(s => ({
    gie_id: GIE_ID,
    medicament_id: medMap[s.code],
    quantite: s.q,
    seuil_alerte: s.seuil,
    prix_achat: s.pa,
    prix_vente: s.pv,
    lot: s.lot,
    date_peremption: s.peremption,
  })).filter(s => s.medicament_id);

  const { data: insertedStocks, error: es } = await sb.from('stocks_pharmacie').insert(stocksToInsert).select();
  if (es) console.error('Erreur stocks:', es);
  else console.log('Lignes de stock créées:', insertedStocks.length);

  console.log('\n--- 5. PATIENTS / CLIENTS RÉGULIERS ---');
  await sb.from('clients_externes').delete().eq('gie_id', GIE_ID);
  const clientsData = [
    { gie_id: GIE_ID, nom: 'Aminata Diallo', telephone: '+221 77 654 32 10', adresse: 'Fann Résidence, Dakar' },
    { gie_id: GIE_ID, nom: 'Cheikh Tidiane Ndiaye', telephone: '+221 76 890 12 34', adresse: 'Ouakam Cité Avion, Dakar' },
    { gie_id: GIE_ID, nom: 'Dr. Ousmane Diop', telephone: '+221 70 345 67 89', adresse: 'Clinique Madeleine / Mermoz, Dakar' },
    { gie_id: GIE_ID, nom: 'Fatou Bintou Sène', telephone: '+221 78 123 45 67', adresse: 'Point E, Dakar' },
  ];
  const { data: insertedClients } = await sb.from('clients_externes').insert(clientsData).select();
  console.log('Patients créés:', insertedClients.length);
  const aminataId = insertedClients.find(c => c.nom.includes('Aminata'))?.id;
  const cheikhId = insertedClients.find(c => c.nom.includes('Cheikh'))?.id;

  console.log('\n--- 6. COMPTES FINANCIERS DE L\'OFFICINE ---');
  await sb.from('comptes').delete().eq('gie_id', GIE_ID);
  const comptesData = [
    { gie_id: GIE_ID, nom: 'Caisse Principale (Comptoir Espèces)', type: 'caisse', solde: 345000 },
    { gie_id: GIE_ID, nom: 'Compte Marchand Wave Officine', type: 'caisse', solde: 580000 },
    { gie_id: GIE_ID, nom: 'Compte Orange Money Pro', type: 'caisse', solde: 410000 },
    { gie_id: GIE_ID, nom: 'Compte Courant CBAO Officine', type: 'banque', solde: 4750000 },
  ];
  const { data: insertedComptes } = await sb.from('comptes').insert(comptesData).select();
  console.log('Comptes de trésorerie créés:', insertedComptes.length);

  console.log('\n--- 7. TRANSACTIONS RÉCENTES DE TRÉSORERIE ---');
  await sb.from('transactions').delete().eq('gie_id', GIE_ID);
  const transactionsData = [
    { gie_id: GIE_ID, type_transaction: 'entree', montant: 145000, motif: 'Recette journalière espèces comptoir', date_transaction: new Date().toISOString().slice(0, 10) },
    { gie_id: GIE_ID, type_transaction: 'entree', montant: 98000, motif: 'Encaissements QR Wave comptoir', date_transaction: new Date().toISOString().slice(0, 10) },
    { gie_id: GIE_ID, type_transaction: 'entree', montant: 62000, motif: 'Encaissements Orange Money comptoir', date_transaction: new Date().toISOString().slice(0, 10) },
    { gie_id: GIE_ID, type_transaction: 'sortie', montant: 280000, motif: 'Règlement facture réassort Laborex Sénégal', date_transaction: new Date().toISOString().slice(0, 10) },
    { gie_id: GIE_ID, type_transaction: 'sortie', montant: 75000, motif: 'Facture électricité Senelec chaîne du froid frigos', date_transaction: new Date().toISOString().slice(0, 10) },
  ];
  const { data: insertedTx } = await sb.from('transactions').insert(transactionsData).select();
  console.log('Transactions créées:', insertedTx.length);

  console.log('\n--- 8. VENTES EN DIRECT DU JOUR ET HISTORIQUE (POS) ---');
  await sb.from('ventes_pharmacie').delete().eq('gie_id', GIE_ID);
  
  const now = new Date();
  const ventesData = [
    {
      montant_total: 14200,
      moyen_paiement: 'especes',
      client_id: aminataId,
      date_vente: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
      items: [
        { code: '3400934178231', q: 2, pu: 5600 }, // Augmentin
        { code: '3400935824915', q: 2, pu: 1500 }, // Paracétamol
      ]
    },
    {
      montant_total: 5700,
      moyen_paiement: 'wave',
      client_id: cheikhId,
      date_vente: new Date(now.getTime() - 55 * 60 * 1000).toISOString(),
      items: [
        { code: '3400938456123', q: 1, pu: 3900 }, // Coartem
        { code: '3400931245890', q: 1, pu: 1800 }, // Sérum Physio
      ]
    },
    {
      montant_total: 3700,
      moyen_paiement: 'especes',
      client_id: null,
      date_vente: new Date(now.getTime() - 80 * 60 * 1000).toISOString(),
      items: [
        { code: '3400935517824', q: 1, pu: 1600 }, // Ibuprofène
        { code: '3400936789012', q: 1, pu: 2100 }, // Vitamine C
      ]
    },
    {
      montant_total: 8200,
      moyen_paiement: 'orange_money',
      client_id: null,
      date_vente: new Date(now.getTime() - 140 * 60 * 1000).toISOString(),
      items: [
        { code: '3400934278912', q: 1, pu: 2800 }, // Spasfon
        { code: '3400936852412', q: 1, pu: 2900 }, // Oméprazole
        { code: '3400931892345', q: 1, pu: 2500 }, // Bétadine
      ]
    },
    {
      montant_total: 4700,
      moyen_paiement: 'especes',
      client_id: null,
      date_vente: new Date(now.getTime() - 210 * 60 * 1000).toISOString(),
      items: [
        { code: '3400932567812', q: 1, pu: 3500 }, // Ventoline
        { code: '3400935824915', q: 1, pu: 1200 }, // Paracétamol
      ]
    },
    {
      montant_total: 4400,
      moyen_paiement: 'wave',
      client_id: null,
      date_vente: new Date(now.getTime() - 320 * 60 * 1000).toISOString(),
      items: [
        { code: '3400936528713', q: 2, pu: 2200 }, // Amoxicilline
      ]
    },
    // Ventes d'hier pour historique
    {
      montant_total: 16800,
      moyen_paiement: 'carte',
      client_id: aminataId,
      date_vente: new Date(now.getTime() - 26 * 3600 * 1000).toISOString(),
      items: [
        { code: '3400935678901', q: 2, pu: 4800 },
        { code: '3400934178231', q: 1, pu: 5600 },
        { code: '3400935517824', q: 1, pu: 1600 },
      ]
    },
  ];

  for (const v of ventesData) {
    const { data: insertedVente } = await sb.from('ventes_pharmacie').insert({
      gie_id: GIE_ID,
      montant_total: v.montant_total,
      moyen_paiement: v.moyen_paiement,
      date_vente: v.date_vente,
      client_id: v.client_id,
    }).select();

    if (insertedVente && insertedVente[0] && v.items) {
      const lignes = v.items.map(it => ({
        vente_id: insertedVente[0].id,
        medicament_id: medMap[it.code],
        quantite: it.q,
        prix_unitaire: it.pu,
      })).filter(l => l.medicament_id);
      await sb.from('lignes_vente_pharmacie').insert(lignes);
    }
  }
  console.log('Ventes officine créées:', ventesData.length);

  console.log('\n--- 9. COMMANDES FOURNISSEURS (LABOREX / COPHASE) ---');
  await sb.from('commandes_labo').delete().eq('gie_id', GIE_ID);

  // Commande 1 : Réceptionnée de Laborex
  const { data: cmd1 } = await sb.from('commandes_labo').insert({
    gie_id: GIE_ID,
    fournisseur_id: laborexId,
    statut: 'complete',
    date_commande: new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
    date_reception: new Date(now.getTime() - 1 * 24 * 3600 * 1000).toISOString(),
  }).select();

  if (cmd1 && cmd1[0]) {
    await sb.from('lignes_commande_labo').insert([
      { commande_id: cmd1[0].id, medicament_id: medMap['3400935824915'], quantite_commandee: 100, quantite_recue: 100, prix_achat_unitaire: 750 },
      { commande_id: cmd1[0].id, medicament_id: medMap['3400934178231'], quantite_commandee: 40, quantite_recue: 40, prix_achat_unitaire: 3800 },
      { commande_id: cmd1[0].id, medicament_id: medMap['3400935517824'], quantite_commandee: 60, quantite_recue: 60, prix_achat_unitaire: 950 },
    ]);
  }

  // Commande 2 : En cours auprès de COPHASE (Alerte commandes en cours sur Dashboard)
  const { data: cmd2 } = await sb.from('commandes_labo').insert({
    gie_id: GIE_ID,
    fournisseur_id: cophaseId,
    statut: 'envoyee',
    date_commande: new Date(now.getTime() - 8 * 3600 * 1000).toISOString(),
    date_reception: null,
  }).select();

  if (cmd2 && cmd2[0]) {
    await sb.from('lignes_commande_labo').insert([
      { commande_id: cmd2[0].id, medicament_id: medMap['3400932567812'], quantite_commandee: 25, quantite_recue: 0, prix_achat_unitaire: 2200 },
      { commande_id: cmd2[0].id, medicament_id: medMap['3400933456781'], quantite_commandee: 30, quantite_recue: 0, prix_achat_unitaire: 1500 },
    ]);
  }
  console.log('Commandes répartiteurs créées: 2 (1 livrée, 1 en cours)');

  console.log('\n--- 10. IMPUTATIONS & CHARGES D\'EXPLOITATION ---');
  await sb.from('imputations').delete().eq('gie_id', GIE_ID);
  const imputationsData = [
    { gie_id: GIE_ID, type: 'charge', libelle: 'Loyer local commercial officine', montant: 350000, date: new Date().toISOString().slice(0, 10) },
    { gie_id: GIE_ID, type: 'charge', libelle: 'Climatisation & Maintien chaîne du froid', montant: 85000, date: new Date().toISOString().slice(0, 10) },
    { gie_id: GIE_ID, type: 'charge', libelle: 'Emballages officinaux et étiquettes posologie', montant: 25000, date: new Date().toISOString().slice(0, 10) },
  ];
  await sb.from('imputations').insert(imputationsData);
  console.log('Imputations créées: 3');

  console.log('\n=== SUCCÈS : BASE DE DÉMO D-PHARMA ENTIÈREMENT ALIMENTÉE AVEC DONNÉES RÉELLES ===');
}

seed().catch(err => {
  console.error('Erreur globale seed:', err);
  process.exit(1);
});
