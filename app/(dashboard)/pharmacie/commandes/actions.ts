'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getTenantContext } from '@/utils/supabase/tenant'

export async function createCommande(formData: FormData) {
  const supabase = await createClient()
  const tenant = await getTenantContext()

  if (!tenant) return { error: 'Officine non trouvée.' }

  const fournisseur_id = formData.get('fournisseur_id') as string
  const lignesRaw = formData.get('lignes') as string

  let lignes: { medicament_id: string; quantite: number }[] = []

  if (lignesRaw) {
    try {
      lignes = JSON.parse(lignesRaw)
    } catch {
      lignes = []
    }
  }

  // Rétrocompatibilité avec les formulaires mono-ligne
  if (lignes.length === 0) {
    const medicament_id = formData.get('medicament_id') as string
    const quantite_commandee = parseFloat(formData.get('quantite') as string)
    if (medicament_id && quantite_commandee > 0) {
      lignes.push({ medicament_id, quantite: quantite_commandee })
    }
  }

  if (!fournisseur_id || lignes.length === 0) {
    return { error: 'Veuillez remplir tous les champs obligatoires et ajouter au moins un produit.' }
  }

  try {
    // 1. Créer la commande
    const { data: commande, error: cmdError } = await supabase
      .from('commandes_labo')
      .insert({
        gie_id: tenant.gieId,
        fournisseur_id,
        statut: 'envoyee',
      })
      .select('id')
      .single()

    if (cmdError) throw cmdError

    // 2. Ajouter toutes les lignes de commande
    const rowsToInsert = lignes.map(ligne => ({
      commande_id: commande.id,
      medicament_id: ligne.medicament_id,
      quantite_commandee: Number(ligne.quantite),
    }))

    const { error: ligneError } = await supabase
      .from('lignes_commande_labo')
      .insert(rowsToInsert)

    if (ligneError) throw ligneError

    revalidatePath('/pharmacie/commandes')
    return { success: true }
  } catch (err: any) {
    console.error('Erreur création commande:', err)
    return { error: err.message || 'Erreur lors de la création de la commande' }
  }
}

export async function accuserReception(commandeId: string) {
  const supabase = await createClient()
  const tenant = await getTenantContext()

  if (!tenant) return { error: 'Officine non trouvée.' }

  try {
    // 1. Marquer la commande comme complète
    const { error: updateError } = await supabase
      .from('commandes_labo')
      .update({ statut: 'complete', date_reception: new Date().toISOString() })
      .eq('id', commandeId)
      .eq('gie_id', tenant.gieId)

    if (updateError) throw updateError

    // 2. Récupérer les lignes commandées pour approvisionner le stock
    const { data: lignes } = await supabase
      .from('lignes_commande_labo')
      .select('medicament_id, quantite_commandee')
      .eq('commande_id', commandeId)

    if (lignes && lignes.length > 0) {
      for (const ligne of lignes) {
        // Vérifier si un stock existe déjà pour ce médicament dans l'officine
        const { data: existingStock } = await supabase
          .from('stocks_pharmacie')
          .select('id, quantite')
          .eq('gie_id', tenant.gieId)
          .eq('medicament_id', ligne.medicament_id)
          .maybeSingle()

        if (existingStock) {
          await supabase
            .from('stocks_pharmacie')
            .update({ quantite: Number(existingStock.quantite || 0) + Number(ligne.quantite_commandee || 0) })
            .eq('id', existingStock.id)
        } else {
          // Date de péremption par défaut (+2 ans pour stock neuf reçu)
          const peremption = new Date()
          peremption.setFullYear(peremption.getFullYear() + 2)

          await supabase
            .from('stocks_pharmacie')
            .insert({
              gie_id: tenant.gieId,
              medicament_id: ligne.medicament_id,
              quantite: Number(ligne.quantite_commandee || 0),
              prix_vente: 0,
              date_peremption: peremption.toISOString().split('T')[0],
              lot: `REC-${Date.now().toString().slice(-6)}`,
            })
        }
      }
    }

    revalidatePath('/pharmacie/commandes')
    revalidatePath('/pharmacie/stocks')
    revalidatePath('/pharmacie/pos')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Erreur lors de l\'accusé de réception' }
  }
}
