'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, Smartphone, Banknote, ArrowLeft, Clock } from 'lucide-react'
import { initiateSubscriptionPayment, type MoyenPaiement } from './actions'
import { montantUsd } from '@/lib/payments/dollars'

export default function CheckoutClient({
  initialPlan,
  isLoggedIn,
  currentTier,
  isUpgrade,
  enDollars = false,
  hasOnlinePayment,
  dict,
  locale,
}: {
  initialPlan: string
  isLoggedIn: boolean
  currentTier: string
  isUpgrade: boolean
  /** GIE d'un autre pays (devise « sans unité ») : paiement par carte en dollars US uniquement. */
  enDollars?: boolean
  hasOnlinePayment: { mobileMoney: boolean; carte: boolean; chariow: boolean; maketou: boolean }
  dict: any
  locale: string
}) {
  const d = dict.checkout_extra
  const localeCode = locale === 'fr' ? 'fr-FR' : 'en-US'

  const availableMethods: MoyenPaiement[] = enDollars
    ? hasOnlinePayment.carte ? ['carte'] : []
    : [
        'mobile_money',
        ...(hasOnlinePayment.carte ? (['carte'] as const) : []),
        'virement',
      ]

  const router = useRouter()
  const [paymentMethod, setPaymentMethod] = useState<MoyenPaiement>(availableMethods[0] || 'mobile_money')
  const [phoneLocal, setPhoneLocal] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [virementPending, setVirementPending] = useState(false)

  const plans: Record<string, { name: string; price: string; value: number }> = {
    pharmacie: { name: 'Pharmacie (Officine)', price: '75.000 FCFA / an', value: 75000 },
    fournisseur: { name: 'Fournisseur / Laboratoire', price: '50.000 FCFA / an', value: 50000 },
    // Alias de rétrocompatibilité
    standard: { name: 'Pharmacie (Officine)', price: '75.000 FCFA / an', value: 75000 },
    medium: { name: 'Pharmacie (Officine)', price: '75.000 FCFA / an', value: 75000 },
    premium: { name: 'Pharmacie (Officine)', price: '75.000 FCFA / an', value: 75000 },
  }

  const selectedPlan = plans[initialPlan] || plans.pharmacie
  const currentPlan = plans[currentTier] || plans.pharmacie

  let priceToPay = selectedPlan.price
  let numericPrice = selectedPlan.value

  if (isUpgrade) {
    numericPrice = selectedPlan.value - currentPlan.value
    if (numericPrice <= 0) numericPrice = selectedPlan.value
    priceToPay = `${numericPrice.toLocaleString(localeCode)} FCFA`
  }
  if (enDollars) priceToPay = `${montantUsd(numericPrice).toLocaleString('en-US')} $`

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isLoggedIn) {
      // Pas de paiement réel avant la création du compte — l'inscription est gratuite
      // et le passage à un forfait payant se fait depuis /abonnement une fois connecté.
      router.push(`/signup?plan=${initialPlan}`)
      return
    }

    setError(null)
    setIsProcessing(true)

    if ((paymentMethod === 'mobile_money' || paymentMethod === 'chariow' || paymentMethod === 'maketou' || paymentMethod === 'wave') && !phoneLocal.trim()) {
      setError(d.phone_required_error || 'Veuillez saisir votre numéro de téléphone mobile.')
      setIsProcessing(false)
      return
    }

    const result = await initiateSubscriptionPayment(initialPlan, isUpgrade, paymentMethod, phoneLocal)

    setIsProcessing(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    if ('virement' in result) {
      setVirementPending(true)
      return
    }

    window.location.href = result.checkoutUrl
  }

  if (virementPending) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-surface border border-surface-border p-8 rounded-2xl max-w-md w-full text-center shadow-lg">
          <Clock className="w-16 h-16 text-primary mx-auto mb-6" />
          <h2 className="text-2xl font-bold font-heading mb-2">{d.virement_saved_title}</h2>
          <p className="text-foreground-muted mb-6">
            {d.virement_saved_desc}
          </p>
          <Link href="/abonnement" className="text-primary font-semibold hover:text-primary-hover">
            {d.back_to_subscription}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/tarifs" className="text-foreground-muted hover:text-primary flex items-center gap-2 w-fit transition-colors">
            <ArrowLeft className="w-4 h-4" /> {d.back_offers}
          </Link>
        </div>

        <div className="bg-background border border-surface-border rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row">

          {/* Order Summary */}
          <div className="bg-primary/5 p-8 md:w-1/3 border-b md:border-b-0 md:border-r border-surface-border">
            <h2 className="text-xl font-bold font-heading mb-6">{d.order_summary}</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-foreground-muted">{d.subscription}</p>
                <p className="font-semibold text-lg">{selectedPlan.name}</p>
              </div>
              <div className="pt-4 border-t border-surface-border">
                <p className="text-sm text-foreground-muted mb-1">{d.total_ttc}</p>
                <p className="text-2xl font-bold text-primary">{priceToPay}</p>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="p-8 md:w-2/3">
            <h2 className="text-xl font-bold font-heading mb-6">{d.payment_method}</h2>

            {error && (
              <p className="mb-6 text-sm bg-danger/10 text-danger p-3 rounded-md">{error}</p>
            )}

            {enDollars && (
              <p className="mb-6 text-sm bg-surface border border-surface-border p-3 rounded-md">
                {availableMethods.length > 0 ? d.usd_card_only : d.card_unavailable}
              </p>
            )}

            <form onSubmit={handlePayment}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {!enDollars && (
                  <label className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'mobile_money' ? 'border-primary bg-primary/5 shadow-sm' : 'border-surface-border bg-surface hover:bg-black/5'}`}>
                    <input type="radio" name="paymentMethod" value="mobile_money" checked={paymentMethod === 'mobile_money'} onChange={() => setPaymentMethod('mobile_money')} className="sr-only" />
                    <Smartphone className={`w-8 h-8 mb-2 ${paymentMethod === 'mobile_money' ? 'text-primary' : 'text-foreground-muted'}`} />
                    <span className={`font-semibold text-center ${paymentMethod === 'mobile_money' ? 'text-primary' : 'text-foreground'}`}>
                      Paiement Mobile
                    </span>
                    <span className="text-[11px] text-foreground-muted mt-0.5">Wave, Orange Money (Maketou & Chariow)</span>
                  </label>
                )}

                {hasOnlinePayment.carte && (
                  <label className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'carte' ? 'border-primary bg-primary/5 shadow-sm' : 'border-surface-border bg-surface hover:bg-black/5'}`}>
                    <input type="radio" name="paymentMethod" value="carte" checked={paymentMethod === 'carte'} onChange={() => setPaymentMethod('carte')} className="sr-only" />
                    <CreditCard className={`w-8 h-8 mb-2 ${paymentMethod === 'carte' ? 'text-primary' : 'text-foreground-muted'}`} />
                    <span className={`font-semibold ${paymentMethod === 'carte' ? 'text-primary' : 'text-foreground'}`}>{d.card}</span>
                    <span className="text-[11px] text-foreground-muted mt-0.5">Visa, Mastercard</span>
                  </label>
                )}

                {!enDollars && (
                  <label className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'virement' ? 'border-primary bg-primary/5 shadow-sm' : 'border-surface-border bg-surface hover:bg-black/5'}`}>
                    <input type="radio" name="paymentMethod" value="virement" checked={paymentMethod === 'virement'} onChange={() => setPaymentMethod('virement')} className="sr-only" />
                    <Banknote className={`w-8 h-8 mb-2 ${paymentMethod === 'virement' ? 'text-primary' : 'text-foreground-muted'}`} />
                    <span className={`font-semibold ${paymentMethod === 'virement' ? 'text-primary' : 'text-foreground'}`}>{d.transfer}</span>
                    <span className="text-[11px] text-foreground-muted mt-0.5">Virement bancaire</span>
                  </label>
                )}
              </div>

              {paymentMethod === 'virement' && (
                <div className="mb-8 bg-surface p-4 rounded-lg border border-surface-border">
                  <p className="text-sm text-foreground-muted mb-2">{d.transfer_instructions}</p>
                  <p className="font-mono font-semibold">SN048 08002 01057183001 43</p>
                  <p className="text-sm text-foreground-muted mt-2">{d.transfer_note}</p>
                </div>
              )}

              {(paymentMethod === 'mobile_money' || paymentMethod === 'chariow' || paymentMethod === 'maketou' || paymentMethod === 'wave') && (
                <div className="mb-8 bg-surface/50 border border-surface-border p-4 rounded-xl">
                  <label htmlFor="phoneLocal" className="block text-sm font-semibold text-foreground mb-1.5">
                    {d.phone_label || 'Numéro de téléphone mobile pour le paiement *'}
                  </label>
                  <input
                    type="tel"
                    id="phoneLocal"
                    required
                    value={phoneLocal}
                    onChange={(e) => setPhoneLocal(e.target.value)}
                    placeholder={d.phone_placeholder || 'ex: 77 123 45 67'}
                    className="w-full rounded-lg border border-surface-border bg-background px-4 py-3 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                  />
                  <p className="text-xs text-foreground-muted mt-2">
                    Compatible Wave et Orange Money via Maketou (avec bascule automatique sur Chariow en cas d&apos;indisponibilité).
                  </p>
                </div>
              )}

              {(paymentMethod === 'carte' || paymentMethod === 'mobile_money') && (
                <p className="mb-8 text-sm text-foreground-muted">
                  {d.redirect_notice_prefix} {paymentMethod === 'carte' ? d.redirect_notice_card : 'la plateforme de paiement mobile sécurisée'}.
                </p>
              )}

              <button
                type="submit"
                disabled={isProcessing || !paymentMethod}
                className="w-full bg-primary text-white font-bold py-4 px-8 rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>{d.processing}</>
                ) : !isLoggedIn ? (
                  <>{d.create_account_btn}</>
                ) : (
                  <>{d.pay_prefix} {enDollars ? priceToPay : `${priceToPay.split(' ')[0]} FCFA`}</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
