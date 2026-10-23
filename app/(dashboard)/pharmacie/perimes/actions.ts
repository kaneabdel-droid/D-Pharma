'use server'

import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import { revalidatePath } from 'next/cache'

export async function getPVDestructions() {
  const tenant = await getTenantContext()
  if (!tenant) return { destructions: [], error: 'Non authentifié' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('produits_perimes_destructions')
    .select(`
      *,
      lignes_destruction_perimes (*)
    `)
    .eq('gie_id', tenant.gieId)
    .order('date_destruction', { ascending: false })
    .order('created_at', { ascending: false })

  return { destructions: data || [], error: error?.message }
}

export async function getLotsPerimesDisponibles() {
  const tenant = await getTenantContext()
  if (!tenant) return { lots: [], error: 'Non authentifié' }

  const supabase = await createClient()

  // Récupérer les stocks expirés ou dont la date de péremption est dans les 30 jours
  const aujourdhui = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('stocks_pharmacie')
    .select(`
      id,
      lot,
      quantite,
      date_peremption,
      prix_vente,
      prix_achat,
      medicaments (
        id,
        nom,
        code_barres,
        principe_actif,
        categorie_tva,
        taux_tva,
        prix_achat
      )
    `)
    .eq('gie_id', tenant.gieId)
    .gt('quantite', 0)
    .lte('date_peremption', aujourdhui)
    .order('date_peremption', { ascending: true })

  return { lots: data || [], error: error?.message }
}

export async function creerPVDestruction(formData: FormData) {
  const tenant = await getTenantContext()
  if (!tenant) return { error: 'Non authentifié' }

  const supabase = await createClient()

  const date_destruction = (formData.get('date_destruction') as string) || new Date().toISOString().split('T')[0]
  const motif = (formData.get('motif') as string) || 'peremption'
  const autorite_type = (formData.get('autorite_type') as string) || 'service_hygiene'
  const nom_officier_autorite = (formData.get('nom_officier_autorite') as string)?.trim() || null
  const numero_visa_acte = (formData.get('numero_visa_acte') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null
  const lignesRaw = formData.get('lignes') as string

  if (!lignesRaw) {
    return { error: 'Veuillez sélectionner au moins un produit à détruire.' }
  }

  let lignes: Array<{
    stock_id?: string
    medicament_id?: string
    designation: string
    lot?: string
    date_peremption?: string
    quantite: number
    type_produit: 'medicament' | 'cosmetique' | 'parapharmacie' | 'materiel'
    prix_achat_ht: number
  }> = []

  try {
    lignes = JSON.parse(lignesRaw)
  } catch {
    return { error: 'Format des lignes de destruction invalide.' }
  }

  if (lignes.length === 0) {
    return { error: 'Aucun produit sélectionné pour la destruction.' }
  }

  // Générer le numéro de PV : PV-DEST-YYYY-XXXX
  const annee = new Date(date_destruction).getFullYear()
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  const numero_pv = `PV-DEST-${annee}-${randomSuffix}`

  // Calcul des montants
  let totalHT = 0
  let totalTVA = 0
  let totalTTC = 0

  const lignesTraitees = lignes.map((l) => {
    const qte = Number(l.quantite) || 0
    const paHT = Number(l.prix_achat_ht) || 0
    const montantHT = qte * paHT
    const isTaxable = l.type_produit === 'cosmetique' || l.type_produit === 'parapharmacie' || l.type_produit === 'materiel'
    const tauxTva = isTaxable ? 18 : 0
    const montantTva = isTaxable ? Math.round(montantHT * 0.18) : 0
    const montantTTC = montantHT + montantTva

    totalHT += montantHT
    totalTVA += montantTva
    totalTTC += montantTTC

    return {
      gie_id: tenant.gieId,
      medicament_id: l.medicament_id || null,
      stock_id: l.stock_id || null,
      designation: l.designation,
      lot: l.lot || null,
      date_peremption: l.date_peremption || null,
      quantite: qte,
      type_produit: l.type_produit,
      taux_tva: tauxTva,
      prix_achat_ht: paHT,
      montant_ht: montantHT,
      montant_tva: montantTva,
      montant_ttc: montantTTC,
    }
  })

  // 1. Insérer le PV de destruction
  const { data: pv, error: pvError } = await supabase
    .from('produits_perimes_destructions')
    .insert({
      gie_id: tenant.gieId,
      numero_pv,
      date_destruction,
      motif,
      autorite_type,
      nom_officier_autorite,
      numero_visa_acte,
      statut: 'valide',
      valeur_achat_ht_totale: totalHT,
      tva_recuperable_totale: totalTVA,
      valeur_ttc_totale: totalTTC,
      notes,
      created_by: tenant.userId,
    })
    .select('id')
    .single()

  if (pvError || !pv) {
    return { error: pvError?.message || 'Erreur lors de la création du PV de destruction.' }
  }

  // 2. Insérer les lignes
  const lignesAInserer = lignesTraitees.map((l) => ({
    ...l,
    destruction_id: pv.id,
  }))

  const { error: lignesError } = await supabase
    .from('lignes_destruction_perimes')
    .insert(lignesAInserer)

  if (lignesError) {
    return { error: lignesError.message }
  }

  // 3. Décrémenter les stocks réels dans stocks_pharmacie
  for (const l of lignes) {
    if (l.stock_id && l.quantite > 0) {
      const { data: stockExistant } = await supabase
        .from('stocks_pharmacie')
        .select('quantite')
        .eq('id', l.stock_id)
        .eq('gie_id', tenant.gieId)
        .maybeSingle()

      if (stockExistant) {
        const nouvelleQte = Math.max(0, Number(stockExistant.quantite) - Number(l.quantite))
        await supabase
          .from('stocks_pharmacie')
          .update({ quantite: nouvelleQte })
          .eq('id', l.stock_id)
      }
    }
  }

  // 4. Génération de l'écriture comptable officielle (Journal OD)
  // Débit 6581 (Pertes sur périmés) = totalHT
  // Débit 4452 (TVA déductible régularisée cosmétiques) = totalTVA (si visa huissier/hygiène)
  // Crédit 311 / 312 (Stocks sortis) = totalHT + totalTVA
  const { data: ecriture } = await supabase
    .from('ecritures_comptables')
    .insert({
      gie_id: tenant.gieId,
      journal: 'od',
      date_ecriture: date_destruction,
      numero_piece: numero_pv,
      libelle: `Sortie destruction périmés selon ${numero_pv} (${autorite_type.replace(/_/g, ' ')})`,
      validee: true,
      created_by: tenant.userId,
    })
    .select('id')
    .single()

  if (ecriture) {
    const lignesCompta = []

    // 1. Débit 6581 : Perte de valeur marchande
    lignesCompta.push({
      ecriture_id: ecriture.id,
      gie_id: tenant.gieId,
      compte: '6581',
      libelle: `Pertes sur produits périmés (${numero_pv})`,
      debit: totalHT,
      credit: 0,
    })

    // 2. Débit 4452 : Régularisation TVA déductible si visa officiel et TVA présente
    if (totalTVA > 0 && autorite_type !== 'interne_officine') {
      lignesCompta.push({
        ecriture_id: ecriture.id,
        gie_id: tenant.gieId,
        compte: '4452',
        libelle: `TVA déductible admise sur destruction visée (${numero_visa_acte || autorite_type})`,
        debit: totalTVA,
        credit: 0,
      })
    }

    // 3. Crédit 311 / 312 : Sortie de stock
    const montantCreditStock = totalHT + (totalTVA > 0 && autorite_type !== 'interne_officine' ? totalTVA : 0)
    lignesCompta.push({
      ecriture_id: ecriture.id,
      gie_id: tenant.gieId,
      compte: '311',
      libelle: `Sortie de stock produits détruits (${numero_pv})`,
      debit: 0,
      credit: montantCreditStock,
    })

    await supabase.from('lignes_ecritures_comptables').insert(lignesCompta)

    // Lier l'écriture comptable au PV
    await supabase
      .from('produits_perimes_destructions')
      .update({ ecriture_comptable_id: ecriture.id })
      .eq('id', pv.id)
  }

  revalidatePath('/pharmacie/perimes')
  revalidatePath('/pharmacie/stocks')
  revalidatePath('/comptabilite')
  revalidatePath('/comptabilite/balance')
  revalidatePath('/comptabilite/resultat')

  return { success: true, id: pv.id }
}

export async function getPVDetails(id: string) {
  const tenant = await getTenantContext()
  if (!tenant) return { pv: null, error: 'Non authentifié' }

  const supabase = await createClient()

  const { data: pv, error } = await supabase
    .from('produits_perimes_destructions')
    .select(`
      *,
      lignes_destruction_perimes (*)
    `)
    .eq('id', id)
    .eq('gie_id', tenant.gieId)
    .maybeSingle()

  return { pv, error: error?.message }
}
