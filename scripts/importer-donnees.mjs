#!/usr/bin/env node
/**
 * Agent CLI d'importation de données existantes pour D-PHARMA
 * 
 * Usage :
 *   node scripts/importer-donnees.mjs --entreprise="Pharmacie Centrale" --type=medicaments --fichier=./donnees.csv
 *   node scripts/importer-donnees.mjs --modele=medicaments
 *   node scripts/importer-donnees.mjs --modele=fournisseurs
 *   node scripts/importer-donnees.mjs --modele=clients
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')

// Chargement de l'environnement .env.local
function chargerEnv() {
  const envPath = path.join(appRoot, '.env.local')
  if (fs.existsSync(envPath)) {
    const lignes = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const ligne of lignes) {
      const idx = ligne.indexOf('=')
      if (idx > 0 && !ligne.trim().startsWith('#')) {
        const k = ligne.slice(0, idx).trim()
        const v = ligne.slice(idx + 1).trim()
        if (!process.env[k]) process.env[k] = v
      }
    }
  }
}
chargerEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Erreur : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis dans .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// Modèles d'exemple CSV
const MODELES = {
  medicaments: `nom;code_barres;principe_actif;description;soumis_ordonnance;quantite;prix_vente;lot;date_peremption
Paracétamol 500mg boîte 16;3400930000012;Paracétamol;Comprimé pelliculé antalgique;non;150;1200;LOT-2026-A1;2027-12-31
Amoxicilline 1g boîte 14;3400930000029;Amoxicilline;Antibiotique poudre suspension;oui;80;3500;LOT-2026-B2;2026-11-30
Ibuprofène 400mg boîte 20;3400930000036;Ibuprofène;Anti-inflammatoire non stéroïdien;non;120;1800;LOT-2026-C3;2027-06-30
Sérum Physiologique 500ml;3400930000043;Chlorure de sodium;Solution injectable/perfusion;non;200;950;LOT-2026-D4;2028-01-31`,

  fournisseurs: `nom;contact_email;contact_telephone;adresse
COPHARMA SENEGAL;commandes@copharma.sn;+221 33 800 00 00;Km 4 Boulevard du Centenaire, Dakar
LABOREX SENEGAL;contact@laborex.sn;+221 33 839 50 50;Zone Industrielle Bel-Air, Dakar
UBIPHARM SENEGAL;direction@ubipharm-sn.com;+221 33 849 70 70;Zone Franche Industrielle, Dakar`,

  clients: `nom;telephone;email;adresse
Moussa Diop;+221 77 123 45 67;moussa.diop@gmail.com;Pikine Tally Boumack, Dakar
Aïssatou Sow;+221 78 456 78 90;aissatou.sow@yahoo.fr;Mariste Villa 142, Dakar
Mamadou Ba;+221 76 654 32 10;;Médina Rue 22 x 11, Dakar`
}

function parserCSV(contenu) {
  const texte = contenu.replace(/^\uFEFF/, '').trim()
  if (!texte) return []
  const delim = texte.indexOf(';') !== -1 ? ';' : ','
  const lignes = texte.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lignes.length < 2) return []

  const enTetes = lignes[0].split(delim).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase())
  const resultats = []

  for (let i = 1; i < lignes.length; i++) {
    const rawCols = lignes[i].split(delim)
    const obj = {}
    enTetes.forEach((h, idx) => {
      const val = (rawCols[idx] ?? '').trim().replace(/^["']|["']$/g, '')
      obj[h] = val
    })
    resultats.push(obj)
  }
  return resultats
}

// Arguments CLI
const args = Object.fromEntries(
  process.argv.slice(2).map(arg => {
    const [k, v] = arg.replace(/^--/, '').split('=')
    return [k, v ?? true]
  })
)

if (args.modele) {
  const type = String(args.modele).toLowerCase()
  if (!MODELES[type]) {
    console.error(`Modèle inconnu "${type}". Disponibles : ${Object.keys(MODELES).join(', ')}`)
    process.exit(1)
  }
  const nomFichier = `modele_import_${type}.csv`
  fs.writeFileSync(nomFichier, MODELES[type], 'utf8')
  console.log(`✓ Fichier modèle généré avec succès : ${nomFichier}`)
  process.exit(0)
}

async function executerImport() {
  const entrepriseCible = args.entreprise
  const type = (args.type || 'medicaments').toLowerCase()
  const cheminFichier = args.fichier

  if (!entrepriseCible || !cheminFichier) {
    console.log(`
Agent CLI d'Importation — D-PHARMA
----------------------------------
Usage :
  node scripts/importer-donnees.mjs --entreprise="<ID_OU_NOM>" --type=<medicaments|fournisseurs|clients> --fichier=<chemin.csv>
  node scripts/importer-donnees.mjs --modele=<medicaments|fournisseurs|clients>
    `)
    process.exit(1)
  }

  if (!fs.existsSync(cheminFichier)) {
    console.error(`Fichier introuvable : ${cheminFichier}`)
    process.exit(1)
  }

  // Résolution de l'entreprise (GIE)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entrepriseCible)
  let requete = supabase.from('gies').select('id, nom')
  if (isUuid) {
    requete = requete.eq('id', entrepriseCible)
  } else {
    requete = requete.ilike('nom', `%${entrepriseCible}%`)
  }
  const { data: gies, error: errGie } = await requete
  if (errGie || !gies || gies.length === 0) {
    console.error(`Aucune pharmacie/entreprise trouvée pour "${entrepriseCible}"`)
    process.exit(1)
  }

  const gie = gies[0]
  console.log(`Entreprise identifiée : ${gie.nom} (${gie.id})`)
  console.log(`Type d'import : ${type}`)

  const contenu = fs.readFileSync(cheminFichier, 'utf8')
  let records = []
  if (cheminFichier.endsWith('.json')) {
    records = JSON.parse(contenu)
  } else {
    records = parserCSV(contenu)
  }

  console.log(`Nombre de lignes détectées : ${records.length}`)
  let succes = 0
  let erreurs = 0

  if (type === 'medicaments') {
    for (const item of records) {
      try {
        const nom = item.nom || item.designation || item.libelle
        if (!nom) {
          console.warn(`Ligne ignorée (nom absent) :`, item)
          erreurs++
          continue
        }

        const codeBarres = item.code_barres || item.codebarres || item.code || null
        const principeActif = item.principe_actif || item.principeactif || null
        const description = item.description || null
        const soumisOrdonnance = ['oui', 'true', '1', 'o'].includes(String(item.soumis_ordonnance || '').toLowerCase())

        // 1. Insertion ou récupération du médicament dans le catalogue
        let medicamentId = null
        if (codeBarres) {
          const { data: existant } = await supabase.from('medicaments').select('id').eq('code_barres', codeBarres).maybeSingle()
          if (existant) medicamentId = existant.id
        }
        if (!medicamentId) {
          const { data: existantNom } = await supabase.from('medicaments').select('id').ilike('nom', nom).maybeSingle()
          if (existantNom) medicamentId = existantNom.id
        }

        if (!medicamentId) {
          const { data: nouveauMed, error: errMed } = await supabase.from('medicaments').insert({
            nom,
            code_barres: codeBarres,
            principe_actif: principeActif,
            description,
            soumis_ordonnance: soumisOrdonnance
          }).select('id').single()

          if (errMed) throw errMed
          medicamentId = nouveauMed.id
        }

        // 2. Initialisation du stock pour la pharmacie
        const quantite = parseFloat(item.quantite || item.stock || '0') || 0
        const prixVente = parseFloat(item.prix_vente || item.prix || '0') || 0
        const lot = item.lot || 'INITIAL'
        const datePeremption = item.date_peremption || item.peremption || new Date(Date.now() + 365*24*3600*1000).toISOString().split('T')[0]

        const { error: errStock } = await supabase.from('stocks_pharmacie').insert({
          gie_id: gie.id,
          medicament_id: medicamentId,
          quantite,
          prix_vente: prixVente,
          lot,
          date_peremption: datePeremption
        })

        if (errStock) throw errStock
        succes++
      } catch (e) {
        console.error(`Erreur import médicament "${item.nom}" :`, e.message)
        erreurs++
      }
    }
  } else if (type === 'fournisseurs') {
    for (const item of records) {
      try {
        const nom = item.nom || item.fournisseur || item.laboratoire
        if (!nom) {
          erreurs++
          continue
        }
        const { error: errFourn } = await supabase.from('fournisseurs_labo').insert({
          gie_id: gie.id,
          nom,
          contact_email: item.contact_email || item.email || null,
          contact_telephone: item.contact_telephone || item.telephone || null,
          adresse: item.adresse || null
        })
        if (errFourn) throw errFourn
        succes++
      } catch (e) {
        console.error(`Erreur import fournisseur "${item.nom}" :`, e.message)
        erreurs++
      }
    }
  } else if (type === 'clients') {
    for (const item of records) {
      try {
        const nom = item.nom || item.client
        if (!nom) {
          erreurs++
          continue
        }
        const { error: errClient } = await supabase.from('clients_externes').insert({
          gie_id: gie.id,
          nom,
          telephone: item.telephone || item.contact_telephone || null,
          email: item.email || item.contact_email || null,
          adresse: item.adresse || null
        })
        if (errClient) throw errClient
        succes++
      } catch (e) {
        console.error(`Erreur import client "${item.nom}" :`, e.message)
        erreurs++
      }
    }
  } else {
    console.error(`Type "${type}" non pris en charge. Types valides : medicaments, fournisseurs, clients`)
    process.exit(1)
  }

  console.log(`\nImportation terminée pour ${gie.nom} :`)
  console.log(`✓ Lignes importées avec succès : ${succes}`)
  if (erreurs > 0) console.log(`✗ Échecs ou ignorées : ${erreurs}`)
}

executerImport()
