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

export async function accuserReception(input: string | FormData) {
  const supabase = await createClient()
  const tenant = await getTenantContext()

  if (!tenant) return { error: 'Officine non trouvée.' }

  const { data: { user } } = await supabase.auth.getUser()

  let commandeId = ''
  let constaterAchat = true
  let customLignes: Array<{
    ligne_id?: string
    medicament_id: string
    quantite_recue: number
    prix_achat?: number
    prix_vente?: number
    lot?: string
    date_peremption?: string
  }> = []

  if (typeof input === 'string') {
    commandeId = input
  } else {
    commandeId = input.get('commande_id') as string
    constaterAchat = input.get('constater_achat') === 'true' || input.get('constater_achat') === 'on'
    const lignesRaw = input.get('lignes') as string
    if (lignesRaw) {
      try {
        customLignes = JSON.parse(lignesRaw)
      } catch {
        customLignes = []
      }
    }
  }

  if (!commandeId) return { error: 'Identifiant de commande manquant.' }

  try {
    // 1. Récupérer les informations de la commande et du fournisseur
    const { data: commande, error: cmdErr } = await supabase
      .from('commandes_labo')
      .select(`
        id,
        fournisseur_id,
        fournisseurs_labo (id, nom, solde_dette)
      `)
      .eq('id', commandeId)
      .eq('gie_id', tenant.gieId)
      .single()

    if (cmdErr || !commande) throw new Error('Commande introuvable.')

    // 2. Marquer la commande comme complète
    const { error: updateError } = await supabase
      .from('commandes_labo')
      .update({ statut: 'complete', date_reception: new Date().toISOString() })
      .eq('id', commandeId)
      .eq('gie_id', tenant.gieId)

    if (updateError) throw updateError

    // 3. Mettre à jour le stock et les lignes de commande
    if (customLignes.length > 0) {
      for (const ligne of customLignes) {
        const qteRecue = Number(ligne.quantite_recue || 0)
        const prixAchat = Number(ligne.prix_achat || 0)
        const prixVente = Number(ligne.prix_vente || 0)

        // Mettre à jour la ligne de commande correspondante si l'ID est fourni
        if (ligne.ligne_id) {
          await supabase
            .from('lignes_commande_labo')
            .update({
              quantite_recue: qteRecue,
              prix_achat_unitaire: prixAchat
            })
            .eq('id', ligne.ligne_id)
        }

        // Vérifier si un stock existe déjà pour ce médicament
        const { data: existingStock } = await supabase
          .from('stocks_pharmacie')
          .select('id, quantite, prix_vente, prix_achat')
          .eq('gie_id', tenant.gieId)
          .eq('medicament_id', ligne.medicament_id)
          .maybeSingle()

        if (existingStock) {
          const updatePayload: any = {
            quantite: Number(existingStock.quantite || 0) + qteRecue,
            updated_at: new Date().toISOString()
          }
          if (prixVente > 0) updatePayload.prix_vente = prixVente
          if (prixAchat > 0) updatePayload.prix_achat = prixAchat
          if (ligne.lot) updatePayload.lot = ligne.lot
          if (ligne.date_peremption) updatePayload.date_peremption = ligne.date_peremption

          await supabase
            .from('stocks_pharmacie')
            .update(updatePayload)
            .eq('id', existingStock.id)
        } else {
          await supabase
            .from('stocks_pharmacie')
            .insert({
              gie_id: tenant.gieId,
              medicament_id: ligne.medicament_id,
              quantite: qteRecue,
              prix_vente: prixVente,
              prix_achat: prixAchat,
              date_peremption: ligne.date_peremption || '2099-12-31',
              lot: ligne.lot || `REC-${Date.now().toString().slice(-6)}`,
            })
        }
      }
    } else {
      // Fallback si aucune ligne custom n'a été transmise
      const { data: lignes } = await supabase
        .from('lignes_commande_labo')
        .select('medicament_id, quantite_commandee')
        .eq('commande_id', commandeId)

      if (lignes && lignes.length > 0) {
        for (const ligne of lignes) {
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
    }

    // 4. Constatation de l'achat en comptabilité et dette fournisseur
    const totalAchat = customLignes.reduce((sum, l) => sum + (Number(l.quantite_recue || 0) * Number(l.prix_achat || 0)), 0)

    if (constaterAchat && totalAchat > 0 && commande.fournisseur_id) {
      const fournisseur: any = commande.fournisseurs_labo
      const soldeActuel = Number(fournisseur?.solde_dette || 0)
      const nouveauSolde = soldeActuel + totalAchat
      const today = new Date().toISOString().split('T')[0]
      const pieceRef = `CMD-${commande.id.slice(0, 8).toUpperCase()}`

      // A. Mettre à jour la dette du fournisseur
      await supabase
        .from('fournisseurs_labo')
        .update({ solde_dette: nouveauSolde })
        .eq('id', commande.fournisseur_id)

      // B. Créer le mouvement de dette fournisseur
      await supabase
        .from('mouvements_dettes_fournisseurs')
        .insert({
          gie_id: tenant.gieId,
          fournisseur_id: commande.fournisseur_id,
          date_mouvement: today,
          type_mouvement: 'livraison',
          numero_piece: pieceRef,
          debit: 0,
          credit: totalAchat,
          solde_resultant: nouveauSolde,
          libelle: `Livraison commande #${commande.id.slice(0, 8)} (${fournisseur?.nom || 'Grossiste'})`
        })

      // C. Constater l'écriture dans le Journal des Achats
      const { data: ecriture } = await supabase
        .from('ecritures_comptables')
        .insert({
          gie_id: tenant.gieId,
          journal: 'achats',
          date_ecriture: today,
          numero_piece: pieceRef,
          libelle: `Facture achat / Livraison ${fournisseur?.nom || 'Grossiste'} (${pieceRef})`,
          validee: true,
          created_by: user?.id || null
        })
        .select('id')
        .single()

      if (ecriture) {
        await supabase
          .from('lignes_ecritures_comptables')
          .insert([
            {
              ecriture_id: ecriture.id,
              gie_id: tenant.gieId,
              compte: '601',
              libelle: `Achats de médicaments (${fournisseur?.nom || 'Grossiste'})`,
              debit: totalAchat,
              credit: 0
            },
            {
              ecriture_id: ecriture.id,
              gie_id: tenant.gieId,
              compte: '401',
              libelle: `Fournisseur ${fournisseur?.nom || 'Grossiste'}`,
              debit: 0,
              credit: totalAchat
            }
          ])
      }
    }

    revalidatePath('/pharmacie/commandes')
    revalidatePath('/pharmacie/stocks')
    revalidatePath('/pharmacie/pos')
    revalidatePath('/pharmacie/fournisseurs')
    revalidatePath('/comptabilite')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error('Erreur accuserReception:', err)
    return { error: err.message || 'Erreur lors de l\'accusé de réception' }
  }
}
