/**
 * Module universel de décodage des codes pharmaceutiques
 * Prend en charge :
 * 1. GS1 DataMatrix Pharma (Norme internationale pour boîtes de médicaments : GTIN, Date de péremption, Lot, Série)
 * 2. QR Codes JSON (Nom, Prix, Lot, Péremption, Code)
 * 3. QR Codes Clé-Valeur (NOM:... | PRIX:... | LOT:... | EXP:...)
 * 4. QR Codes délimités CSV / Point-virgule
 * 5. QR Codes de type URL / Paramètres HTTP
 * 6. Codes-barres 1D classiques (CIP13, EAN-13, EAN-8, Code 128)
 * 
 * Auto-enrichit automatiquement avec le Nom et Prix indicatif via le dictionnaire officinal
 * même si le fabricant n'encode que le GTIN/Lot/Péremption.
 */

import { chercherDansDictionnaire } from './dictionnaire-medicaments';

export type CodePharmaParse = {
  raw: string;
  code_barres: string;
  nom?: string;
  principe_actif?: string; // Formule / DCI (ex: Paracétamol, Tiémonium méthylsulfate)
  forme?: string;
  dosage?: string;
  prix_vente?: number;
  prix_achat?: number;
  lot?: string;
  date_peremption?: string; // Format ISO YYYY-MM-DD
  quantite?: number;
  type_produit?: 'medicament' | 'materiel' | 'service';
  format: 'gs1_datamatrix' | 'json' | 'cle_valeur' | 'csv' | 'url' | 'standard';
};

const MOIS_NOMS_MAP: Record<string, number> = {
  jan: 1, janv: 1, janvier: 1, january: 1,
  fev: 2, fevr: 2, fevrier: 2, feb: 2, february: 2,
  mar: 3, mars: 3, march: 3,
  avr: 4, avril: 4, apr: 4, april: 4,
  mai: 5, may: 5,
  juin: 6, jun: 6, june: 6,
  juil: 7, juill: 7, juillet: 7, jul: 7, july: 7,
  aou: 8, aout: 8, août: 8, aug: 8, august: 8,
  sep: 9, sept: 9, septembre: 9, september: 9,
  oct: 10, octo: 10, octobre: 10, october: 10,
  nov: 11, nouvembre: 11, novembre: 11, november: 11,
  dec: 12, decembre: 12, déc: 12, décembre: 12, december: 12,
};

function fabriquerDateFinMois(annee: number, mois: number, jour?: number): string | undefined {
  let a = annee;
  if (a < 100) {
    a = a >= 70 ? 1900 + a : 2000 + a;
  }
  if (mois < 1 || mois > 12 || a < 1990 || a > 2100) return undefined;
  const dernierJour = new Date(a, mois, 0).getDate();
  const j = jour && jour >= 1 && jour <= dernierJour ? jour : dernierJour;
  return `${a}-${mois.toString().padStart(2, '0')}-${j.toString().padStart(2, '0')}`;
}

/**
 * Normalise une date en chaîne 'YYYY-MM-DD'
 * Gère les dates complètes (DD/MM/YYYY) ainsi que les dates pharmaceutiques
 * sans jour (MM/YYYY, Nov 2027, NOV 27, 12 2028) qui expirent au DERNIER JOUR du mois.
 */
export function normaliserDate(rawDate: string): string | undefined {
  if (!rawDate) return undefined;
  const d = rawDate.trim();

  // Déjà au format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;

  // Format DD/MM/YYYY ou DD-MM-YYYY ou DD.MM.YYYY
  const frMatch = d.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (frMatch) {
    const jour = parseInt(frMatch[1], 10);
    const mois = parseInt(frMatch[2], 10);
    const annee = parseInt(frMatch[3], 10);
    return fabriquerDateFinMois(annee, mois, jour);
  }

  // Format DD/MM/YY ou DD-MM-YY
  const frShortMatch = d.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/);
  if (frShortMatch) {
    const jour = parseInt(frShortMatch[1], 10);
    const mois = parseInt(frShortMatch[2], 10);
    const yy = parseInt(frShortMatch[3], 10);
    return fabriquerDateFinMois(yy, mois, jour);
  }

  // Format Jour + Mois textuel + Année (ex: "15 Nov 2027", "15-NOV-27")
  const dayTextMoisMatch = d.match(/^(\d{1,2})[\s\.\/\-_|]+([A-Za-zÀ-ÿ]{3,10})[\s\.\/\-_|]+(20\d{2}|\d{2})$/);
  if (dayTextMoisMatch) {
    const jour = parseInt(dayTextMoisMatch[1], 10);
    const cleMois = dayTextMoisMatch[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const mois = MOIS_NOMS_MAP[cleMois] || MOIS_NOMS_MAP[cleMois.substring(0, 3)] || MOIS_NOMS_MAP[cleMois.substring(0, 4)];
    if (mois) {
      const annee = parseInt(dayTextMoisMatch[3], 10);
      return fabriquerDateFinMois(annee, mois, jour);
    }
  }

  // Format Mois textuel + Année sans jour (ex: "Nov 2027", "NOV. 2027", "NOV 27", "NOV/27", "NOV-2027", "Novembre 2028")
  const textMoisMatch = d.match(/^([A-Za-zÀ-ÿ]{3,10})[\s\.\/\-_|]+(20\d{2}|\d{2})$/);
  if (textMoisMatch) {
    const cleMois = textMoisMatch[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const mois = MOIS_NOMS_MAP[cleMois] || MOIS_NOMS_MAP[cleMois.substring(0, 3)] || MOIS_NOMS_MAP[cleMois.substring(0, 4)];
    if (mois) {
      const annee = parseInt(textMoisMatch[2], 10);
      return fabriquerDateFinMois(annee, mois);
    }
  }

  // Format MM/YYYY ou MM-YYYY ou MM.YYYY ou MM YYYY (sans jour => dernier jour du mois)
  const my4Match = d.match(/^(\d{1,2})[\s\/\-\._|]+(20\d{2})$/);
  if (my4Match) {
    const mm = parseInt(my4Match[1], 10);
    const yyyy = parseInt(my4Match[2], 10);
    if (mm >= 1 && mm <= 12) {
      return fabriquerDateFinMois(yyyy, mm);
    }
  }

  // Format MM/YY ou MM-YY ou MM.YY ou MM YY (ex: 11/28, 05/27, 12 28)
  const my2Match = d.match(/^(\d{1,2})[\s\/\-\._|]+(\d{2})$/);
  if (my2Match) {
    const mm = parseInt(my2Match[1], 10);
    const yy = parseInt(my2Match[2], 10);
    if (mm >= 1 && mm <= 12) {
      return fabriquerDateFinMois(yy, mm);
    }
  }

  // Format YYMMDD (GS1 Healthcare standard: 6 chiffres)
  const gs1Match = d.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (gs1Match) {
    const yy = parseInt(gs1Match[1], 10);
    const mm = parseInt(gs1Match[2], 10);
    const dd = parseInt(gs1Match[3], 10);
    if (mm >= 1 && mm <= 12) {
      return fabriquerDateFinMois(yy, mm, dd === 0 ? undefined : dd);
    }
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
 * Extrait spécifiquement la date de péremption d'un texte de boîte de médicament
 * en gérant les préfixes (EXP, PER, CAD, etc.), les mois textuels (Nov 2027),
 * les formats sans jour (12/2028), tout en ignorant les dates de fabrication (FAB, MFG).
 */
export function extraireDatePeremptionBoite(texte: string): string | undefined {
  if (!texte) return undefined;

  // 1. Chercher d'abord après un préfixe explicite d'expiration / péremption
  const prefixeRegex = /(?:EXP|EXPIRY|PER|P[EÉ]R|P[EÉ]REMPTION|CAD|DLUO|VAL|VALABLE|USE\s*BY|UTILISER\s*AVANT|BEST\s*BEFORE)[\s\.:\-_|]*([^\r\n]{2,30})/gi;
  let match: RegExpExecArray | null;
  while ((match = prefixeRegex.exec(texte)) !== null) {
    const sousTexte = match[1].trim();
    const tokens = sousTexte.split(/[\s;,]+/);
    for (let len = 3; len >= 1; len--) {
      const probe = tokens.slice(0, len).join(' ');
      const res = normaliserDate(probe);
      if (res) return res;
    }
    const token1 = tokens[0] || '';
    const res1 = normaliserDate(token1);
    if (res1) return res1;
  }

  // 2. Si pas de préfixe explicite, ignorer d'abord les mentions de fabrication (FAB, MFG, PROD)
  const sansFab = texte.replace(/(?:FAB|MFG|PROD|FABRICATION|DATE\s*FAB|MFR)[\s\.:\-_|]*([^\r\n]{2,20})/gi, ' ');

  // Chercher d'abord format Jour + Mois textuel + Année (ex: "15 Nov 2027", "15-NOV-27")
  const dayMoisTextRegex = /\b([0-2]?\d|3[01])[\s\.\/\-_|]+(JAN|JANV|FEV|FEVR|FEB|MAR|MARS|APR|AVR|MAY|MAI|JUN|JUIN|JUL|JUIL|AOU|AOUT|AUG|SEP|SEPT|OCT|NOV|DEC)[\s\.\/\-_|]+(20\d{2}|\d{2})\b/i;
  const dmtMatch = sansFab.match(dayMoisTextRegex);
  if (dmtMatch) {
    const d = normaliserDate(dmtMatch[0]);
    if (d) return d;
  }

  // Chercher format Mois textuel + Année sans jour (ex: "Nov 2027", "NOV. 2027", "NOV 27", "DEC 2028")
  const moisTextRegex = /\b(JAN|JANV|FEV|FEVR|FEB|MAR|MARS|APR|AVR|MAY|MAI|JUN|JUIN|JUL|JUIL|AOU|AOUT|AUG|SEP|SEPT|OCT|NOV|DEC)[\s\.\/\-_|]+(20\d{2}|\d{2})\b/i;
  const mtMatch = sansFab.match(moisTextRegex);
  if (mtMatch) {
    const d = normaliserDate(mtMatch[0]);
    if (d) return d;
  }

  // Chercher MM/YYYY ou MM-YYYY ou MM.YYYY ou MM YYYY (2024-2039)
  const my4Regex = /\b(0[1-9]|1[0-2])[\s\/\-\._|]+(20[2-3]\d)\b/;
  const my4 = sansFab.match(my4Regex);
  if (my4) {
    const d = normaliserDate(`${my4[1]}/${my4[2]}`);
    if (d) return d;
  }

  // Chercher DD/MM/YYYY
  const dmyRegex = /\b([0-2]?\d|3[01])[\/\-\.](0[1-9]|1[0-2])[\/\-\.](20[2-3]\d)\b/;
  const dmy = sansFab.match(dmyRegex);
  if (dmy) {
    const d = normaliserDate(dmy[0]);
    if (d) return d;
  }

  // Chercher MM/YY (ex: 11/27, 12/28)
  const my2Regex = /\b(0[1-9]|1[0-2])[\/\-\.](2[5-9]|3\d)\b/;
  const my2 = sansFab.match(my2Regex);
  if (my2) {
    const d = normaliserDate(`${my2[1]}/${my2[2]}`);
    if (d) return d;
  }

  return undefined;
}

/**
 * Décode un code GS1 DataMatrix (avec ou sans parenthèses, avec ou sans FNC1 \x1d, avec ou sans préfixe de symbologie ]d2)
 * Ex: ]d201034009359871021726113010LOT459
 * ou: (01)03400935987102(17)261130(10)LOT459
 * ou: 01034009359871021726113010LOT459
 */
export function parserGS1DataMatrix(texte: string): Partial<CodePharmaParse> | null {
  if (!texte) return null;

  // Supprimer tout préfixe de symbologie (ex: ]d2 pour DataMatrix GS1, ]Q3 pour QR GS1, ]C1 pour Code 128 GS1)
  let clean = texte.replace(/^\][a-zA-Z0-9]{2}/, '');

  // Remplacer les caractères de contrôle FNC1 (ASCII 29 GS, ASCII 30 RS, ASCII 4 EOT) par '|'
  clean = clean.replace(/[\x1d\x1e\x04]/g, '|').trim();

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

  // Cas 2 : Sans parenthèses (format continu GS1 brut des boîtes de médicaments)
  if (!gtin) {
    const rawMatch = clean.match(/^01(\d{14})(.*)$/);
    if (rawMatch) {
      gtin = rawMatch[1];
      let reste = rawMatch[2];

      // Parcourir les identifiants d'application restants
      while (reste.length > 0) {
        if (reste.startsWith('|')) {
          reste = reste.substring(1);
          continue;
        }

        // AI 17 : Date d'expiration (6 chiffres YYMMDD)
        if (reste.startsWith('17') && reste.length >= 8 && /^\d{6}/.test(reste.substring(2, 8))) {
          expDate = normaliserDate(reste.substring(2, 8));
          reste = reste.substring(8);
          continue;
        }

        // AI 11 : Date de fabrication (6 chiffres YYMMDD)
        if (reste.startsWith('11') && reste.length >= 8 && /^\d{6}/.test(reste.substring(2, 8))) {
          reste = reste.substring(8);
          continue;
        }

        // AI 10 : Numéro de lot (jusqu'à 20 caractères, s'arrête à '|' ou prochain AI connu ou fin)
        if (reste.startsWith('10')) {
          const sansPrefixe = reste.substring(2);
          const endIdx = sansPrefixe.indexOf('|');
          if (endIdx !== -1) {
            lot = sansPrefixe.substring(0, endIdx).trim();
            reste = sansPrefixe.substring(endIdx + 1);
          } else {
            // Chercher si un autre AI (comme 17 ou 21) suit sans séparateur
            const next17 = sansPrefixe.search(/17\d{6}/);
            if (next17 !== -1) {
              lot = sansPrefixe.substring(0, next17).trim();
              reste = sansPrefixe.substring(next17);
            } else {
              lot = sansPrefixe.trim();
              reste = '';
            }
          }
          continue;
        }

        // AI 21 : Numéro de série
        if (reste.startsWith('21')) {
          const sansPrefixe = reste.substring(2);
          const endIdx = sansPrefixe.indexOf('|');
          if (endIdx !== -1) {
            reste = sansPrefixe.substring(endIdx + 1);
          } else {
            reste = '';
          }
          continue;
        }

        // Si aucun AI reconnu en début, avance d'un caractère
        reste = reste.substring(1);
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
export function parserJSON(texte: string): Partial<CodePharmaParse> | null {
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
    const type_produit = obj.type_produit || (obj.service ? 'service' : undefined);

    return {
      code_barres: String(code || '').trim(),
      nom: nom ? String(nom).trim() : undefined,
      prix_vente: !isNaN(prix_vente) && prix_vente > 0 ? prix_vente : undefined,
      prix_achat: !isNaN(prix_achat) && prix_achat > 0 ? prix_achat : undefined,
      lot: lot ? String(lot).trim() : undefined,
      date_peremption,
      quantite: !isNaN(quantite) && quantite > 0 ? quantite : undefined,
      type_produit,
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
export function parserCleValeur(texte: string): Partial<CodePharmaParse> | null {
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
 * Décode un texte séparé par point-virgule ou barre verticale (format CSV / Bon de livraison)
 * Ex: Paracétamol 500mg;1500;LOT-2026;2026-11-30;3400935987102
 */
export function parserCSV(texte: string): Partial<CodePharmaParse> | null {
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
 * Décode une URL avec paramètres (ex: https://.../scan?nom=...&prix=...&lot=...)
 */
export function parserURL(texte: string): Partial<CodePharmaParse> | null {
  if (!texte.includes('?') && !texte.startsWith('http')) return null;

  try {
    const urlObj = new URL(texte.startsWith('http') ? texte : `http://localhost/${texte}`);
    const params = urlObj.searchParams;

    const code = params.get('code') || params.get('code_barres') || params.get('cip') || params.get('gtin') || params.get('ean');
    const nom = params.get('nom') || params.get('designation') || params.get('article');
    const prix = params.get('prix') || params.get('prix_vente') || params.get('pv');
    const lot = params.get('lot') || params.get('batch');
    const exp = params.get('exp') || params.get('date_peremption') || params.get('peremption');

    if (code || nom || lot) {
      return {
        code_barres: code ? code.trim() : '',
        nom: nom ? nom.trim() : undefined,
        prix_vente: prix ? parseFloat(prix) : undefined,
        lot: lot ? lot.trim() : undefined,
        date_peremption: exp ? normaliserDate(exp) : undefined,
        format: 'url',
      };
    }
  } catch { }

  return null;
}

/**
 * Fonction principale universelle de parsing
 * Décode le code scanné et auto-complète instantanément le nom et le prix indicatif
 * si le médicament est répertorié dans la pharmacopée officinale.
 */
export function parserCodePharma(texteBrut: string): CodePharmaParse {
  if (!texteBrut) {
    return { raw: '', code_barres: '', format: 'standard' };
  }

  const nettoye = texteBrut.trim();

  let resultat: CodePharmaParse | null = null;

  // 1. Essai JSON
  const resJSON = parserJSON(nettoye);
  if (resJSON && (resJSON.code_barres || resJSON.nom)) {
    resultat = {
      raw: nettoye,
      code_barres: resJSON.code_barres || nettoye,
      nom: resJSON.nom,
      prix_vente: resJSON.prix_vente,
      prix_achat: resJSON.prix_achat,
      lot: resJSON.lot,
      date_peremption: resJSON.date_peremption,
      quantite: resJSON.quantite,
      type_produit: resJSON.type_produit,
      format: 'json',
    };
  }

  // 2. Essai GS1 DataMatrix Pharma (Boîtes de médicaments)
  if (!resultat) {
    const resGS1 = parserGS1DataMatrix(nettoye);
    if (resGS1 && resGS1.code_barres) {
      resultat = {
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
  }

  // 3. Essai URL
  if (!resultat) {
    const resURL = parserURL(nettoye);
    if (resURL && (resURL.code_barres || resURL.nom)) {
      resultat = {
        raw: nettoye,
        code_barres: resURL.code_barres || nettoye,
        nom: resURL.nom,
        prix_vente: resURL.prix_vente,
        prix_achat: resURL.prix_achat,
        lot: resURL.lot,
        date_peremption: resURL.date_peremption,
        format: 'url',
      };
    }
  }

  // 4. Essai Clé-Valeur
  if (!resultat) {
    const resCleVal = parserCleValeur(nettoye);
    if (resCleVal && (resCleVal.code_barres || resCleVal.nom)) {
      resultat = {
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
  }

  // 5. Essai CSV
  if (!resultat) {
    const resCSV = parserCSV(nettoye);
    if (resCSV && (resCSV.code_barres || resCSV.nom)) {
      resultat = {
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
  }

  // 6. Code standard (EAN-13, EAN-8, Code 128, etc.)
  if (!resultat) {
    // Nettoyer les espaces, caractères non imprimables et préfixes de symbologie
    let codePropre = nettoye.replace(/^\][a-zA-Z0-9]{2}/, '').replace(/[\x00-\x1F\x7F-\x9F\s]/g, '');
    
    // Si GTIN-14 commençant par 0, extraire le CIP-13
    if (codePropre.length === 14 && codePropre.startsWith('0')) {
      codePropre = codePropre.substring(1);
    }

    resultat = {
      raw: nettoye,
      code_barres: codePropre,
      format: 'standard',
    };
  }

  // 7. ENRICHISSEMENT AUTOMATIQUE VIA LE RÉFÉRENTIEL PHARMA :
  // Si le nom ou le prix est manquant (par exemple pour une boîte avec GS1 DataMatrix ou EAN-13),
  // on interroge le dictionnaire pour pré-remplir instantanément le nom et le prix indicatif !
  if (resultat.code_barres) {
    const ref = chercherDansDictionnaire(resultat.code_barres);
    if (ref) {
      if (!resultat.nom) resultat.nom = ref.nom;
      if (!resultat.principe_actif && ref.principe_actif) resultat.principe_actif = ref.principe_actif;
      if (!resultat.forme && ref.forme) resultat.forme = ref.forme;
      if (!resultat.dosage && ref.dosage) resultat.dosage = ref.dosage;
      if (!resultat.prix_vente && ref.prix_vente_indicatif) resultat.prix_vente = ref.prix_vente_indicatif;
      if (!resultat.prix_achat && ref.prix_achat_indicatif) resultat.prix_achat = ref.prix_achat_indicatif;
      if (!resultat.type_produit) resultat.type_produit = ref.type_produit;
    }
  }

  return resultat;
}

/**
 * Analyse le texte brut extrait par OCR d'une boîte de médicament ou d'une étiquette
 * pour extraire automatiquement :
 * - Le numéro de Lot (LOT / BATCH / B.No)
 * - La date de péremption (EXP / PER / DLUO)
 * - Le prix de vente étiqueté (PPV / PRIX)
 * - Le code-barres / CIP (si présent sous forme de chiffres)
 * - Le nom du médicament (par recherche floue dans le dictionnaire)
 */
export function parserTexteBoiteMedicament(texteBrut: string): CodePharmaParse {
  if (!texteBrut) {
    return { raw: '', code_barres: '', format: 'standard' };
  }

  const t = texteBrut.trim();
  let lot: string | undefined;
  let date_peremption: string | undefined;
  let prix_vente: number | undefined;
  let code_barres: string | undefined;
  let nom: string | undefined;
  let type_produit: 'medicament' | 'materiel' | 'service' | undefined = 'medicament';

  // 1. Détection du numéro de Lot
  const lotMatch = t.match(/(?:LOT|BATCH|B\.?NO|B\/N|N°\s*LOT)[\s\.:\-_]*([A-Z0-9\-_/]{3,20})/i);
  if (lotMatch) {
    lot = lotMatch[1].trim();
  }

  // 2. Détection de la date d'expiration / péremption (supporte 12/2028, Nov 2027, NOV 27, EXP 12 2028, etc.)
  date_peremption = extraireDatePeremptionBoite(t);

  // 3. Détection du Prix étiqueté (PPV, P.P.V, PRIX, P.V, TARIF, ou montant avec FCFA / F)
  const prixMatch = t.match(/(?:PPV|P\.P\.V|PRIX|P\.V|TARIF)[\s\.:\-_]*(\d[\d\s]*\d|\d+)\s*(?:F|CFA|FCFA)?/i) ||
                    t.match(/\b(\d{3,6})\s*(?:FCFA|CFA|F)\b/i);
  if (prixMatch) {
    const brut = prixMatch[1].replace(/\s+/g, '');
    const val = parseFloat(brut);
    if (!isNaN(val) && val >= 50 && val <= 500000) {
      prix_vente = val;
    }
  }

  // 4. Détection de code-barres numérique présent sur la boîte (13 ou 14 chiffres, ou 7-8 chiffres)
  const cbMatch = t.match(/\b(\d{13,14})\b/) || t.match(/\b(\d{7,8})\b/);
  if (cbMatch) {
    let cb = cbMatch[1];
    if (cb.length === 14 && cb.startsWith('0')) cb = cb.substring(1);
    code_barres = cb;
  }

  // 5. Recherche du nom du médicament parmi les lignes du texte
  const lignes = t.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  let principe_actif: string | undefined;
  let forme: string | undefined;
  let dosage: string | undefined;

  for (const ligne of lignes) {
    if (ligne.length >= 3) {
      const matchDico = chercherDansDictionnaire(ligne);
      if (matchDico) {
        nom = matchDico.nom;
        // IMPORTANT: Ne JAMAIS inventer un code-barres depuis le dictionnaire si non scanné
        if (!prix_vente && matchDico.prix_vente_indicatif) prix_vente = matchDico.prix_vente_indicatif;
        if (matchDico.principe_actif) principe_actif = matchDico.principe_actif;
        if (matchDico.forme) forme = matchDico.forme;
        if (matchDico.dosage) dosage = matchDico.dosage;
        if (matchDico.type_produit) type_produit = matchDico.type_produit;
        break;
      }
    }
  }

  // 6. Si on a trouvé un code-barres mais pas de nom/prix, enrichir via le dictionnaire
  if (code_barres && (!nom || !prix_vente)) {
    const matchDico = chercherDansDictionnaire(code_barres);
    if (matchDico) {
      if (!nom) nom = matchDico.nom;
      if (!prix_vente && matchDico.prix_vente_indicatif) prix_vente = matchDico.prix_vente_indicatif;
      if (!principe_actif && matchDico.principe_actif) principe_actif = matchDico.principe_actif;
      if (!forme && matchDico.forme) forme = matchDico.forme;
      if (!dosage && matchDico.dosage) dosage = matchDico.dosage;
      if (matchDico.type_produit) type_produit = matchDico.type_produit;
    }
  }

  return {
    raw: t,
    code_barres: code_barres || '',
    nom,
    principe_actif,
    forme,
    dosage,
    prix_vente,
    lot,
    date_peremption,
    type_produit,
    format: 'standard'
  };
}
