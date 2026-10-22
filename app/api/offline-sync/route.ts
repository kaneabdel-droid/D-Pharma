import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getTenantContext } from '@/utils/supabase/tenant'
import { revalidatePath } from 'next/cache'

export async function GET() {
  return NextResponse.json({ status: 'online', service: 'd-pharma-sync', timestamp: Date.now() })
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext()
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Session non authentifiée ou expirée' }, { status: 401 })
    }

    const body = await req.json()
    const { actionType, payload } = body

    let adminClient: any
    try {
      adminClient = createAdminClient()
    } catch {
      adminClient = await createClient()
    }

    if (actionType === 'vente_pos' || actionType === 'creer_vente') {
      const { 
        cart, 
        moyen_paiement, 
        montant_total, 
        compte_tresorerie_id, 
        client_id, 
        part_patient, 
        part_credit 
      } = payload || {}

      if (!cart || !Array.isArray(cart) || cart.length === 0) {
        return NextResponse.json({ success: false, error: 'Panier vide ou invalide' }, { status: 400 })
      }

      // Résolution du compte de trésorerie récepteur
      let targetCompteId = compte_tresorerie_id
      if (!targetCompteId) {
        if (moyen_paiement === 'mobile_money' || (moyen_paiement && (moyen_paiement.includes('wave') || moyen_paiement.includes('orange')))) {
          const { data: mmCompte } = await adminClient
            .from('comptes')
            .select('id')
            .eq('gie_id', tenant.gieId)
            .or('type.eq.mobile_money,nom.ilike.%wave%,nom.ilike.%orange%,nom.ilike.%free%')
            .limit(1)
            .maybeSingle()
          targetCompteId = mmCompte?.id || null
        } else if (moyen_paiement === 'carte' || moyen_paiement === 'virement') {
          const { data: bqCompte } = await adminClient
            .from('comptes')
            .select('id')
            .eq('gie_id', tenant.gieId)
            .or('type.eq.banque,nom.ilike.%banque%')
            .limit(1)
            .maybeSingle()
          targetCompteId = bqCompte?.id || null
        } else {
          const { data: caisseCompte } = await adminClient
            .from('comptes')
            .select('id')
            .eq('gie_id', tenant.gieId)
            .or('type.eq.caisse,nom.ilike.%caisse%')
            .limit(1)
            .maybeSingle()
          targetCompteId = caisseCompte?.id || null
        }
      }

      const dateCode = new Date().toISOString().slice(2, 10).replace(/-/g, '')
      const randCode = Math.floor(1000 + Math.random() * 9000)
      const numero_ticket = `TK-OFF-${dateCode}-${randCode}`

      // 1. Créer la vente
      const { data: venteData, error: venteError } = await adminClient
        .from('ventes_pharmacie')
        .insert({
          gie_id: tenant.gieId,
          montant_total: Number(montant_total) || 0,
          moyen_paiement: moyen_paiement || 'especes',
          compte_tresorerie_id: targetCompteId,
          client_id: client_id || null,
          part_patient: part_patient !== undefined ? Number(part_patient) : (moyen_paiement === 'credit' ? 0 : Number(montant_total) || 0),
          part_credit: part_credit !== undefined ? Number(part_credit) : (moyen_paiement === 'credit' ? Number(montant_total) || 0 : 0),
          numero_ticket,
          statut: 'validee',
        })
        .select()
        .single()

      if (venteError) throw venteError

      // 2. Créer les lignes de vente
      const lignesToInsert = cart.map((item: any) => ({
        vente_id: venteData.id,
        medicament_id: item.medicament_id,
        quantite: Number(item.quantite) || 1,
        prix_unitaire: Number(item.prix_unitaire) || 0,
      }))

      const { error: lignesError } = await adminClient
        .from('lignes_vente_pharmacie')
        .insert(lignesToInsert)

      if (lignesError) throw lignesError

      // 3. Mettre à jour les stocks
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

      // 4. Trésorerie
      const montantEncaisse = Number(part_patient !== undefined ? part_patient : (moyen_paiement === 'credit' ? 0 : montant_total)) || 0
      if (montantEncaisse > 0 && targetCompteId) {
        try {
          await adminClient.from('transactions').insert({
            gie_id: tenant.gieId,
            compte_id: targetCompteId,
            type_transaction: 'entree',
            montant: montantEncaisse,
            motif: `Vente comptoir POS ${numero_ticket} (${moyen_paiement}) [Sync Hors-Ligne]`,
            date_transaction: new Date().toISOString().split('T')[0],
          })
        } catch (tresoErr) {
          console.warn('Mise à jour trésorerie facultative ignorée:', tresoErr)
        }
      }

      revalidatePath('/pharmacie/pos')
      revalidatePath('/pharmacie/stocks')
      revalidatePath('/dashboard')
      return NextResponse.json({ success: true, venteId: venteData.id })
    }

    return NextResponse.json({ success: false, error: `Type d'action inconnu: ${actionType}` }, { status: 400 })
  } catch (error: any) {
    console.error('Erreur API offline-sync pharma:', error)
    return NextResponse.json({ success: false, error: error.message || 'Erreur interne de synchronisation' }, { status: 500 })
  }
}
