'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getTenantContext } from '@/utils/supabase/tenant'

export async function submitVente(formData: FormData) {
  const tenant = await getTenantContext()
  const supabase = await createClient()

  if (!tenant) {
    return { error: 'Erreur : Contexte officine introuvable.' }
  }

  const { data: { user } } = await supabase.auth.getUser()

  const cartStr = formData.get('cart') as string
  const moyen_paiement = (formData.get('moyen_paiement') as string) || 'especes'
  const montant_total_str = formData.get('montant_total') as string
  const compte_tresorerie_id = (formData.get('compte_tresorerie_id') as string) || null
  const client_id = (formData.get('client_id') as string) || null
  const part_patient_str = formData.get('part_patient') as string
  const part_credit_str = formData.get('part_credit') as string

  if (!cartStr || !montant_total_str) {
    return { error: 'Données de vente invalides.' }
  }

  const cart = JSON.parse(cartStr)
  if (!Array.isArray(cart) || cart.length === 0) {
    return { error: 'Le panier est vide.' }
  }

  const montant_total = parseFloat(montant_total_str)
  if (isNaN(montant_total) || montant_total <= 0) {
    return { error: 'Montant total invalide.' }
  }

  // Calcul part patient / part crédit
  let part_patient = part_patient_str ? parseFloat(part_patient_str) : 0
  let part_credit = part_credit_str ? parseFloat(part_credit_str) : 0

  if (moyen_paiement === 'credit') {
    if (!client_id) {
      return { error: 'Veuillez sélectionner un client / organisme pour la vente à crédit.' }
    }
    if (isNaN(part_credit) || part_credit <= 0) {
      part_credit = montant_total
      part_patient = 0
    }
  } else {
    part_patient = montant_total
    part_credit = 0
  }

  try {
    let adminClient: any
    try {
      adminClient = createAdminClient()
    } catch {
      adminClient = supabase
    }

    // Récupérer le nom du client si présent
    let clientData: any = null
    if (client_id) {
      const { data: c } = await adminClient
        .from('clients_externes')
        .select('*')
        .eq('id', client_id)
        .eq('gie_id', tenant.gieId)
        .single()
      clientData = c
    }

    // Générer un numéro de ticket unique
    const dateCode = new Date().toISOString().slice(2, 10).replace(/-/g, '')
    const randCode = Math.floor(1000 + Math.random() * 9000)
    const numero_ticket = `TK-${dateCode}-${randCode}`

    // Validation vente à crédit
    if (moyen_paiement === 'credit' && !client_id) {
      return { error: 'Pour une vente à crédit, vous devez obligatoirement sélectionner un client ou organisme payeur.' }
    }

    // Résoudre le compte de trésorerie récepteur
    let targetCompteId = compte_tresorerie_id
    if (!targetCompteId && part_patient > 0) {
      if (moyen_paiement === 'mobile_money' || moyen_paiement.includes('wave') || moyen_paiement.includes('orange')) {
        const { data: mmCompte } = await adminClient
          .from('comptes')
          .select('id, nom, type')
          .eq('gie_id', tenant.gieId)
          .or('type.eq.mobile_money,nom.ilike.%wave%,nom.ilike.%orange%,nom.ilike.%free%')
          .limit(1)
          .maybeSingle()
        targetCompteId = mmCompte?.id || null
      } else if (moyen_paiement === 'carte' || moyen_paiement === 'virement') {
        const { data: bqCompte } = await adminClient
          .from('comptes')
          .select('id, nom, type')
          .eq('gie_id', tenant.gieId)
          .or('type.eq.banque,nom.ilike.%banque%,nom.ilike.%cbao%')
          .limit(1)
          .maybeSingle()
        targetCompteId = bqCompte?.id || null
      } else {
        const { data: defaultCompte } = await adminClient
          .from('comptes')
          .select('id, nom, type')
          .eq('gie_id', tenant.gieId)
          .or('type.eq.caisse,nom.ilike.%caisse%')
          .limit(1)
          .maybeSingle()
        targetCompteId = defaultCompte?.id || null
      }

      if (!targetCompteId) {
        const { data: firstCompte } = await adminClient
          .from('comptes')
          .select('id')
          .eq('gie_id', tenant.gieId)
          .limit(1)
          .maybeSingle()
        targetCompteId = firstCompte?.id || null
      }
    }

    // 1. Enregistrer la vente dans ventes_pharmacie
    const { data: venteData, error: venteError } = await adminClient
      .from('ventes_pharmacie')
      .insert({
        gie_id: tenant.gieId,
        client_id: client_id || null,
        montant_total,
        moyen_paiement,
        compte_tresorerie_id: targetCompteId,
        part_patient,
        part_credit,
        numero_ticket,
        statut: 'validee',
        vendeur_id: user?.id || null,
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

    // 3. Mettre à jour les stocks (diminuer les quantités)
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

    // 4. Enregistrement systématique dans le JOURNAL DE VENTE (Comptabilité)
    let ecritureId: string | null = null
    try {
      const dateAujourdhui = new Date().toISOString().split('T')[0]
      const libelleEcriture = `Vente POS ${numero_ticket} (${moyen_paiement}${clientData ? ` - ${clientData.nom}` : ''})`

      const { data: ecriture, error: errEcriture } = await adminClient
        .from('ecritures_comptables')
        .insert({
          gie_id: tenant.gieId,
          journal: 'ventes',
          date_ecriture: dateAujourdhui,
          numero_piece: numero_ticket,
          libelle: libelleEcriture,
          validee: true,
          created_by: user?.id || null,
        })
        .select('id')
        .single()

      if (ecriture) {
        ecritureId = ecriture.id
        const ecritureLignes: any[] = []

        // 1. Débit compte trésorerie pour la part réglée au comptant
        if (part_patient > 0) {
          const numCompteTres = (moyen_paiement === 'especes') ? '571' : '521'
          ecritureLignes.push({
            ecriture_id: ecriture.id,
            gie_id: tenant.gieId,
            compte: numCompteTres,
            libelle: `Encaissement ${moyen_paiement} ticket ${numero_ticket}`,
            debit: part_patient,
            credit: 0,
          })
        }

        // 2. Débit compte 411 pour la part prise en charge à crédit
        if (part_credit > 0) {
          ecritureLignes.push({
            ecriture_id: ecriture.id,
            gie_id: tenant.gieId,
            compte: '411',
            libelle: `Créance client ticket ${numero_ticket} (${clientData?.nom || 'Client'})`,
            debit: part_credit,
            credit: 0,
          })
        }

        // 3. Crédit compte 701 (Vente de médicaments au comptoir) pour le total TTC
        ecritureLignes.push({
          ecriture_id: ecriture.id,
          gie_id: tenant.gieId,
          compte: '701',
          libelle: `Vente médicaments ${numero_ticket}`,
          debit: 0,
          credit: montant_total,
        })

        await adminClient.from('lignes_ecritures_comptables').insert(ecritureLignes)

        // Relier l'écriture à la vente
        await adminClient
          .from('ventes_pharmacie')
          .update({ ecriture_id: ecriture.id })
          .eq('id', venteData.id)
      }
    } catch (cptErr) {
      console.warn('Erreur génération écriture comptable vente:', cptErr)
    }

    // 5. Enregistrement dans le JOURNAL DE TRÉSORERIE concerné (si encaissement comptant)
    if (part_patient > 0 && targetCompteId) {
      try {
        const { data: compInfo } = await adminClient
          .from('comptes')
          .select('nom')
          .eq('id', targetCompteId)
          .maybeSingle()
        const compteLibelle = compInfo?.nom ? ` [${compInfo.nom}]` : ''

        await adminClient.from('transactions').insert({
          gie_id: tenant.gieId,
          compte_id: targetCompteId,
          type_transaction: 'entree',
          montant: part_patient,
          motif: `Encaissement vente POS ${numero_ticket} (${moyen_paiement}${compteLibelle})`,
          type_piece: 'ticket_pos',
          date_transaction: new Date().toISOString().split('T')[0],
        })
      } catch (tresoErr) {
        console.warn('Erreur écriture trésorerie:', tresoErr)
      }
    }

    // 6. Gestion du compte client si Vente à Crédit
    if (client_id && part_credit > 0 && clientData) {
      try {
        const nouveauSolde = Number(clientData.solde_creance || 0) + Number(part_credit)
        
        await adminClient
          .from('clients_externes')
          .update({ solde_creance: nouveauSolde })
          .eq('id', client_id)

        await adminClient.from('mouvements_creances_clients').insert({
          gie_id: tenant.gieId,
          client_id,
          date_mouvement: new Date().toISOString().split('T')[0],
          type_mouvement: 'facturation',
          numero_piece: numero_ticket,
          debit: part_credit,
          credit: 0,
          solde_resultant: nouveauSolde,
          libelle: `Vente pharmacie à crédit ticket ${numero_ticket}`,
        })
      } catch (clientErr) {
        console.warn('Erreur mise à jour créance client:', clientErr)
      }
    }

    revalidatePath('/pharmacie/pos')
    revalidatePath('/pharmacie/stocks')
    revalidatePath('/pharmacie/clients')
    revalidatePath('/comptabilite')
    revalidatePath('/tresorerie')
    revalidatePath('/tresorerie/journaux')
    revalidatePath('/dashboard')

    return { 
      success: true, 
      numero_ticket, 
      vente_id: venteData.id 
    }
  } catch (error: any) {
    console.error("Erreur lors de l'enregistrement de la vente:", error)
    return { error: error.message || 'Une erreur est survenue lors de la vente' }
  }
}

// -------------------------------------------------------------
// ANNULATION DE VENTE AVEC REPRISE SYSTÉMATIQUE DU STOCK
// ET ANNULATION DES ÉCRITURES COMPTABLES / TRÉSORERIE / CRÉANCES
// -------------------------------------------------------------
export async function annulerVente(venteId: string, motif?: string) {
  const tenant = await getTenantContext()
  const supabase = await createClient()

  if (!tenant) {
    return { error: 'Erreur : Contexte officine introuvable.' }
  }

  const { data: { user } } = await supabase.auth.getUser()

  try {
    let adminClient: any
    try {
      adminClient = createAdminClient()
    } catch {
      adminClient = supabase
    }

    // 1. Lire la vente avec ses lignes
    const { data: vente, error: vErr } = await adminClient
      .from('ventes_pharmacie')
      .select('*, lignes_vente_pharmacie(*), clients_externes(*)')
      .eq('id', venteId)
      .eq('gie_id', tenant.gieId)
      .single()

    if (vErr || !vente) {
      return { error: 'Vente introuvable' }
    }

    if (vente.statut === 'annulee') {
      return { error: 'Cette vente a déjà été annulée.' }
    }

    const numero_ticket = vente.numero_ticket || `Vente-${vente.id.slice(0, 8)}`

    // 2. REPRISE SYSTÉMATIQUE DU STOCK
    const lignes = vente.lignes_vente_pharmacie || []
    for (const ligne of lignes) {
      const { data: stockData } = await adminClient
        .from('stocks_pharmacie')
        .select('id, quantite')
        .eq('gie_id', tenant.gieId)
        .eq('medicament_id', ligne.medicament_id)
        .limit(1)
        .maybeSingle()

      if (stockData) {
        await adminClient
          .from('stocks_pharmacie')
          .update({ quantite: Number(stockData.quantite) + Number(ligne.quantite) })
          .eq('id', stockData.id)
      }
    }

    // 3. ANNULATION DES ÉCRITURES COMPTABLES LIÉES (Contre-passation dans le journal de vente)
    try {
      const dateAujourdhui = new Date().toISOString().split('T')[0]
      const libelleAnnulation = `[ANNULATION] Vente POS ${numero_ticket} : ${motif || 'Retour comptoir'}`

      const { data: ecritureAnnul } = await adminClient
        .from('ecritures_comptables')
        .insert({
          gie_id: tenant.gieId,
          journal: 'ventes',
          date_ecriture: dateAujourdhui,
          numero_piece: `ANNUL-${numero_ticket}`,
          libelle: libelleAnnulation,
          validee: true,
          created_by: user?.id || null,
        })
        .select('id')
        .single()

      if (ecritureAnnul) {
        const lignesContrepassation: any[] = [
          // Débit 701 (Annulation produit de vente)
          {
            ecriture_id: ecritureAnnul.id,
            gie_id: tenant.gieId,
            compte: '701',
            libelle: `Annulation vente médicaments ${numero_ticket}`,
            debit: Number(vente.montant_total),
            credit: 0,
          }
        ]

        // Crédit trésorerie si un paiement comptant a été encaissé
        const partPatient = Number(vente.part_patient || 0)
        if (partPatient > 0) {
          const numCompteTres = (vente.moyen_paiement === 'especes') ? '571' : '521'
          lignesContrepassation.push({
            ecriture_id: ecritureAnnul.id,
            gie_id: tenant.gieId,
            compte: numCompteTres,
            libelle: `Reprise fonds caisse/banque annulation ${numero_ticket}`,
            debit: 0,
            credit: partPatient,
          })
        }

        // Crédit 411 si une créance client avait été enregistrée
        const partCredit = Number(vente.part_credit || 0)
        if (partCredit > 0) {
          lignesContrepassation.push({
            ecriture_id: ecritureAnnul.id,
            gie_id: tenant.gieId,
            compte: '411',
            libelle: `Annulation créance ticket ${numero_ticket}`,
            debit: 0,
            credit: partCredit,
          })
        }

        await adminClient.from('lignes_ecritures_comptables').insert(lignesContrepassation)
      }
    } catch (cptErr) {
      console.warn('Erreur écriture comptable contre-passation:', cptErr)
    }

    // 4. ANNULATION DU FLUX DE TRÉSORERIE (Sortie compensatoire)
    const partPatient = Number(vente.part_patient || (vente.moyen_paiement !== 'credit' ? vente.montant_total : 0))
    if (partPatient > 0 && vente.moyen_paiement !== 'credit') {
      try {
        await adminClient.from('transactions').insert({
          gie_id: tenant.gieId,
          compte_id: vente.compte_tresorerie_id || null,
          type_transaction: 'sortie',
          montant: partPatient,
          motif: `[ANNULATION VENTE] Décaiss. remboursement ticket ${numero_ticket}`,
          type_piece: 'annulation_pos',
          date_transaction: new Date().toISOString().split('T')[0],
        })
      } catch (tresoErr) {
        console.warn('Erreur sortie trésorerie annulation:', tresoErr)
      }
    }

    // 5. ANNULATION DE LA CRÉANCE CLIENT (si vente à crédit)
    const partCredit = Number(vente.part_credit || 0)
    if (vente.client_id && partCredit > 0) {
      try {
        const client = vente.clients_externes
        const soldeActuel = Number(client?.solde_creance || 0)
        const nouveauSolde = Math.max(0, soldeActuel - partCredit)

        await adminClient
          .from('clients_externes')
          .update({ solde_creance: nouveauSolde })
          .eq('id', vente.client_id)

        await adminClient.from('mouvements_creances_clients').insert({
          gie_id: tenant.gieId,
          client_id: vente.client_id,
          date_mouvement: new Date().toISOString().split('T')[0],
          type_mouvement: 'reglement_effectue',
          numero_piece: `ANNUL-${numero_ticket}`,
          debit: 0,
          credit: partCredit,
          solde_resultant: nouveauSolde,
          libelle: `Annulation vente à crédit ticket ${numero_ticket}`,
        })
      } catch (clientErr) {
        console.warn('Erreur réduction créance client:', clientErr)
      }
    }

    // 6. MARQUER LA VENTE COMME ANNULÉE
    const { error: updateError } = await adminClient
      .from('ventes_pharmacie')
      .update({
        statut: 'annulee',
        motif_annulation: motif || 'Annulation au comptoir',
        date_annulation: new Date().toISOString(),
        annule_par: user?.id || null,
      })
      .eq('id', venteId)

    if (updateError) throw updateError

    revalidatePath('/pharmacie/pos')
    revalidatePath('/pharmacie/stocks')
    revalidatePath('/pharmacie/clients')
    revalidatePath('/comptabilite')
    revalidatePath('/tresorerie')
    revalidatePath('/tresorerie/journaux')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error: any) {
    console.error("Erreur lors de l'annulation de la vente:", error)
    return { error: error.message || "Impossible d'annuler la vente." }
  }
}
