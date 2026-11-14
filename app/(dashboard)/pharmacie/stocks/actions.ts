'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getTenantContext } from '@/utils/supabase/tenant'

export async function addStock(formData: FormData) {
  const supabase = await createClient()
  const tenant = await getTenantContext()

  if (!tenant) return { error: 'Officine non trouvée.' }

  const nom = (formData.get('nom') as string)?.trim()
  const type_produit = (formData.get('type_produit') as string) || 'medicament'
  const code_barres = ((formData.get('code_barres') as string) || '').trim()
  const quantiteRaw = formData.get('quantite') as string
  const quantite = type_produit === 'service' ? 9999 : parseFloat(quantiteRaw || '0')
  const prix_vente = parseFloat(formData.get('prix_vente') as string || '0')
  const prix_achat = parseFloat(formData.get('prix_achat') as string || '0')
  const date_peremption = (formData.get('date_peremption') as string) || (type_produit === 'service' ? '2099-12-31' : '')
  const lot = ((formData.get('lot') as string) || '').trim()

  if (!nom || isNaN(prix_vente) || prix_vente <= 0) {
    return { error: 'Le nom et un prix de vente valide sont obligatoires.' }
  }

  if (type_produit !== 'service') {
    if (isNaN(quantite) || quantite < 0) {
      return { error: 'Veuillez saisir une quantité valide.' }
    }
    if (!date_peremption) {
      return { error: 'La date de péremption est requise pour les médicaments et produits périssables.' }
    }
  }

  try {
    // 1. Chercher si l'article existe déjà dans le catalogue global
    let medicament_id = null

    // Cherche d'abord par code barre si fourni
    if (code_barres) {
      const { data: existingMed } = await supabase
        .from('medicaments')
        .select('id, nom, code_barres')
        .eq('code_barres', code_barres)
        .maybeSingle()

      if (existingMed) {
        medicament_id = existingMed.id
        // Si le nom a été mis à jour, l'enregistrer
        if (nom && existingMed.nom !== nom) {
          await supabase.from('medicaments').update({ nom, type_produit }).eq('id', medicament_id)
        }
      }
    }

    // Sinon cherche par nom
    if (!medicament_id) {
      const { data: existingMedName } = await supabase
        .from('medicaments')
        .select('id, nom, code_barres')
        .ilike('nom', nom)
        .maybeSingle()

      if (existingMedName) {
        medicament_id = existingMedName.id

        // TRÈS IMPORTANT : Mettre à jour le code-barres s'il était manquant ou erroné !
        if (code_barres && existingMedName.code_barres !== code_barres) {
          // Résoudre un éventuel conflit avec un enregistrement orphelin ayant ce code-barres
          const { data: conflit } = await supabase
            .from('medicaments')
            .select('id')
            .eq('code_barres', code_barres)
            .neq('id', medicament_id)
            .maybeSingle()

          if (conflit) {
            const { data: stocksConflit } = await supabase
              .from('stocks_pharmacie')
              .select('id')
              .eq('medicament_id', conflit.id)
              .limit(1)

            if (!stocksConflit || stocksConflit.length === 0) {
              await supabase.from('medicaments').delete().eq('id', conflit.id)
            } else {
              await supabase.from('medicaments').update({ code_barres: null }).eq('id', conflit.id)
            }
          }

          await supabase.from('medicaments').update({ code_barres, type_produit }).eq('id', medicament_id)
        }
      }
    }

    // 2. S'il n'existe pas, on le crée dans le catalogue global
    if (!medicament_id) {
      if (code_barres) {
        const { data: orphelin } = await supabase
          .from('medicaments')
          .select('id')
          .eq('code_barres', code_barres)
          .maybeSingle()

        if (orphelin) {
          await supabase.from('medicaments').update({ nom, type_produit }).eq('id', orphelin.id)
          medicament_id = orphelin.id
        }
      }

      if (!medicament_id) {
        const { data: newMed, error: newMedError } = await supabase
          .from('medicaments')
          .insert({
            nom,
            code_barres: code_barres || null,
            type_produit
          })
          .select('id')
          .single()

        if (newMedError) throw newMedError
        medicament_id = newMed.id
      }
    } else {
      // Mettre à jour le type si besoin
      await supabase.from('medicaments').update({ type_produit }).eq('id', medicament_id)
    }

    // 3. Ajouter l'entrée en stock pour cette pharmacie
    const { error: stockError } = await supabase
      .from('stocks_pharmacie')
      .insert({
        gie_id: tenant.gieId,
        medicament_id,
        quantite,
        prix_vente,
        prix_achat: isNaN(prix_achat) ? 0 : prix_achat,
        date_peremption: date_peremption || '2099-12-31',
        lot: lot || null
      })

    if (stockError) throw stockError

    revalidatePath('/pharmacie/stocks')
    revalidatePath('/pharmacie/pos')
    return { success: true }
  } catch (err: any) {
    console.error('Erreur ajout article/médicament:', err)
    return { error: err.message || 'Erreur lors de l\'enregistrement' }
  }
}

export async function updateStockPrice(formData: FormData) {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  if (!tenant) return { error: 'Officine non trouvée.' }

  const stockId = formData.get('stock_id') as string
  const prixVenteStr = formData.get('prix_vente') as string
  const prixAchatStr = formData.get('prix_achat') as string
  const lot = ((formData.get('lot') as string) || '').trim()
  const datePeremption = (formData.get('date_peremption') as string) || ''

  const prix_vente = parseFloat(prixVenteStr)
  if (!stockId || isNaN(prix_vente) || prix_vente <= 0) {
    return { error: 'Un prix de vente valide supérieur à zéro est obligatoire.' }
  }

  const updatePayload: any = {
    prix_vente,
    updated_at: new Date().toISOString()
  }

  if (prixAchatStr !== null && prixAchatStr !== undefined && prixAchatStr !== '') {
    const prix_achat = parseFloat(prixAchatStr)
    if (!isNaN(prix_achat) && prix_achat >= 0) {
      updatePayload.prix_achat = prix_achat
    }
  }

  if (lot !== undefined) {
    updatePayload.lot = lot || null
  }

  if (datePeremption) {
    updatePayload.date_peremption = datePeremption
  }

  try {
    const { error } = await supabase
      .from('stocks_pharmacie')
      .update(updatePayload)
      .eq('id', stockId)
      .eq('gie_id', tenant.gieId)

    if (error) throw error

    revalidatePath('/pharmacie/stocks')
    revalidatePath('/pharmacie/pos')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error('Erreur mise à jour prix stock:', err)
    return { error: err.message || 'Erreur lors de la mise à jour du prix' }
  }
}

export async function updateArticleComplet(formData: FormData) {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  if (!tenant) return { error: 'Officine non trouvée.' }

  const stockId = formData.get('stock_id') as string
  let medicamentId = (formData.get('medicament_id') as string)?.trim()
  const nom = (formData.get('nom') as string)?.trim()
  const code_barres = ((formData.get('code_barres') as string) || '').trim()
  const type_produit = (formData.get('type_produit') as string) || 'medicament'
  const quantiteRaw = formData.get('quantite') as string
  const quantite = type_produit === 'service' ? 9999 : parseFloat(quantiteRaw || '0')
  const prix_vente = parseFloat(formData.get('prix_vente') as string || '0')
  const prix_achat = parseFloat(formData.get('prix_achat') as string || '0')
  const date_peremption = (formData.get('date_peremption') as string) || ''
  const lot = ((formData.get('lot') as string) || '').trim()

  if (!stockId) {
    return { error: 'Identifiant de stock manquant.' }
  }

  // Si medicamentId est manquant, le retrouver via la ligne de stock
  if (!medicamentId) {
    const { data: stockRow } = await supabase
      .from('stocks_pharmacie')
      .select('medicament_id')
      .eq('id', stockId)
      .single()
    if (stockRow?.medicament_id) {
      medicamentId = stockRow.medicament_id
    }
  }

  if (!medicamentId) {
    return { error: 'Article introuvable dans le stock.' }
  }

  if (!nom || isNaN(prix_vente) || prix_vente <= 0) {
    return { error: 'Le nom et un prix de vente valide supérieur à 0 sont obligatoires.' }
  }

  try {
    // 1. Résoudre les conflits de code-barres avec d'anciens enregistrements orphelins
    if (code_barres) {
      const { data: conflit } = await supabase
        .from('medicaments')
        .select('id')
        .eq('code_barres', code_barres)
        .neq('id', medicamentId)
        .maybeSingle()

      if (conflit) {
        const { data: stocksConflit } = await supabase
          .from('stocks_pharmacie')
          .select('id')
          .eq('medicament_id', conflit.id)
          .limit(1)

        if (!stocksConflit || stocksConflit.length === 0) {
          // Supprimer l'orphelin pour libérer le code-barres
          await supabase.from('medicaments').delete().eq('id', conflit.id)
        } else {
          // Si déjà utilisé ailleurs, vider son code
          await supabase.from('medicaments').update({ code_barres: null }).eq('id', conflit.id)
        }
      }
    }

    // 2. Mettre à jour les informations du médicament / catalogue
    const { error: medError } = await supabase
      .from('medicaments')
      .update({
        nom,
        code_barres: code_barres || null,
        type_produit
      })
      .eq('id', medicamentId)

    if (medError) throw medError

    // 3. Mettre à jour les informations de stock pour cette pharmacie
    const stockUpdatePayload: any = {
      quantite: isNaN(quantite) ? 0 : quantite,
      prix_vente,
      prix_achat: isNaN(prix_achat) ? 0 : prix_achat,
      lot: lot || null,
      updated_at: new Date().toISOString()
    }

    if (date_peremption) {
      stockUpdatePayload.date_peremption = date_peremption
    }

    const { error: stockError } = await supabase
      .from('stocks_pharmacie')
      .update(stockUpdatePayload)
      .eq('id', stockId)
      .eq('gie_id', tenant.gieId)

    if (stockError) throw stockError

    revalidatePath('/pharmacie/stocks')
    revalidatePath('/pharmacie/pos')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error('Erreur mise à jour complète article:', err)
    return { error: err.message || 'Erreur lors de la mise à jour de l\'article' }
  }
}

export async function deleteArticleStock(stockId: string, medicamentId?: string) {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  if (!tenant) return { error: 'Officine non trouvée.' }

  if (!stockId) {
    return { error: 'Identifiant de stock manquant.' }
  }

  try {
    let targetMedId = medicamentId
    if (!targetMedId) {
      const { data: stockRow } = await supabase
        .from('stocks_pharmacie')
        .select('medicament_id')
        .eq('id', stockId)
        .single()
      if (stockRow?.medicament_id) {
        targetMedId = stockRow.medicament_id
      }
    }

    // Vérifier si l'article est référencé dans des ventes existantes
    if (targetMedId) {
      const { data: ventesLiees } = await supabase
        .from('lignes_vente_pharmacie')
        .select('id')
        .eq('medicament_id', targetMedId)
        .limit(1)

      if (ventesLiees && ventesLiees.length > 0) {
        // L'article a déjà des ventes enregistrées dans l'historique comptable
        // On remet la quantité à 0 pour le désactiver sans détruire les tickets de caisse passés
        await supabase
          .from('stocks_pharmacie')
          .update({
            quantite: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', stockId)
          .eq('gie_id', tenant.gieId)

        revalidatePath('/pharmacie/stocks')
        revalidatePath('/pharmacie/pos')
        return {
          warning: 'Cet article figure déjà sur des tickets de caisse passés. Pour préserver l\'intégrité comptable, son stock a été ramené à 0.'
        }
      }
    }

    // Si aucune vente liée (erreur de saisie), suppression directe de la ligne de stock
    const { error: deleteError } = await supabase
      .from('stocks_pharmacie')
      .delete()
      .eq('id', stockId)
      .eq('gie_id', tenant.gieId)

    if (deleteError) throw deleteError

    // Si le médicament n'est utilisé par aucun autre stock ni commande, on nettoie
    if (targetMedId) {
      const { data: otherStocks } = await supabase
        .from('stocks_pharmacie')
        .select('id')
        .eq('medicament_id', targetMedId)
        .limit(1)

      if (!otherStocks || otherStocks.length === 0) {
        await supabase
          .from('medicaments')
          .delete()
          .eq('id', targetMedId)
      }
    }

    revalidatePath('/pharmacie/stocks')
    revalidatePath('/pharmacie/pos')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error('Erreur suppression stock:', err)
    return { error: err.message || 'Erreur lors de la suppression' }
  }
}

/**
 * Recherche un médicament par son code-barres ou son nom
 * pour auto-compléter les informations lors de la saisie ou du scan
 */
export async function searchMedicamentByCodeOrName(recherche: string) {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  if (!tenant || !recherche?.trim()) return null

  const q = recherche.trim()

  try {
    // 1. Chercher par code-barres exact
    const { data: medByCode } = await supabase
      .from('medicaments')
      .select('id, nom, code_barres, type_produit')
      .eq('code_barres', q)
      .maybeSingle()

    if (medByCode) {
      // Vérifier le dernier prix connu dans le stock
      const { data: stockRef } = await supabase
        .from('stocks_pharmacie')
        .select('prix_vente, prix_achat, lot, date_peremption')
        .eq('medicament_id', medByCode.id)
        .eq('gie_id', tenant.gieId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return {
        ...medByCode,
        prix_vente: stockRef?.prix_vente,
        prix_achat: stockRef?.prix_achat,
        lot: stockRef?.lot,
        date_peremption: stockRef?.date_peremption
      }
    }

    // 2. Chercher par nom
    const { data: medByName } = await supabase
      .from('medicaments')
      .select('id, nom, code_barres, type_produit')
      .ilike('nom', q)
      .limit(1)
      .maybeSingle()

    if (medByName) {
      const { data: stockRef } = await supabase
        .from('stocks_pharmacie')
        .select('prix_vente, prix_achat, lot, date_peremption')
        .eq('medicament_id', medByName.id)
        .eq('gie_id', tenant.gieId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return {
        ...medByName,
        prix_vente: stockRef?.prix_vente,
        prix_achat: stockRef?.prix_achat,
        lot: stockRef?.lot,
        date_peremption: stockRef?.date_peremption
      }
    }

    return null
  } catch {
    return null
  }
}

