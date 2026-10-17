'use server'

import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import { revalidatePath } from 'next/cache'

export async function ajouterFournisseur(formData: FormData) {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  if (!tenant) return { error: 'Non authentifié' }

  const nom = (formData.get('nom') as string)?.trim()
  const code_fournisseur = ((formData.get('code_fournisseur') as string) || '').trim()
  const contact_telephone = ((formData.get('contact_telephone') as string) || '').trim()
  const contact_email = ((formData.get('contact_email') as string) || '').trim()
  const adresse = ((formData.get('adresse') as string) || '').trim()
  const rccm_ninea = ((formData.get('rccm_ninea') as string) || '').trim()

  if (!nom) return { error: 'Le nom du grossiste ou laboratoire est obligatoire.' }

  try {
    const { error } = await supabase.from('fournisseurs_labo').insert({
      gie_id: tenant.gieId,
      nom,
      code_fournisseur: code_fournisseur || null,
      contact_telephone: contact_telephone || null,
      contact_email: contact_email || null,
      adresse: adresse || null,
      rccm_ninea: rccm_ninea || null,
      solde_dette: 0
    })

    if (error) throw error

    revalidatePath('/pharmacie/fournisseurs')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Erreur lors de la création du fournisseur' }
  }
}

export async function enregistrerMouvementDette(formData: FormData) {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  if (!tenant) return { error: 'Non authentifié' }

  const fournisseurId = formData.get('fournisseur_id') as string
  const typeMouvement = (formData.get('type_mouvement') as string) || 'reglement_effectue'
  const dateMouvement = (formData.get('date_mouvement') as string) || new Date().toISOString().split('T')[0]
  const numeroPiece = ((formData.get('numero_piece') as string) || '').trim()
  const montant = parseFloat(formData.get('montant') as string || '0')
  const libelle = ((formData.get('libelle') as string) || '').trim()

  if (!fournisseurId || !libelle || isNaN(montant) || montant <= 0) {
    return { error: 'Veuillez saisir un libellé et un montant valide supérieur à zéro.' }
  }

  try {
    // 1. Lire le solde actuel de la dette
    const { data: fournisseur, error: fErr } = await supabase
      .from('fournisseurs_labo')
      .select('solde_dette, nom')
      .eq('id', fournisseurId)
      .eq('gie_id', tenant.gieId)
      .single()

    if (fErr || !fournisseur) return { error: 'Fournisseur introuvable' }

    const soldeActuel = Number(fournisseur.solde_dette || 0)
    let debit = 0
    let credit = 0
    let nouveauSolde = soldeActuel

    if (typeMouvement === 'facture_achat' || typeMouvement === 'livraison') {
      // Augmente la dette envers le grossiste
      credit = montant
      nouveauSolde = soldeActuel + montant
    } else {
      // reglement_effectue ou avoir : diminue la dette
      debit = montant
      nouveauSolde = Math.max(0, soldeActuel - montant)
    }

    // 2. Insérer le mouvement
    const { error: mouvErr } = await supabase.from('mouvements_dettes_fournisseurs').insert({
      gie_id: tenant.gieId,
      fournisseur_id: fournisseurId,
      date_mouvement: dateMouvement,
      type_mouvement: typeMouvement,
      numero_piece: numeroPiece || null,
      debit,
      credit,
      solde_resultant: nouveauSolde,
      libelle
    })

    if (mouvErr) throw mouvErr

    // 3. Mettre à jour le solde du fournisseur
    await supabase
      .from('fournisseurs_labo')
      .update({ solde_dette: nouveauSolde })
      .eq('id', fournisseurId)

    revalidatePath('/pharmacie/fournisseurs')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Erreur lors de l’enregistrement du règlement' }
  }
}

export async function getReleveFournisseur(fournisseurId: string) {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  if (!tenant) return { mouvements: [], fournisseur: null, error: 'Non authentifié' }

  try {
    const [{ data: fournisseur }, { data: mouvements }] = await Promise.all([
      supabase.from('fournisseurs_labo').select('*').eq('id', fournisseurId).eq('gie_id', tenant.gieId).single(),
      supabase
        .from('mouvements_dettes_fournisseurs')
        .select('*')
        .eq('fournisseur_id', fournisseurId)
        .eq('gie_id', tenant.gieId)
        .order('date_mouvement', { ascending: true })
        .order('created_at', { ascending: true })
    ])

    return { fournisseur, mouvements: mouvements || [] }
  } catch (err: any) {
    return { mouvements: [], fournisseur: null, error: err.message }
  }
}
