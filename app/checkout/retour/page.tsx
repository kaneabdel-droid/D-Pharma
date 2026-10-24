import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import Link from 'next/link'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { getDictionary, getLocale } from '@/dictionaries'
import { fetchMaketouCart, mapMaketouStatus } from '@/lib/payments/maketou'
import { fetchChariowSale, mapChariowStatus } from '@/lib/payments/chariow'
import { applyPaymentResult } from '@/lib/payments/fulfill'

export default async function CheckoutRetourPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const { ref } = await searchParams
  const supabase = await createClient()
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const d = dict.checkout_extra?.retour || {}

  const lirePaiement = async () => {
    if (!ref) return null
    const { data } = await supabase
      .from('abonnement_paiements')
      .select('id, statut, niveau, provider, provider_reference')
      .eq('id', ref)
      .maybeSingle()
    return data
  }

  let payment = await lirePaiement()

  // Si le paiement est encore pending, on vérifie en direct auprès du prestataire (Maketou ou Chariow)
  if (payment?.statut === 'pending' && payment.provider_reference) {
    try {
      if (payment.provider === 'maketou') {
        const live = await fetchMaketouCart(payment.provider_reference)
        const liveStatus = live ? mapMaketouStatus(live.status) : 'pending'
        if (live && liveStatus !== 'pending') {
          await applyPaymentResult('maketou', {
            providerTransactionId: payment.provider_reference,
            status: liveStatus,
          })
          payment = await lirePaiement()
        }
      } else if (payment.provider === 'chariow') {
        const live = await fetchChariowSale(payment.provider_reference)
        const liveStatus = live ? mapChariowStatus(live.status) : 'pending'
        if (live && liveStatus !== 'pending') {
          await applyPaymentResult('chariow', {
            providerTransactionId: payment.provider_reference,
            status: liveStatus,
            reportedAmount: live.amount,
            reportedCurrency: live.currency,
          })
          payment = await lirePaiement()
        }
      }
    } catch (e) {
      console.error('[Checkout Retour] Erreur vérification live:', e)
    }
  }

  const statut = payment?.statut ?? 'pending'

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {statut === 'pending' && <meta httpEquiv="refresh" content="5" />}
      <div className="bg-surface border border-surface-border p-8 rounded-2xl max-w-md w-full text-center shadow-lg">
        {statut === 'completed' ? (
          <>
            <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-6" />
            <h2 className="text-2xl font-bold font-heading mb-2">{d.activated_title}</h2>
            <p className="text-foreground-muted mb-6">
              {d.activated_desc_prefix} {payment?.niveau} {d.activated_desc_suffix}
            </p>
            <Link href="/dashboard" className="text-primary font-semibold hover:text-primary-hover">
              {d.dashboard_link}
            </Link>
          </>
        ) : statut === 'failed' ? (
          <>
            <XCircle className="w-16 h-16 text-danger mx-auto mb-6" />
            <h2 className="text-2xl font-bold font-heading mb-2">{d.failed_title}</h2>
            <p className="text-foreground-muted mb-6">
              {d.failed_desc}
            </p>
            <Link href="/abonnement" className="text-primary font-semibold hover:text-primary-hover">
              {d.retry_link}
            </Link>
          </>
        ) : (
          <>
            <Clock className="w-16 h-16 text-primary mx-auto mb-6 animate-pulse" />
            <h2 className="text-2xl font-bold font-heading mb-2">{d.pending_title}</h2>
            <p className="text-foreground-muted mb-6">
              {d.pending_desc}
            </p>
            <Link href="/abonnement" className="text-primary font-semibold hover:text-primary-hover">
              {dict.checkout_extra.back_to_subscription}
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
