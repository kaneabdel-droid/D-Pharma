'use server'

import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import { revalidatePath } from 'next/cache'

export async function importerDonneesPharma(typeId: string, records: any[]) {
  const tenant = await getTenantContext()
  if (!tenant?.gieId) return { succes: 0, erreurs: records.length, details: ['Session ou officine introuvable.'] }

  const supabase = await createClient()
  const gieId = tenant.gieId
  let succes = 0
  let erreurs = 0
  const details: string[] = []

  if (typeId === 'medicaments') {
    for (const item of records) {
      try {
        const nom = (item.nom || item.designation || item.libelle || '').trim()
        if (!nom) {
          erreurs++
          details.push(`Ligne ignorée : nom de médicament manquant`)
          continue
        }
        const codeBarres = (item.code_barres || item.codebarres || item.code || '').trim() || null
        const principeActif = (item.principe_actif || item.principeactif || '').trim() || null
        const description = (item.description || '').trim() || null
        const soumisOrdonnance = ['oui', 'true', '1', 'o'].includes(String(item.soumis_ordonnance || '').toLowerCase())

        // 1. Récupération ou création dans le catalogue
        let medId: string | null = null
        if (codeBarres) {
          const { data: exBarre } = await supabase.from('medicaments').select('id').eq('code_barres', codeBarres).maybeSingle()
          if (exBarre) medId = exBarre.id
        }
        if (!medId) {
          const { data: exNom } = await supabase.from('medicaments').select('id').ilike('nom', nom).maybeSingle()
          if (exNom) medId = exNom.id
        }

        if (!medId) {
          const { data: nouveau, error: errNouveau } = await supabase.from('medicaments').insert({
            nom,
            code_barres: codeBarres,
            principe_actif: principeActif,
            description,
            soumis_ordonnance: soumisOrdonnance,
          }).select('id').single()
          if (errNouveau) throw errNouveau
          medId = nouveau.id
        }

        // 2. Stock initial pour la pharmacie
        const quantite = parseFloat(String(item.quantite || item.stock || '0').replace(',', '.')) || 0
        const prixVente = parseFloat(String(item.prix_vente || item.prix || '0').replace(',', '.')) || 0
        const lot = (item.lot || 'INITIAL').trim()
        const datePeremption = (item.date_peremption || item.peremption || '').trim() || new Date(Date.now() + 365*24*3600*1000).toISOString().split('T')[0]

        const { error: errStock } = await supabase.from('stocks_pharmacie').insert({
          gie_id: gieId,
          medicament_id: medId,
          quantite,
          prix_vente: prixVente,
          lot,
          date_peremption: datePeremption,
        })
        if (errStock) throw errStock

        succes++
      } catch (e: any) {
        erreurs++
        details.push(`Erreur sur "${item.nom || 'article'}" : ${e.message}`)
      }
    }
    revalidatePath('/pharmacie/stocks')
    revalidatePath('/pharmacie/pos')
  } else if (typeId === 'fournisseurs') {
    for (const item of records) {
      try {
        const nom = (item.nom || item.fournisseur || item.laboratoire || '').trim()
        if (!nom) {
          erreurs++
          continue
        }
        const { error } = await supabase.from('fournisseurs_labo').insert({
          gie_id: gieId,
          nom,
          contact_email: (item.contact_email || item.email || '').trim() || null,
          contact_telephone: (item.contact_telephone || item.telephone || '').trim() || null,
          adresse: (item.adresse || '').trim() || null,
        })
        if (error) throw error
        succes++
      } catch (e: any) {
        erreurs++
        details.push(`Erreur fournisseur "${item.nom}" : ${e.message}`)
      }
    }
    revalidatePath('/pharmacie/commandes')
  } else if (typeId === 'clients') {
    for (const item of records) {
      try {
        const nom = (item.nom || item.client || '').trim()
        if (!nom) {
          erreurs++
          continue
        }
        const { error } = await supabase.from('clients_externes').insert({
          gie_id: gieId,
          nom,
          telephone: (item.telephone || item.contact_telephone || '').trim() || null,
          email: (item.email || item.contact_email || '').trim() || null,
          adresse: (item.adresse || '').trim() || null,
        })
        if (error) throw error
        succes++
      } catch (e: any) {
        erreurs++
        details.push(`Erreur client "${item.nom}" : ${e.message}`)
      }
    }
    revalidatePath('/pharmacie/pos')
  }

  return { succes, erreurs, details }
}
