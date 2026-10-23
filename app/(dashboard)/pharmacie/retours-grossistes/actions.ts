'use server'

import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import { revalidatePath } from 'next/cache'

export async function getRetoursGrossistes() {
  const tenant = await getTenantContext()
  if (!tenant) return { retours: [], error: 'Non authentifié' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('retours_grossistes')
    .select(`
      *,
      fournisseurs_labo (id, nom, contact_telephone, contact_email),
      lignes_retour_grossiste (*)
    `)
    .eq('gie_id', tenant.gieId)
    .order('date_retour', { ascending: false })
    .order('created_at', { ascending: false })

  return { retours: data || [], error: error?.message }
}

export async function getFournisseursGrossistes() {
  const tenant = await getTenantContext()
  if (!tenant) return { fournisseurs: [], error: 'Non authentifié' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('fournisseurs_labo')
    .select('id, nom, contact_telephone, contact_email')
    .eq('gie_id', tenant.gieId)
    .order('nom')

  return { fournisseurs: data || [], error: error?.message }
}

export async function creerBonRetourGrossiste(formData: FormData) {
  const tenant = await getTenantContext()
  if (!tenant) return { error: 'Non authentifié' }

  const supabase = await createClient()

  const fournisseur_id = formData.get('fournisseur_id') as string
  const date_retour = (formData.get('date_retour') as string) || new Date().toISOString().split('T')[0]
  const motif = (formData.get('motif') as string) || 'perime_reprise'
  const taux_reprise_applique = parseFloat((formData.get('taux_reprise_applique') as string) || '100')
  const notes = (formData.get('notes') as string)?.trim() || null
  const lignesRaw = formData.get('lignes') as string

  if (!fournisseur_id) {
    return { error: 'Veuillez sélectionner le grossiste-répartiteur destinataire.' }
  }

  if (!lignesRaw) {
    return { error: 'Veuillez ajouter au moins un produit à retourner.' }
  }

  let lignes: Array<{
    medicament_id?: string
    designation: string
    lot?: string
    date_peremption?: string
    quantite: number
    prix_achat_ht: number
  }> = []

  try {
    lignes = JSON.parse(lignesRaw)
  } catch {
    return { error: 'Format des articles de retour invalide.' }
  }

  if (lignes.length === 0) {
    return { error: 'Aucun article ajouté au retour.' }
  }

  const annee = new Date(date_retour).getFullYear()
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  const numero_bon_retour = `RET-${annee}-${randomSuffix}`

  let totalHT = 0
  const lignesAInserer = lignes.map((l) => {
    const qte = Number(l.quantite) || 0
    const paHT = Number(l.prix_achat_ht) || 0
    const mHT = qte * paHT
    totalHT += mHT

    return {
      gie_id: tenant.gieId,
      medicament_id: l.medicament_id || null,
      designation: l.designation,
      lot: l.lot || null,
      date_peremption: l.date_peremption || null,
      quantite: qte,
      prix_achat_ht: paHT,
      montant_ht: mHT,
    }
  })

  // 1. Insérer le bon de retour
  const { data: retour, error: retourErr } = await supabase
    .from('retours_grossistes')
    .insert({
      gie_id: tenant.gieId,
      fournisseur_id,
      numero_bon_retour,
      date_retour,
      statut: 'en_attente',
      motif,
      valeur_estimee_ht: totalHT,
      taux_reprise_applique,
      notes,
      created_by: tenant.userId,
    })
    .select('id')
    .single()

  if (retourErr || !retour) {
    return { error: retourErr?.message || 'Erreur lors de la création du bon de retour.' }
  }

  // 2. Insérer les lignes
  const lignesFinales = lignesAInserer.map((l) => ({
    ...l,
    retour_id: retour.id,
  }))

  const { error: lignesErr } = await supabase
    .from('lignes_retour_grossiste')
    .insert(lignesFinales)

  if (lignesErr) {
    return { error: lignesErr.message }
  }

  revalidatePath('/pharmacie/retours-grossistes')
  return { success: true, id: retour.id }
}

export async function enregistrerAvoirGrossiste(formData: FormData) {
  const tenant = await getTenantContext()
  if (!tenant) return { error: 'Non authentifié' }

  const supabase = await createClient()

  const retour_id = formData.get('retour_id') as string
  const numero_avoir_grossiste = (formData.get('numero_avoir_grossiste') as string)?.trim()
  const date_avoir = (formData.get('date_avoir') as string) || new Date().toISOString().split('T')[0]
  const montant_avoir_ht = parseFloat((formData.get('montant_avoir_ht') as string) || '0')
  const montant_avoir_tva = parseFloat((formData.get('montant_avoir_tva') as string) || '0')
  const montant_avoir_ttc = montant_avoir_ht + montant_avoir_tva

  if (!retour_id || !numero_avoir_grossiste || montant_avoir_ht <= 0) {
    return { error: 'Le N° d’avoir et un montant positif sont requis.' }
  }

  // 1. Récupérer les détails du retour
  const { data: retour, error: retourErr } = await supabase
    .from('retours_grossistes')
    .select(`
      *,
      fournisseurs_labo (nom)
    `)
    .eq('id', retour_id)
    .eq('gie_id', tenant.gieId)
    .single()

  if (retourErr || !retour) {
    return { error: 'Bon de retour introuvable.' }
  }

  // 2. Générer l'écriture comptable automatique
  // Débit 401 (Fournisseurs - diminution dette de la pharmacie) = montant_avoir_ttc
  // Crédit 6091 (Ristournes & avoirs obtenus sur achats grossistes) = montant_avoir_ht
  // Crédit 4452 (TVA déductible régularisée si applicable) = montant_avoir_tva
  const nomFournisseur = retour.fournisseurs_labo?.nom || 'Grossiste'

  const { data: ecriture, error: ecritureErr } = await supabase
    .from('ecritures_comptables')
    .insert({
      gie_id: tenant.gieId,
      journal: 'achats',
      date_ecriture: date_avoir,
      numero_piece: numero_avoir_grossiste,
      libelle: `Avoir grossiste ${nomFournisseur} sur retour ${retour.numero_bon_retour}`,
      validee: true,
      created_by: tenant.userId,
    })
    .select('id')
    .single()

  if (ecriture) {
    const lignesCompta = [
      {
        ecriture_id: ecriture.id,
        gie_id: tenant.gieId,
        compte: '401',
        libelle: `Avoir fournisseur ${nomFournisseur} (${numero_avoir_grossiste})`,
        debit: montant_avoir_ttc,
        credit: 0,
      },
      {
        ecriture_id: ecriture.id,
        gie_id: tenant.gieId,
        compte: '6091',
        libelle: `Avoir obtenu sur retours marchandises (${retour.numero_bon_retour})`,
        debit: 0,
        credit: montant_avoir_ht,
      },
    ]

    if (montant_avoir_tva > 0) {
      lignesCompta.push({
        ecriture_id: ecriture.id,
        gie_id: tenant.gieId,
        compte: '4452',
        libelle: `Régularisation TVA sur avoir grossiste (${numero_avoir_grossiste})`,
        debit: 0,
        credit: montant_avoir_tva,
      })
    }

    await supabase.from('lignes_ecritures_comptables').insert(lignesCompta)
  }

  // 3. Mettre à jour le statut du retour
  const { error: updateErr } = await supabase
    .from('retours_grossistes')
    .update({
      statut: 'avoir_recu',
      numero_avoir_grossiste,
      date_avoir,
      montant_avoir_ht,
      montant_avoir_tva,
      montant_avoir_ttc,
      ecriture_comptable_id: ecriture?.id || null,
    })
    .eq('id', retour_id)

  if (updateErr) return { error: updateErr.message }

  revalidatePath('/pharmacie/retours-grossistes')
  revalidatePath('/pharmacie/fournisseurs')
  revalidatePath('/comptabilite')
  revalidatePath('/comptabilite/balance')
  return { success: true }
}

export async function changerStatutRetour(retourId: string, nouveauStatut: string) {
  const tenant = await getTenantContext()
  if (!tenant) return { error: 'Non authentifié' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('retours_grossistes')
    .update({ statut: nouveauStatut })
    .eq('id', retourId)
    .eq('gie_id', tenant.gieId)

  if (error) return { error: error.message }
  revalidatePath('/pharmacie/retours-grossistes')
  return { success: true }
}
