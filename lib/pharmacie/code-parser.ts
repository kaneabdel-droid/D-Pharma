/**
 * Module universel de décodage des codes pharmaceutiques
 * Prend en charge :
 * 1. GS1 DataMatrix Pharma (Norme internationale pour boîtes de médicaments : GTIN, Date de péremption, Lot, Série)
 * 2. QR Codes JSON (Nom, Prix, Lot, Péremption, Code)
 * 3. QR Codes Clé-Valeur (NOM:... | PRIX:... | LOT:... | EXP:...)
 * 4. QR Codes délimités CSV / Point-virgule
 * 5. Codes-barres 1D classiques (CIP13, EAN-13, EAN-8, Code 128)
 */

export type CodePharmaParse = {
  raw: string;
  code_barres: string;
  nom?: string;
  prix_vente?: number;
  prix_achat?: number;
  lot?: string;
  date_peremption?: string; // Format ISO YYYY-MM-DD
  quantite?: number;
  format: 'gs1_datamatrix' | 'json' | 'cle_valeur' | 'csv' | 'standard';
};

/**
 * Normalise une date en chaîne 'YYYY-MM-DD'
 */
function normaliserDate(rawDate: string): string | undefined {
  if (!rawDate) return undefined;
  const d = rawDate.trim();

  // Déjà au format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;

  // Format DD/MM/YYYY ou DD-MM-YYYY
  const frMatch = d.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (frMatch) {
    const jour = frMatch[1].padStart(2, '0');
    const mois = frMatch[2].padStart(2, '0');
    const annee = frMatch[3];
    return `${annee}-${mois}-${jour}`;
  }

  // Format YYMMDD (GS1 Healthcare standard)
  const gs1Match = d.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (gs1Match) {
    const yy = parseInt(gs1Match[1], 10);
    const mm = gs1Match[2];
    let dd = gs1Match[3];
    // En GS1, si le jour est '00', c'est le dernier jour du mois
    const annee = yy >= 70 ? `19${yy}` : `20${yy.toString().padStart(2, '0')}`;
    if (dd === '00') {
      const dernierJour = new Date(parseInt(annee, 10), parseInt(mm, 10), 0).getDate();
      dd = dernierJour.toString().padStart(2, '0');
    }
    return `${annee}-${mm}-${dd}`;
  }

  // Essai Date.parse uniquement si la chaîne contient des tirets ou des barres
  if (d.includes('-') || d.includes('/') || d.includes('.') || d.includes(' ')) {
    try {
      const parsed = new Date(d);
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2000) {
        return parsed.toISOString().split('T')[0];
      }
    } catch { }
  }

  return undefined;
}

/**
 * Décode un code GS1 DataMatrix (avec ou sans parenthèses, avec ou sans FNC1 \x1d)
 * Ex: (01)03400935987102(17)261130(10)LOT459
 * ou: 01034009359871021726113010LOT459
 */
function parserGS1DataMatrix(texte: string): Partial<CodePharmaParse> | null {
  // Nettoyer les caractères de contrôle GS1 / FNC1
  const clean = texte.replace(/[\x1d\x1e\x04]/g, '|').trim();

  let gtin: string | undefined;
  let expDate: string | undefined;
  let lot: string | undefined;

  // Cas 1 : Avec parenthèses explicites (01)...(17)...(10)...
  if (clean.includes('(01)') || clean.includes('(17)') || clean.includes('(10)')) {
    const m01 = clean.match(/\(01\)(\d{14})/);
    if (m01) gtin = m01[1];

    const m17 = clean.match(/\(17\)(\d{6})/);
    if (m17) expDate = normaliserDate(m17[1]);

    const m10 = clean.match(/\(10\)([^\(\)\|]+)/);
    if (m10) lot = m10[1].trim();
  }

  // Cas 2 : Sans parenthèses (format brut lecteur optique DataMatrix GS1)
  // Commence souvent par 01 suivi de 14 chiffres
  if (!gtin) {
    const rawMatch = clean.match(/^01(\d{14})(.*)$/);
    if (rawMatch) {
      gtin = rawMatch[1];
      const reste = rawMatch[2];

      // Chercher (17) ou 17 + 6 chiffres
      const expMatch = reste.match(/17(\d{6})/);
      if (expMatch) {
        expDate = normaliserDate(expMatch[1]);
      }

      // Chercher (10) ou 10 + chaîne jusqu'au séparateur ou fin
      const lotMatch = reste.match(/10([A-Za-z0-9\-_]+)/);
      if (lotMatch) {
        lot = lotMatch[1].trim();
      }
    }
  }

  if (gtin) {
    // Si GTIN-14 commence par '0', le code EAN-13 / CIP-13 standard correspond aux 13 derniers chiffres
    const codeNettoye = gtin.startsWith('0') && gtin.length === 14 ? gtin.substring(1) : gtin;
    return {
      code_barres: codeNettoye,
      lot,
      date_peremption: expDate,
      format: 'gs1_datamatrix',
    };
  }

  return null;
}

/**
 * Décode un QR Code au format JSON
 */
function parserJSON(texte: string): Partial<CodePharmaParse> | null {
  const t = texte.trim();
  if (!t.startsWith('{') || !t.endsWith('}')) return null;

  try {
    const obj = JSON.parse(t);
    if (typeof obj !== 'object' || obj === null) return null;

    const code =
      obj.code_barres ||
      obj.code ||
      obj.cip ||
      obj.gtin ||
      obj.ean ||
      obj.ref ||
      obj.id ||
      '';

    const nom = obj.nom || obj.designation || obj.article || obj.name;
    const prix_vente = parseFloat(obj.prix_vente || obj.prix || obj.pv || obj.price || '0');
    const prix_achat = parseFloat(obj.prix_achat || obj.pa || obj.cost || '0');
    const lot = obj.lot || obj.batch || obj.numero_lot;
    const date_peremption = normaliserDate(obj.date_peremption || obj.peremption || obj.exp || obj.expiry || '');
    const quantite = parseFloat(obj.quantite || obj.qte || obj.qty || '0');

    return {
      code_barres: String(code || '').trim(),
      nom: nom ? String(nom).trim() : undefined,
      prix_vente: !isNaN(prix_vente) && prix_vente > 0 ? prix_vente : undefined,
      prix_achat: !isNaN(prix_achat) && prix_achat > 0 ? prix_achat : undefined,
      lot: lot ? String(lot).trim() : undefined,
      date_peremption,
      quantite: !isNaN(quantite) && quantite > 0 ? quantite : undefined,
      format: 'json',
    };
  } catch {
    return null;
  }
}

/**
 * Décode un texte au format Clé:Valeur ou Clé=Valeur
 * Ex: NOM:Paracétamol 500mg | PRIX:1500 | LOT:LOT-01 | EXP:2027-12-31 | CODE:3400935987102
 */
function parserCleValeur(texte: string): Partial<CodePharmaParse> | null {
  if (!texte.includes(':') && !texte.includes('=')) return null;

  const sepRegex = /[\n\|\;\&]/;
  const paires = texte.split(sepRegex).map((p) => p.trim()).filter(Boolean);
  if (paires.length < 2) return null;

  const dico: Record<string, string> = {};
  for (const paire of paires) {
    const idx = paire.indexOf(':') !== -1 ? paire.indexOf(':') : paire.indexOf('=');
    if (idx !== -1) {
      const cle = paire.substring(0, idx).trim().toLowerCase();
      const val = paire.substring(idx + 1).trim();
      dico[cle] = val;
    }
  }

  const code =
    dico.code ||
    dico.code_barres ||
    dico.cip ||
    dico.gtin ||
    dico.ean ||
    dico.ref ||
    dico.cb;

  const nom = dico.nom || dico.designation || dico.article || dico.produit || dico.name;
  const prix_vente = parseFloat(dico.prix || dico.prix_vente || dico.pv || dico.price || '0');
  const prix_achat = parseFloat(dico.prix_achat || dico.pa || dico.cost || '0');
  const lot = dico.lot || dico.batch || dico.nlot;
  const date_peremption = normaliserDate(dico.exp || dico.peremption || dico.date || dico.expiry || dico.date_peremption || '');
  const quantite = parseFloat(dico.quantite || dico.qte || dico.qty || '0');

  if (code || nom || lot) {
    return {
      code_barres: code ? code.trim() : '',
      nom: nom ? nom.trim() : undefined,
      prix_vente: !isNaN(prix_vente) && prix_vente > 0 ? prix_vente : undefined,
      prix_achat: !isNaN(prix_achat) && prix_achat > 0 ? prix_achat : undefined,
      lot: lot ? lot.trim() : undefined,
      date_peremption,
      quantite: !isNaN(quantite) && quantite > 0 ? quantite : undefined,
      format: 'cle_valeur',
    };
  }

  return null;
}

/**
 * Décode un texte séparé par point-virgule ou barre verticale
 * Ex: Paracétamol 500mg;1500;LOT-2026;2026-11-30;3400935987102
 */
function parserCSV(texte: string): Partial<CodePharmaParse> | null {
  const delim = texte.includes(';') ? ';' : texte.includes('|') ? '|' : null;
  if (!delim) return null;

  const morceaux = texte.split(delim).map((m) => m.trim()).filter(Boolean);
  if (morceaux.length < 3) return null;

  let nom: string | undefined;
  let code_barres: string | undefined;
  let prix_vente: number | undefined;
  let lot: string | undefined;
  let date_peremption: string | undefined;

  for (const m of morceaux) {
    // Si c'est une date
    const d = normaliserDate(m);
    if (d && !date_peremption) {
      date_peremption = d;
      continue;
    }

    // Si c'est un code-barres (chiffres >= 7 caractères)
    if (/^\d{7,14}$/.test(m) && !code_barres) {
      code_barres = m;
      continue;
    }

    // Si c'est un prix numérique
    if (/^\d+(\.\d+)?$/.test(m) && !prix_vente) {
      const val = parseFloat(m);
      if (val > 10) {
        prix_vente = val;
        continue;
      }
    }

    // Si commence par LOT
    if (/^lot[\-_]?[a-z0-9]+/i.test(m) && !lot) {
      lot = m;
      continue;
    }

    // Sinon considérer comme nom si texte alphabétique
    if (!nom && /[a-zA-Z]/.test(m)) {
      nom = m;
    }
  }

  if (code_barres || nom) {
    return {
      code_barres: code_barres || '',
      nom,
      prix_vente,
      lot,
      date_peremption,
      format: 'csv',
    };
  }

  return null;
}

/**
 * Fonction principale de parsing
 */
export function parserCodePharma(texteBrut: string): CodePharmaParse {
  if (!texteBrut) {
    return { raw: '', code_barres: '', format: 'standard' };
  }

  const nettoye = texteBrut.trim();

  // 1. Essai JSON
  const resJSON = parserJSON(nettoye);
  if (resJSON && (resJSON.code_barres || resJSON.nom)) {
    return {
      raw: nettoye,
      code_barres: resJSON.code_barres || nettoye,
      nom: resJSON.nom,
      prix_vente: resJSON.prix_vente,
      prix_achat: resJSON.prix_achat,
      lot: resJSON.lot,
      date_peremption: resJSON.date_peremption,
      quantite: resJSON.quantite,
      format: 'json',
    };
  }

  // 2. Essai GS1 DataMatrix Pharma
  const resGS1 = parserGS1DataMatrix(nettoye);
  if (resGS1 && resGS1.code_barres) {
    return {
      raw: nettoye,
      code_barres: resGS1.code_barres,
      nom: resGS1.nom,
      prix_vente: resGS1.prix_vente,
      prix_achat: resGS1.prix_achat,
      lot: resGS1.lot,
      date_peremption: resGS1.date_peremption,
      quantite: resGS1.quantite,
      format: 'gs1_datamatrix',
    };
  }

  // 3. Essai Clé-Valeur
  const resCleVal = parserCleValeur(nettoye);
  if (resCleVal && (resCleVal.code_barres || resCleVal.nom)) {
    return {
      raw: nettoye,
      code_barres: resCleVal.code_barres || nettoye,
      nom: resCleVal.nom,
      prix_vente: resCleVal.prix_vente,
      prix_achat: resCleVal.prix_achat,
      lot: resCleVal.lot,
      date_peremption: resCleVal.date_peremption,
      quantite: resCleVal.quantite,
      format: 'cle_valeur',
    };
  }

  // 4. Essai CSV
  const resCSV = parserCSV(nettoye);
  if (resCSV && (resCSV.code_barres || resCSV.nom)) {
    return {
      raw: nettoye,
      code_barres: resCSV.code_barres || nettoye,
      nom: resCSV.nom,
      prix_vente: resCSV.prix_vente,
      prix_achat: resCSV.prix_achat,
      lot: resCSV.lot,
      date_peremption: resCSV.date_peremption,
      quantite: resCSV.quantite,
      format: 'csv',
    };
  }

  // 5. Code standard (EAN-13, EAN-8, Code 128, etc.)
  // Nettoyer les espaces et caractères non imprimables
  const codePropre = nettoye.replace(/[\x00-\x1F\x7F-\x9F\s]/g, '');

  return {
    raw: nettoye,
    code_barres: codePropre,
    format: 'standard',
  };
}

