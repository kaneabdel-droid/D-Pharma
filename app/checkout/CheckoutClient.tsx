'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, Smartphone, Banknote, ArrowLeft, Clock, Building2, Phone } from 'lucide-react'
import { initiateSubscriptionPayment, type MoyenPaiement } from './actions'
import { montantUsd } from '@/lib/payments/dollars'

export default function CheckoutClient({
  initialPlan,
  isLoggedIn,
  currentTier,
  isUpgrade,
  enDollars = false,
  pharmacieNom = 'Ma Pharmacie',
  telephoneDefaut = '',
  hasOnlinePayment,
  dict,
  locale,
}: {
  initialPlan: string
  isLoggedIn: boolean
  currentTier: string
  isUpgrade: boolean
  /** Officine d'un autre pays (devise « sans unité ») : paiement par carte en dollars US uniquement. */
  enDollars?: boolean
  pharmacieNom?: string
  telephoneDefaut?: string
  hasOnlinePayment: { mobileMoney: boolean; carte: boolean; chariow: boolean; maketou: boolean }
  dict: any
  locale: string
}) {
  const d = dict.checkout_extra || {}
  const localeCode = locale === 'fr' ? 'fr-FR' : 'en-US'

  const availableMethods: MoyenPaiement[] = enDollars
    ? hasOnlinePayment.carte ? ['carte'] : []
    : [
        'mobile_money',
        ...(hasOnlinePayment.carte ? (['carte'] as const) : []),
        'virement',
      ]

  const router = useRouter()
  // Maketou par défaut via Mobile Money
  const [paymentMethod, setPaymentMethod] = useState<MoyenPaiement>('mobile_money')
  const [phoneLocal, setPhoneLocal] = useState(telephoneDefaut)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [virementPending, setVirementPending] = useState(false)

  // Seules les 2 formules annuelles existent
  const plans: Record<string, { name: string; price: string; value: number }> = {
    pharmacie: { name: 'Pharmacie (Officine)', price: '75.000 FCFA / an', value: 75000 },
    fournisseur: { name: 'Fournisseur / Laboratoire', price: '50.000 FCFA / an', value: 50000 },
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
      router.push(`/signup?plan=${initialPlan}`)
      return
    }

    setError(null)
    setIsProcessing(true)

    if ((paymentMethod === 'mobile_money' || paymentMethod === 'chariow' || paymentMethod === 'maketou') && !phoneLocal.trim()) {
      setError(d.phone_required_error || 'Veuillez saisir le numéro de téléphone mobile du payeur.')
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
          <h2 className="text-2xl font-bold font-heading mb-2">{d.virement_saved_title || 'Demande de virement enregistrée'}</h2>
          <p className="text-foreground-muted mb-6">
            {d.virement_saved_desc || 'Effectuez votre virement avec la référence de paiement transmise. Votre abonnement sera activé dès réception.'}
          </p>
          <Link href="/abonnement" className="text-primary font-semibold hover:text-primary-hover">
            {d.back_to_subscription || 'Retour à mon abonnement'}
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
            <ArrowLeft className="w-4 h-4" /> {d.back_offers || 'Retour aux tarifs'}
          </Link>
        </div>

        <div className="bg-background border border-surface-border rounded-3xl overflow-hidden shadow-lg flex flex-col md:flex-row">

          {/* Récapitulatif de commande */}
          <div className="bg-primary/5 p-8 md:w-1/3 border-b md:border-b-0 md:border-r border-surface-border">
            <h2 className="text-xl font-bold font-heading mb-6">{d.order_summary || 'Récapitulatif'}</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-foreground-muted font-medium uppercase tracking-wider mb-1">
                  Entreprise
                </p>
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Building2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">{pharmacieNom}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-surface-border">
                <p className="text-xs text-foreground-muted font-medium uppercase tracking-wider mb-1">
                  {d.subscription || 'Formule Annuelle'}
                </p>
                <p className="font-bold text-foreground text-base">{selectedPlan.name}</p>
              </div>

              <div className="pt-4 border-t border-surface-border">
                <p className="text-xs text-foreground-muted mb-1 uppercase tracking-wider font-medium">
                  {d.total_ttc || 'Montant Total'}
                </p>
                <p className="text-2xl font-black text-primary">{priceToPay}</p>
              </div>
            </div>
          </div>

          {/* Formulaire de paiement */}
          <div className="p-8 md:w-2/3">
            <h2 className="text-xl font-bold font-heading mb-6">
              {d.payment_method || 'Mode de règlement'}
            </h2>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-medium">
                {error}
              </div>
            )}

            {enDollars && (
              <p className="mb-6 text-sm bg-surface border border-surface-border p-3 rounded-xl">
                {availableMethods.length > 0 ? d.usd_card_only : d.card_unavailable}
              </p>
            )}

            <form onSubmit={handlePayment} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {!enDollars && (
                  <label className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'mobile_money' ? 'border-primary bg-primary/5 shadow-md' : 'border-surface-border bg-surface hover:bg-black/5'}`}>
                    <input type="radio" name="paymentMethod" value="mobile_money" checked={paymentMethod === 'mobile_money'} onChange={() => setPaymentMethod('mobile_money')} className="sr-only" />
                    <Smartphone className={`w-8 h-8 mb-2 ${paymentMethod === 'mobile_money' ? 'text-primary' : 'text-foreground-muted'}`} />
                    <span className={`font-bold text-center text-sm ${paymentMethod === 'mobile_money' ? 'text-primary' : 'text-foreground'}`}>
                      Mobile Money
                    </span>
                    <span className="text-[11px] text-foreground-muted mt-0.5 text-center">
                      Wave & Orange Money (Maketou / Chariow)
                    </span>
                  </label>
                )}

                {hasOnlinePayment.carte && (
                  <label className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'carte' ? 'border-primary bg-primary/5 shadow-md' : 'border-surface-border bg-surface hover:bg-black/5'}`}>
                    <input type="radio" name="paymentMethod" value="carte" checked={paymentMethod === 'carte'} onChange={() => setPaymentMethod('carte')} className="sr-only" />
                    <CreditCard className={`w-8 h-8 mb-2 ${paymentMethod === 'carte' ? 'text-primary' : 'text-foreground-muted'}`} />
                    <span className={`font-bold text-sm ${paymentMethod === 'carte' ? 'text-primary' : 'text-foreground'}`}>{d.card || 'Carte Bancaire'}</span>
                    <span className="text-[11px] text-foreground-muted mt-0.5">Visa, Mastercard</span>
                  </label>
                )}

                {!enDollars && (
                  <label className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'virement' ? 'border-primary bg-primary/5 shadow-md' : 'border-surface-border bg-surface hover:bg-black/5'}`}>
                    <input type="radio" name="paymentMethod" value="virement" checked={paymentMethod === 'virement'} onChange={() => setPaymentMethod('virement')} className="sr-only" />
                    <Banknote className={`w-8 h-8 mb-2 ${paymentMethod === 'virement' ? 'text-primary' : 'text-foreground-muted'}`} />
                    <span className={`font-bold text-sm ${paymentMethod === 'virement' ? 'text-primary' : 'text-foreground'}`}>{d.transfer || 'Virement bancaire'}</span>
                    <span className="text-[11px] text-foreground-muted mt-0.5">Virement direct</span>
                  </label>
                )}
              </div>

              {paymentMethod === 'virement' && (
                <div className="bg-surface p-4 rounded-2xl border border-surface-border">
                  <p className="text-xs text-foreground-muted mb-2">{d.transfer_instructions || 'Effectuez votre virement vers le compte bancaire suivant :'}</p>
                  <p className="font-mono font-bold text-sm">SN048 08002 01057183001 43</p>
                  <p className="text-xs text-foreground-muted mt-2">{d.transfer_note || 'Indiquez le nom de votre pharmacie en référence du virement.'}</p>
                </div>
              )}

              {paymentMethod === 'mobile_money' && (
                <div className="bg-surface/60 border border-surface-border p-4 rounded-2xl space-y-2">
                  <label htmlFor="phoneLocal" className="block text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    Téléphone du payeur (Wave / Orange Money) *
                  </label>
                  <input
                    type="tel"
                    id="phoneLocal"
                    required
                    value={phoneLocal}
                    onChange={(e) => setPhoneLocal(e.target.value)}
                    placeholder="ex: 77 123 45 67 ou 78 987 65 43"
                    className="w-full rounded-xl border border-surface-border bg-background px-4 py-2.5 text-foreground font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                  />
                  <p className="text-[11px] text-foreground-muted">
                    Paiement direct sécurisé via Maketou (avec bascule automatique sur Chariow en secours).
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing || !paymentMethod}
                className="w-full bg-primary text-white font-bold py-3.5 px-6 rounded-xl hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <span>Traitement en cours...</span>
                ) : !isLoggedIn ? (
                  <span>Créer mon compte pour payer</span>
                ) : (
                  <span>Payer {priceToPay}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
