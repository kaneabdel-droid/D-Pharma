'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'

export async function getComptes() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: comptes, error } = await supabase
    .from('comptes')
    .select('*')
    .order('nom')

  if (error) {
    console.error(error)
    return { error: error.message }
  }

  // Pour chaque compte, on calcule le solde actuel (solde initial + entrees - sorties)
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('compte_id, type_transaction, montant')

  if (txError) {
    console.warn('Note transactions:', txError.message)
  }

  const comptesAvecSolde = comptes.map((compte: any) => {
    let solde = Number(compte.solde || compte.solde_initial || 0)
    if (transactions) {
      const txs = transactions.filter(t => t.compte_id === compte.id)
      for (const t of txs) {
        if (t.type_transaction === 'entree') solde += Number(t.montant)
        else if (t.type_transaction === 'sortie') solde -= Number(t.montant)
      }
    }
    return { ...compte, type_compte: compte.type_compte || compte.type, solde_courant: solde }
  })

  return { comptes: comptesAvecSolde }
}

export async function addCompte(nom: string, type_compte: string, solde_initial: number) {
  const denied = await requirePermission('tresorerie', 'create')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()
    
  if (!userData) return { error: "Utilisateur introuvable" }

  const { error } = await supabase
    .from('comptes')
    .insert({
      gie_id: userData.gie_id,
      nom,
      type: type_compte,
      solde: solde_initial
    })

  if (error) return { error: error.message }

  revalidatePath('/tresorerie')
  return { success: true }
}

export async function addTransaction(data: { compte_id: string, type_transaction: string, montant: number, motif: string, type_piece?: string, imputation_id?: string }) {
  const denied = await requirePermission('tresorerie', 'create')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: "Utilisateur introuvable" }

  const payload: any = {
    gie_id: userData.gie_id,
    type_transaction: data.type_transaction,
    montant: data.montant,
    motif: data.motif,
    type_piece: data.type_piece || null,
    imputation_id: data.imputation_id || null,
  }
  if (data.compte_id) payload.compte_id = data.compte_id

  let { error } = await supabase.from('transactions').insert(payload)

  // En cas d'absence de la colonne compte_id sur la table, insérer sans faire échouer l'opération
  if (error && error.message?.includes('compte_id')) {
    delete payload.compte_id
    const retry = await supabase.from('transactions').insert(payload)
    error = retry.error
  }

  if (error) return { error: error.message }

  revalidatePath('/tresorerie')
  revalidatePath('/tresorerie/journaux')
  return { success: true }
}

export async function updateTransaction(id: string, data: { type_transaction: string, montant: number, motif: string, type_piece?: string, imputation_id?: string }) {
  const denied = await requirePermission('tresorerie', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { error } = await supabase
    .from('transactions')
    .update({
      type_transaction: data.type_transaction,
      montant: data.montant,
      motif: data.motif,
      type_piece: data.type_piece || null,
      imputation_id: data.imputation_id || null,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/tresorerie')
  revalidatePath('/tresorerie/journaux')
  return { success: true }
}

export async function deleteTransaction(id: string) {
  const denied = await requirePermission('tresorerie', 'delete')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/tresorerie')
  revalidatePath('/tresorerie/journaux')
  return { success: true }
}

export async function getJournal(compteId: string) {
  const supabase = await createClient()

  const { data: compte } = await supabase
    .from('comptes')
    .select('solde, nom')
    .eq('id', compteId)
    .single()

  if (!compte) return { error: "Compte introuvable" }

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('compte_id', compteId)
    .order('created_at', { ascending: true }) // Ordre chronologique strict

  if (error) {
    if (error.message?.includes('compte_id')) {
      return { 
        journal: [], 
        soldeInitial: Number((compte as any).solde || (compte as any).solde_initial || 0), 
        compteNom: compte.nom,
        warning: "La colonne compte_id est en cours de création dans la base." 
      }
    }
    return { error: error.message }
  }

  let soldeCourant = Number((compte as any).solde || (compte as any).solde_initial || 0)
  
  const journal = (transactions || []).map(tx => {
    let entree = null
    let sortie = null
    if (tx.type_transaction === 'entree') {
      entree = Number(tx.montant)
      soldeCourant += entree
    } else {
      sortie = Number(tx.montant)
      soldeCourant -= sortie
    }
    return {
      ...tx,
      entree,
      sortie,
      solde: soldeCourant
    }
  })

  return { 
    journal: journal.reverse(), 
    soldeInitial: (compte as any).solde || (compte as any).solde_initial || 0, 
    compteNom: compte.nom 
  }
}



