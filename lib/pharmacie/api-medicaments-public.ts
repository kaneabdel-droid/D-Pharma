/**
 * Service d'interrogation de l'API Publique des Médicaments (BDPM / ANSM / data.gouv.fr)
 * Permet d'extraire automatiquement le nom officiel, la formule (DCI / substance active),
 * la forme galénique, le dosage et la présentation à partir du code-barres (CIP-13) ou du nom.
 */

import { chercherDansDictionnaire } from './dictionnaire-medicaments';

export type ResultatMedicamentPublic = {
  nom: string;
  code_barres?: string;
  principe_actif?: string; // Formule / DCI (ex: PARACÉTAMOL 1000 mg)
  forme?: string;          // Forme galénique (ex: comprimé, gélule, sirop)
  dosage?: string;         // Dosage (ex: 1000 mg)
  laboratoire?: string;
  prix_indicatif?: number;
  type_produit: 'medicament' | 'materiel' | 'service';
  source: 'bdpm_api' | 'local_dico';
};

/**
 * Recherche un médicament dans l'API publique ouverte des médicaments (BDPM)
 * avec fallback instantané sur le dictionnaire officinal local.
 */
export async function chercherMedicamentApiPublique(query: string): Promise<ResultatMedicamentPublic | null> {
  if (!query || !query.trim()) return null;
  const q = query.trim();

  // 1. D'abord vérifier si le médicament est dans notre référentiel local / génériques UEMOA
  const refLocal = chercherDansDictionnaire(q);
  if (refLocal) {
    return {
      nom: refLocal.nom,
      code_barres: refLocal.code_barres,
      principe_actif: refLocal.principe_actif,
      forme: refLocal.forme,
      dosage: refLocal.dosage,
      prix_indicatif: refLocal.prix_vente_indicatif,
      type_produit: refLocal.type_produit || 'medicament',
      source: 'local_dico',
    };
  }

  // 2. Si la requête est un code-barres numérique à 13 ou 14 chiffres (CIP-13 ou EAN-13)
  if (/^\d{13,14}$/.test(q)) {
    const cip13 = q.length === 14 && q.startsWith('0') ? q.substring(1) : q;
    try {
      const res = await fetch(`https://medicaments-api.giygas.dev/v1/medicaments?cip=${cip13}`, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && (data.elementPharmaceutique || data.denomination || data.nom)) {
          return mapperMedicamentApi(data, cip13);
        }
      }
    } catch (e) {
      console.warn('Erreur appel API publique par CIP:', e);
    }
  }

  // 3. Recherche textuelle dans l'API publique par nom / libellé
  try {
    const res = await fetch(
      `https://medicaments-api.giygas.dev/v1/medicaments?search=${encodeURIComponent(q)}`,
      {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json' },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return mapperMedicamentApi(data[0], q);
      }
    }
  } catch (e) {
    console.warn('Erreur appel API publique par recherche:', e);
  }

  return null;
}

function mapperMedicamentApi(item: any, queryOriginale: string): ResultatMedicamentPublic {
  // Extraction des substances actives (formule / DCI)
  const substances: string[] = [];
  if (Array.isArray(item.composition)) {
    item.composition.forEach((c: any) => {
      if (c.denominationSubstance) {
        const d = (c.dosage || '').trim();
        const str = d ? `${c.denominationSubstance} (${d})` : c.denominationSubstance;
        substances.push(str);
      }
    });
  }

  // Trouver le CIP-13 associé
  let codeBarres = /^\d{13}$/.test(queryOriginale) ? queryOriginale : undefined;
  let prix: number | undefined;

  if (Array.isArray(item.presentation) && item.presentation.length > 0) {
    const pres = item.presentation[0];
    if (!codeBarres && pres.cip13) codeBarres = String(pres.cip13);
    if (pres.prixPublic && typeof pres.prixPublic === 'number') {
      // Conversion indicative Euro -> FCFA (1 € ≈ 655.957 FCFA) arrondi
      prix = Math.round(pres.prixPublic * 656);
    }
  }

  const nomNet = item.denomination || item.elementPharmaceutique || item.nom || 'Médicament';

  return {
    nom: nomNet,
    code_barres: codeBarres,
    principe_actif: substances.length > 0 ? substances.join(' + ') : undefined,
    forme: item.formePharmaceutique || undefined,
    dosage: item.composition?.[0]?.dosage || undefined,
    laboratoire: item.titulaire || undefined,
    prix_indicatif: prix,
    type_produit: 'medicament',
    source: 'bdpm_api',
  };
}

