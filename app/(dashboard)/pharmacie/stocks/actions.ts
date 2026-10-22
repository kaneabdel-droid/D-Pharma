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
        .select('id')
        .eq('code_barres', code_barres)
        .maybeSingle()
      
      if (existingMed) {
        medicament_id = existingMed.id
      }
    }

    // Sinon cherche par nom
    if (!medicament_id) {
      const { data: existingMedName } = await supabase
        .from('medicaments')
        .select('id')
        .ilike('nom', nom)
        .maybeSingle()
        
      if (existingMedName) {
        medicament_id = existingMedName.id
      }
    }

    // 2. S'il n'existe pas, on le crée dans le catalogue global
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

