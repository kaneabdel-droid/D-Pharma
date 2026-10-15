'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getTenantContext } from '@/utils/supabase/tenant'

export async function submitVente(formData: FormData) {
  const tenant = await getTenantContext()

  if (!tenant) {
    return { error: 'Erreur : Contexte officine introuvable.' }
  }

  const cartStr = formData.get('cart') as string
  const moyen_paiement = formData.get('moyen_paiement') as string
  const montant_total_str = formData.get('montant_total') as string

  if (!cartStr || !montant_total_str) {
    return { error: 'Données invalides' }
  }

  const cart = JSON.parse(cartStr)
  const montant_total = parseFloat(montant_total_str)

  try {
    // Utiliser createAdminClient pour garantir l'insertion sécurisée sans blocage RLS sur lignes_vente_pharmacie
    let adminClient: any
    try {
      adminClient = createAdminClient()
    } catch {
      adminClient = await createClient()
    }

    // 1. Créer la vente
    const { data: venteData, error: venteError } = await adminClient
      .from('ventes_pharmacie')
      .insert({
        gie_id: tenant.gieId,
        montant_total,
        moyen_paiement,
      })
      .select()
      .single()

    if (venteError) throw venteError

    // 2. Créer les lignes de vente
    const lignesToInsert = cart.map((item: any) => ({
      vente_id: venteData.id,
      medicament_id: item.medicament_id,
      quantite: item.quantite,
      prix_unitaire: item.prix_unitaire,
    }))

    const { error: lignesError } = await adminClient
      .from('lignes_vente_pharmacie')
      .insert(lignesToInsert)

    if (lignesError) throw lignesError

    // 3. Mettre à jour les stocks (diminuer la quantité)
    for (const item of cart) {
      const { data: stockData } = await adminClient
        .from('stocks_pharmacie')
        .select('id, quantite')
        .eq('gie_id', tenant.gieId)
        .eq('medicament_id', item.medicament_id)
        .limit(1)
        .maybeSingle()

      if (stockData) {
        await adminClient
          .from('stocks_pharmacie')
          .update({ quantite: Math.max(0, Number(stockData.quantite) - Number(item.quantite)) })
          .eq('id', stockData.id)
      }
    }

    // 4. Enregistrer dans la table transactions (Caisse / Trésorerie) si un compte caisse existe
    try {
      const { data: caisseCompte } = await adminClient
        .from('comptes')
        .select('id')
        .eq('gie_id', tenant.gieId)
        .or('type_compte.ilike.%caisse%,type.ilike.%caisse%')
        .limit(1)
        .maybeSingle()

      await adminClient.from('transactions').insert({
        gie_id: tenant.gieId,
        compte_id: caisseCompte?.id || null,
        type_transaction: 'entree',
        montant: montant_total,
        motif: `Vente comptoir POS (${moyen_paiement})`,
        date_transaction: new Date().toISOString().split('T')[0],
      })
    } catch (tresoErr) {
      console.warn('Mise à jour trésorerie facultative ignorée:', tresoErr)
    }

    revalidatePath('/pharmacie/pos')
    revalidatePath('/pharmacie/stocks')
    revalidatePath('/dashboard')
    revalidatePath('/tresorerie')
    return { success: true }
  } catch (error: any) {
    console.error("Erreur lors de l'enregistrement de la vente:", error)
    return { error: error.message || 'Une erreur est survenue' }
  }
}
