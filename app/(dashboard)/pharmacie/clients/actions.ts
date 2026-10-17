'use server'

import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import { revalidatePath } from 'next/cache'

export async function ajouterClient(formData: FormData) {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  if (!tenant) return { error: 'Non authentifié' }

  const nom = (formData.get('nom') as string)?.trim()
  const telephone = ((formData.get('telephone') as string) || '').trim()
  const email = ((formData.get('email') as string) || '').trim()
  const adresse = ((formData.get('adresse') as string) || '').trim()
  const type_client = (formData.get('type_client') as string) || 'particulier'
  const matricule_assure = ((formData.get('matricule_assure') as string) || '').trim()
  const taux_couverture = parseFloat(formData.get('taux_couverture') as string || '0')
  const plafond_credit = parseFloat(formData.get('plafond_credit') as string || '0')

  if (!nom) return { error: 'Le nom du client, de l’entreprise ou de la mutuelle est obligatoire.' }

  try {
    const { error } = await supabase.from('clients_externes').insert({
      gie_id: tenant.gieId,
      nom,
      telephone: telephone || null,
      email: email || null,
      adresse: adresse || null,
      type_client,
      matricule_assure: matricule_assure || null,
      taux_couverture: isNaN(taux_couverture) ? 0 : taux_couverture,
      plafond_credit: isNaN(plafond_credit) ? 0 : plafond_credit,
      solde_creance: 0
    })

    if (error) throw error

    revalidatePath('/pharmacie/clients')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Erreur lors de la création du client' }
  }
}

export async function enregistrerMouvementCreance(formData: FormData) {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  if (!tenant) return { error: 'Non authentifié' }

  const clientId = formData.get('client_id') as string
  const typeMouvement = (formData.get('type_mouvement') as string) || 'reglement'
  const dateMouvement = (formData.get('date_mouvement') as string) || new Date().toISOString().split('T')[0]
  const numeroPiece = ((formData.get('numero_piece') as string) || '').trim()
  const montant = parseFloat(formData.get('montant') as string || '0')
  const libelle = ((formData.get('libelle') as string) || '').trim()

  if (!clientId || !libelle || isNaN(montant) || montant <= 0) {
    return { error: 'Veuillez saisir un libellé et un montant valide supérieur à zéro.' }
  }

  try {
    // 1. Lire le solde actuel du client
    const { data: client, error: clientErr } = await supabase
      .from('clients_externes')
      .select('solde_creance, nom')
      .eq('id', clientId)
      .eq('gie_id', tenant.gieId)
      .single()

    if (clientErr || !client) return { error: 'Client introuvable' }

    const soldeActuel = Number(client.solde_creance || 0)
    let debit = 0
    let credit = 0
    let nouveauSolde = soldeActuel

    if (typeMouvement === 'facture_credit' || typeMouvement === 'prise_en_charge') {
      debit = montant
      nouveauSolde = soldeActuel + montant
    } else {
      // reglement ou avoir
      credit = montant
      nouveauSolde = Math.max(0, soldeActuel - montant)
    }

    // 2. Insérer le mouvement
    const { error: mouvErr } = await supabase.from('mouvements_creances_clients').insert({
      gie_id: tenant.gieId,
      client_id: clientId,
      date_mouvement: dateMouvement,
      type_mouvement: typeMouvement,
      numero_piece: numeroPiece || null,
      debit,
      credit,
      solde_resultant: nouveauSolde,
      libelle
    })

    if (mouvErr) throw mouvErr

    // 3. Mettre à jour le solde du client
    await supabase
      .from('clients_externes')
      .update({ solde_creance: nouveauSolde })
      .eq('id', clientId)

    revalidatePath('/pharmacie/clients')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Erreur lors de l’enregistrement du règlement' }
  }
}

export async function getReleveClient(clientId: string) {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  if (!tenant) return { mouvements: [], client: null, error: 'Non authentifié' }

  try {
    const [{ data: client }, { data: mouvements }] = await Promise.all([
      supabase.from('clients_externes').select('*').eq('id', clientId).eq('gie_id', tenant.gieId).single(),
      supabase
        .from('mouvements_creances_clients')
        .select('*')
        .eq('client_id', clientId)
        .eq('gie_id', tenant.gieId)
        .order('date_mouvement', { ascending: true })
        .order('created_at', { ascending: true })
    ])

    return { client, mouvements: mouvements || [] }
  } catch (err: any) {
    return { mouvements: [], client: null, error: err.message }
  }
}
