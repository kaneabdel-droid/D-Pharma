'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getTenantContext } from '@/utils/supabase/tenant'
import { chercherDansDictionnaire } from '@/lib/pharmacie/dictionnaire-medicaments'

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
    let medicament_id: string | null = null

    // 1. Cherche d'abord par code barre si fourni
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
          try {
            await supabase.from('medicaments').update({ nom, type_produit }).eq('id', medicament_id)
          } catch {
            await supabase.from('medicaments').update({ nom }).eq('id', medicament_id)
          }
        }
      }
    }

    // 2. Sinon cherche par nom
    if (!medicament_id) {
      const { data: existingMedName } = await supabase
        .from('medicaments')
        .select('id, nom, code_barres')
        .ilike('nom', nom)
        .maybeSingle()

      if (existingMedName) {
        medicament_id = existingMedName.id

        // Mettre à jour le code-barres s'il a été saisi ou modifié
        if (code_barres && existingMedName.code_barres !== code_barres) {
          // Libérer immédiatement ce code-barres sur tout autre article pour éviter la collision UNIQUE
          await supabase
            .from('medicaments')
            .update({ code_barres: null })
            .eq('code_barres', code_barres)
            .neq('id', medicament_id)

          try {
            await supabase.from('medicaments').update({ code_barres, type_produit }).eq('id', medicament_id)
          } catch {
            await supabase.from('medicaments').update({ code_barres }).eq('id', medicament_id)
          }
        }
      }
    }

    // 3. S'il n'existe pas encore dans medicaments, on le crée
    if (!medicament_id) {
      if (code_barres) {
        // Libérer le code-barres pour garantir qu'aucune collision UNIQUE ne bloque l'insert
        await supabase
          .from('medicaments')
          .update({ code_barres: null })
          .eq('code_barres', code_barres)
      }

      let newMedId: string | null = null

      try {
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
        newMedId = newMed.id
      } catch {
        // Fallback sans type_produit si la colonne n'existe pas
        const { data: newMedFallback, error: fallbackError } = await supabase
          .from('medicaments')
          .insert({
            nom,
            code_barres: code_barres || null
          })
          .select('id')
          .single()

        if (fallbackError) throw fallbackError
        newMedId = newMedFallback.id
      }

      medicament_id = newMedId
    }

    if (!medicament_id) {
      return { error: 'Impossible de créer ou retrouver l\'article.' }
    }

    // 4. Ajouter l'entrée en stock pour cette officine
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
    revalidatePath('/pharmacie/commandes')
    revalidatePath('/dashboard')
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
    // 1. Libérer le code-barres sur tout autre article pour éviter la collision UNIQUE
    if (code_barres) {
      await supabase
        .from('medicaments')
        .update({ code_barres: null })
        .eq('code_barres', code_barres)
        .neq('id', medicamentId)
    }

    // 2. Mettre à jour les informations du médicament dans le catalogue
    try {
      const { error: medError } = await supabase
        .from('medicaments')
        .update({
          nom,
          code_barres: code_barres || null,
          type_produit
        })
        .eq('id', medicamentId)

      if (medError) throw medError
    } catch {
      // Fallback sans type_produit
      await supabase
        .from('medicaments')
        .update({
          nom,
          code_barres: code_barres || null
        })
        .eq('id', medicamentId)
    }

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
    revalidatePath('/pharmacie/commandes')
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
    let aDesVentes = false
    if (targetMedId) {
      const { data: ventesLiees } = await supabase
        .from('lignes_vente_pharmacie')
        .select('id')
        .eq('medicament_id', targetMedId)
        .limit(1)

      if (ventesLiees && ventesLiees.length > 0) {
        aDesVentes = true
      }
    }

    if (aDesVentes) {
      // Pour préserver l'historique comptable des tickets passés :
      // 1. Ramener la quantité en stock à 0
      await supabase
        .from('stocks_pharmacie')
        .update({
          quantite: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', stockId)
        .eq('gie_id', tenant.gieId)

      // 2. Libérer le code-barres sur medicaments pour que l'utilisateur puisse
      // le réutiliser ou le corriger immédiatement sans conflit UNIQUE
      if (targetMedId) {
        await supabase
          .from('medicaments')
          .update({ code_barres: null })
          .eq('id', targetMedId)
      }

      revalidatePath('/pharmacie/stocks')
      revalidatePath('/pharmacie/pos')
      return {
        warning: 'Cet article figure déjà sur des tickets de caisse passés. Son stock a été remis à 0 et son code-barres a été libéré pour éviter tout conflit futur.'
      }
    }

    // Si aucune vente liée (erreur de saisie ou correction) :
    // 1. Libérer le code-barres en premier
    if (targetMedId) {
      await supabase
        .from('medicaments')
        .update({ code_barres: null })
        .eq('id', targetMedId)
    }

    // 2. Supprimer la ligne de stock pour cette pharmacie
    const { error: deleteError } = await supabase
      .from('stocks_pharmacie')
      .delete()
      .eq('id', stockId)
      .eq('gie_id', tenant.gieId)

    if (deleteError) throw deleteError

    // 3. Si aucun autre stock n'utilise ce médicament, nettoyer la table globale medicaments
    if (targetMedId) {
      const { data: otherStocks } = await supabase
        .from('stocks_pharmacie')
        .select('id')
        .eq('medicament_id', targetMedId)
        .limit(1)

      if (!otherStocks || otherStocks.length === 0) {
        try {
          await supabase.from('medicaments').delete().eq('id', targetMedId)
        } catch {
          // Si une autre contrainte empêche le delete physique, le code_barres est déjà null donc aucun problème
        }
      }
    }

    revalidatePath('/pharmacie/stocks')
    revalidatePath('/pharmacie/pos')
    revalidatePath('/pharmacie/commandes')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error('Erreur suppression stock:', err)
    return { error: err.message || 'Erreur lors de la suppression' }
  }
}

/**
 * Corrige directement le code-barres d'un médicament (résout les erreurs de saisie)
 */
export async function corrigerCodeBarresArticle(medicamentId: string, nouveauCode: string) {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  if (!tenant || !medicamentId) return { error: 'Paramètres manquants.' }

  const codeNet = (nouveauCode || '').trim()

  try {
    if (codeNet) {
      // Libérer de tout conflit
      await supabase
        .from('medicaments')
        .update({ code_barres: null })
        .eq('code_barres', codeNet)
        .neq('id', medicamentId)
    }

    const { error } = await supabase
      .from('medicaments')
      .update({ code_barres: codeNet || null })
      .eq('id', medicamentId)

    if (error) throw error

    revalidatePath('/pharmacie/stocks')
    revalidatePath('/pharmacie/pos')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Erreur correction code-barres' }
  }
}

/**
 * Recherche un médicament par son code-barres ou son nom
 * pour auto-compléter les informations lors de la saisie ou du scan
 * (Interroge d'abord la base locale, puis le référentiel pharmaceutique universel)
 */
export async function searchMedicamentByCodeOrName(recherche: string) {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  if (!tenant || !recherche?.trim()) return null

  const q = recherche.trim()

  try {
    // 1. Chercher par code-barres exact dans le catalogue local
    const { data: medByCode } = await supabase
      .from('medicaments')
      .select('id, nom, code_barres')
      .eq('code_barres', q)
      .maybeSingle()

    if (medByCode) {
      const { data: stockRef } = await supabase
        .from('stocks_pharmacie')
        .select('prix_vente, prix_achat, lot, date_peremption')
        .eq('medicament_id', medByCode.id)
        .eq('gie_id', tenant.gieId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return {
        id: medByCode.id,
        nom: medByCode.nom,
        code_barres: medByCode.code_barres,
        type_produit: 'medicament',
        prix_vente: stockRef?.prix_vente,
        prix_achat: stockRef?.prix_achat,
        lot: stockRef?.lot,
        date_peremption: stockRef?.date_peremption
      }
    }

    // 2. Chercher par nom dans le catalogue local
    const { data: medByName } = await supabase
      .from('medicaments')
      .select('id, nom, code_barres')
      .ilike('nom', `%${q}%`)
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
        id: medByName.id,
        nom: medByName.nom,
        code_barres: medByName.code_barres,
        type_produit: 'medicament',
        prix_vente: stockRef?.prix_vente,
        prix_achat: stockRef?.prix_achat,
        lot: stockRef?.lot,
        date_peremption: stockRef?.date_peremption
      }
    }

    // 3. Si non trouvé en base, interroger le dictionnaire pharmaceutique de référence
    const ref = chercherDansDictionnaire(q)
    if (ref) {
      return {
        id: null,
        nom: ref.nom,
        code_barres: ref.code_barres,
        type_produit: ref.type_produit,
        prix_vente: ref.prix_vente_indicatif,
        prix_achat: ref.prix_achat_indicatif,
        lot: null,
        date_peremption: null
      }
    }

    return null
  } catch {
    const ref = chercherDansDictionnaire(q)
    if (ref) {
      return {
        id: null,
        nom: ref.nom,
        code_barres: ref.code_barres,
        type_produit: ref.type_produit,
        prix_vente: ref.prix_vente_indicatif,
        prix_achat: ref.prix_achat_indicatif,
        lot: null,
        date_peremption: null
      }
    }
    return null
  }
}
