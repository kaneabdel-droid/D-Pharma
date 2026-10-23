'use server'

import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import { revalidatePath } from 'next/cache'

export async function getCalculDeclarationTVA(mois: number, annee: number) {
  const tenant = await getTenantContext()
  if (!tenant) return { calcul: null, error: 'Non authentifié' }

  const supabase = await createClient()

  // Définir les dates de début et fin de mois
  const dateDebut = `${annee}-${String(mois).padStart(2, '0')}-01`
  const dernierJour = new Date(annee, mois, 0).getDate()
  const dateFin = `${annee}-${String(mois).padStart(2, '0')}-${dernierJour}`

  // 1. Récupérer les ventes de la période
  const { data: ventes } = await supabase
    .from('ventes_pharmacie')
    .select(`
      id,
      montant_total,
      date_vente,
      lignes_vente_pharmacie (
        id,
        quantite,
        prix_unitaire,
        medicament_id,
        medicaments (categorie_tva, taux_tva)
      )
    `)
    .eq('gie_id', tenant.gieId)
    .gte('date_vente', `${dateDebut}T00:00:00`)
    .lte('date_vente', `${dateFin}T23:59:59`)

  let caMedicamentsExonere = 0
  let caTaxableTTC = 0

  for (const v of ventes || []) {
    for (const l of (v as any).lignes_vente_pharmacie || []) {
      const montantLigne = (Number(l.quantite) || 0) * (Number(l.prix_unitaire) || 0)
      const cat = l.medicaments?.categorie_tva
      if (cat === 'cosmetique_taxable' || cat === 'parapharmacie_taxable' || cat === 'materiel_taxable') {
        caTaxableTTC += montantLigne
      } else {
        caMedicamentsExonere += montantLigne
      }
    }
  }

  // Base HT taxable (au taux de 18% standard UEMOA/Sénégal) : HT = TTC / 1.18
  const caTaxableHT = Math.round(caTaxableTTC / 1.18)
  const tvaCollecteeBrute = caTaxableTTC - caTaxableHT

  // 2. Récupérer les achats grossistes de la période
  const { data: achatsCompta } = await supabase
    .from('lignes_ecritures_comptables')
    .select('compte, debit, credit, ecritures_comptables!inner(date_ecriture, journal)')
    .eq('gie_id', tenant.gieId)
    .gte('ecritures_comptables.date_ecriture', dateDebut)
    .lte('ecritures_comptables.date_ecriture', dateFin)

  let achatsMedicamentsExonere = 0
  let achatsTaxablesHT = 0
  let tvaDeductibleAchats = 0

  for (const l of achatsCompta || []) {
    if (l.compte === '601') {
      achatsMedicamentsExonere += Number(l.debit) || 0
    } else if (l.compte === '602') {
      achatsTaxablesHT += Number(l.debit) || 0
      tvaDeductibleAchats += Math.round((Number(l.debit) || 0) * 0.18)
    } else if (l.compte === '4452') {
      tvaDeductibleAchats += Number(l.debit) || 0
    }
  }

  // 3. Récupérer les PV de destruction de périmés visés par huissier/hygiène du mois
  const { data: pvDestructions } = await supabase
    .from('produits_perimes_destructions')
    .select('valeur_achat_ht_totale, tva_recuperable_totale, autorite_type')
    .eq('gie_id', tenant.gieId)
    .gte('date_destruction', dateDebut)
    .lte('date_destruction', dateFin)

  // La TVA sur périmés n'est admise en déduction/régularisation QUE si visée par huissier ou hygiène
  let tvaRegularisablePVPérimes = 0
  for (const pv of pvDestructions || []) {
    if (pv.autorite_type !== 'interne_officine') {
      tvaRegularisablePVPérimes += Number(pv.tva_recuperable_totale) || 0
    }
  }

  // 4. Crédit de TVA antérieur
  const moisPrecedent = mois === 1 ? 12 : mois - 1
  const anneePrecedente = mois === 1 ? annee - 1 : annee

  const { data: declaPrec } = await supabase
    .from('declarations_tva_pharma')
    .select('credit_tva_a_reporter')
    .eq('gie_id', tenant.gieId)
    .eq('periode_mois', moisPrecedent)
    .eq('periode_annee', anneePrecedente)
    .maybeSingle()

  const creditTVAPeriodePrecedente = Number(declaPrec?.credit_tva_a_reporter) || 0

  // 5. Total des déductions et solde net
  const totalTVADeductible = tvaDeductibleAchats + tvaRegularisablePVPérimes
  const totalDeductionsCumulees = totalTVADeductible + creditTVAPeriodePrecedente

  const soldeTVA = tvaCollecteeBrute - totalDeductionsCumulees
  const tvaNetteDue = soldeTVA > 0 ? soldeTVA : 0
  const creditTVAAreporter = soldeTVA < 0 ? Math.abs(soldeTVA) : 0

  // Vérifier si une déclaration existe déjà
  const { data: existante } = await supabase
    .from('declarations_tva_pharma')
    .select('*')
    .eq('gie_id', tenant.gieId)
    .eq('periode_mois', mois)
    .eq('periode_annee', annee)
    .maybeSingle()

  return {
    calcul: {
      periodeMois: mois,
      periodeAnnee: annee,
      dateDebut,
      dateFin,
      caMedicamentsExonere,
      caTaxableTTC,
      caTaxableHT,
      tvaCollecteeBrute,
      achatsMedicamentsExonere,
      achatsTaxablesHT,
      tvaDeductibleAchats,
      tvaRegularisablePVPérimes,
      totalTVADeductible,
      creditTVAPeriodePrecedente,
      totalDeductionsCumulees,
      tvaNetteDue,
      creditTVAAreporter,
      existante,
    },
    error: null,
  }
}

export async function validerDeclarationTVA(formData: FormData) {
  const tenant = await getTenantContext()
  if (!tenant) return { error: 'Non authentifié' }

  const supabase = await createClient()

  const periode_mois = parseInt(formData.get('periode_mois') as string, 10)
  const periode_annee = parseInt(formData.get('periode_annee') as string, 10)
  const ca_medicaments_exonere = parseFloat(formData.get('ca_medicaments_exonere') as string || '0')
  const ca_taxable_ht = parseFloat(formData.get('ca_taxable_ht') as string || '0')
  const tva_collectee_brute = parseFloat(formData.get('tva_collectee_brute') as string || '0')
  const achats_medicaments_exonere = parseFloat(formData.get('achats_medicaments_exonere') as string || '0')
  const achats_taxables_ht = parseFloat(formData.get('achats_taxables_ht') as string || '0')
  const tva_deductible_achats = parseFloat(formData.get('tva_deductible_achats') as string || '0')
  const tva_regularisable_pv_perimes = parseFloat(formData.get('tva_regularisable_pv_perimes') as string || '0')
  const total_tva_deductible = parseFloat(formData.get('total_tva_deductible') as string || '0')
  const credit_tva_periode_precedente = parseFloat(formData.get('credit_tva_periode_precedente') as string || '0')
  const tva_nette_due = parseFloat(formData.get('tva_nette_due') as string || '0')
  const credit_tva_a_reporter = parseFloat(formData.get('credit_tva_a_reporter') as string || '0')
  const reference_teledeclaration = (formData.get('reference_teledeclaration') as string)?.trim() || null

  const date_declaration = new Date().toISOString().split('T')[0]

  const { error } = await supabase
    .from('declarations_tva_pharma')
    .upsert({
      gie_id: tenant.gieId,
      periode_mois,
      periode_annee,
      statut: 'declaree',
      ca_medicaments_exonere,
      ca_taxable_ht,
      tva_collectee_brute,
      achats_medicaments_exonere,
      achats_taxables_ht,
      tva_deductible_achats,
      tva_regularisable_pv_perimes,
      total_tva_deductible,
      credit_tva_periode_precedente,
      tva_nette_due,
      credit_tva_a_reporter,
      date_declaration,
      reference_teledeclaration,
    }, { onConflict: 'gie_id,periode_mois,periode_annee' })

  if (error) return { error: error.message }

  // Génération de l'écriture comptable de liquidation de TVA (Journal OD)
  if (tva_collectee_brute > 0 || total_tva_deductible > 0) {
    const libellePiece = `Liquidation TVA ${String(periode_mois).padStart(2, '0')}/${periode_annee}`
    const { data: ecriture } = await supabase
      .from('ecritures_comptables')
      .insert({
        gie_id: tenant.gieId,
        journal: 'od',
        date_ecriture: date_declaration,
        numero_piece: `TVA-${periode_annee}-${String(periode_mois).padStart(2, '0')}`,
        libelle: libellePiece,
        validee: true,
        created_by: tenant.userId,
      })
      .select('id')
      .single()

    if (ecriture) {
      const lignes = []

      // Solde de la TVA collectée : Débit 4431
      if (tva_collectee_brute > 0) {
        lignes.push({
          ecriture_id: ecriture.id,
          gie_id: tenant.gieId,
          compte: '4431',
          libelle: `Solde TVA collectée ${String(periode_mois).padStart(2, '0')}/${periode_annee}`,
          debit: tva_collectee_brute,
          credit: 0,
        })
      }

      // Solde de la TVA déductible : Crédit 4452
      if (total_tva_deductible > 0) {
        lignes.push({
          ecriture_id: ecriture.id,
          gie_id: tenant.gieId,
          compte: '4452',
          libelle: `Solde TVA déductible sur achats & PV ${String(periode_mois).padStart(2, '0')}/${periode_annee}`,
          debit: 0,
          credit: total_tva_deductible,
        })
      }

      // TVA nette due : Crédit 4441 (Dette fiscale)
      if (tva_nette_due > 0) {
        lignes.push({
          ecriture_id: ecriture.id,
          gie_id: tenant.gieId,
          compte: '4441',
          libelle: `TVA nette due au Trésor Public (${String(periode_mois).padStart(2, '0')}/${periode_annee})`,
          debit: 0,
          credit: tva_nette_due,
        })
      }

      // Crédit TVA : Débit 4456 (Créance fiscale à reporter)
      if (credit_tva_a_reporter > 0) {
        lignes.push({
          ecriture_id: ecriture.id,
          gie_id: tenant.gieId,
          compte: '4456',
          libelle: `Crédit de TVA à reporter (${String(periode_mois).padStart(2, '0')}/${periode_annee})`,
          debit: credit_tva_a_reporter,
          credit: 0,
        })
      }

      if (lignes.length > 1) {
        await supabase.from('lignes_ecritures_comptables').insert(lignes)
      }
    }
  }

  revalidatePath('/comptabilite/tva')
  revalidatePath('/comptabilite')
  revalidatePath('/comptabilite/balance')
  return { success: true }
}

export async function getHistoriqueDeclarationsTVA() {
  const tenant = await getTenantContext()
  if (!tenant) return { historique: [], error: 'Non authentifié' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('declarations_tva_pharma')
    .select('*')
    .eq('gie_id', tenant.gieId)
    .order('periode_annee', { ascending: false })
    .order('periode_mois', { ascending: false })

  return { historique: data || [], error: error?.message }
}
