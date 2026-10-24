import { createAdminClient } from '@/utils/supabase/admin'
import { fetchChariowSale, mapChariowStatus } from '@/lib/payments/chariow'
import { fetchMaketouCart, mapMaketouStatus } from '@/lib/payments/maketou'
import { applyPaymentResult } from '@/lib/payments/fulfill'

export const runtime = 'nodejs'

/**
 * Filet de sécurité : un paiement peut se régler alors que
 * l'utilisateur a déjà fermé l'onglet ET sans webhook (Maketou n'a pas de webhook).
 * Ce cron repull le statut réel des paiements mobiles (Maketou & Chariow) encore "pending" après quelques minutes.
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const seuil = new Date(Date.now() - 2 * 60_000).toISOString()

  // 1. Reconcile Chariow
  const { data: enAttenteChariow } = await supabase
    .from('abonnement_paiements')
    .select('provider_reference')
    .eq('provider', 'chariow')
    .eq('statut', 'pending')
    .not('provider_reference', 'is', null)
    .lt('created_at', seuil)

  const resultatsChariow = []
  for (const row of enAttenteChariow ?? []) {
    const saleId = row.provider_reference as string
    const live = await fetchChariowSale(saleId)
    if (!live) continue

    const status = mapChariowStatus(live.status)
    if (status === 'pending') continue

    const result = await applyPaymentResult('chariow', {
      providerTransactionId: saleId,
      status,
      reportedAmount: live.amount,
      reportedCurrency: live.currency,
    })
    resultatsChariow.push({ saleId, ...result })
  }

  // 2. Reconcile Maketou
  const { data: enAttenteMaketou } = await supabase
    .from('abonnement_paiements')
    .select('provider_reference')
    .eq('provider', 'maketou')
    .eq('statut', 'pending')
    .not('provider_reference', 'is', null)
    .lt('created_at', seuil)

  const resultatsMaketou = []
  for (const row of enAttenteMaketou ?? []) {
    const cartId = row.provider_reference as string
    const live = await fetchMaketouCart(cartId)
    if (!live) continue

    const status = mapMaketouStatus(live.status)
    if (status === 'pending') continue

    const result = await applyPaymentResult('maketou', {
      providerTransactionId: cartId,
      status,
    })
    resultatsMaketou.push({ cartId, ...result })
  }

  return Response.json({
    chariow: { verifies: enAttenteChariow?.length ?? 0, resultats: resultatsChariow },
    maketou: { verifies: enAttenteMaketou?.length ?? 0, resultats: resultatsMaketou },
  })
}
