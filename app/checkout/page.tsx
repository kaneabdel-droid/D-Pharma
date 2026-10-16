import { createClient } from '@/utils/supabase/server'
import CheckoutClient from './CheckoutClient'
import { redirect } from 'next/navigation'
import { hasBictorysKeys, hasMonerooKeys, hasChariowKeys, hasMaketouKeys } from '@/lib/payments/config'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string, upgrade?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const params = await searchParams
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  
  const rawPlan = params.plan || 'pharmacie'
  const plan = rawPlan === 'fournisseur' ? 'fournisseur' : 'pharmacie'
  const isUpgrade = params.upgrade === 'true'

  if (isUpgrade && !user) {
    redirect('/login')
  }

  // Visiteur sans compte : inscription d'abord avec le forfait choisi
  if (!user) {
    redirect(`/signup?plan=${encodeURIComponent(plan)}`)
  }

  let currentTier = 'pharmacie'
  let enDollars = false
  let pharmacieNom = 'Pharmacie'
  let telephoneDefaut = ''

  if (user) {
    const { data: userData } = await supabase
      .from('utilisateurs')
      .select('telephone, gies(nom, telephone, subscription_tier, devise)')
      .eq('id', user.id)
      .single()

    const gie = Array.isArray(userData?.gies) ? userData.gies[0] : userData?.gies
    if (gie) {
      currentTier = gie.subscription_tier || 'pharmacie'
      enDollars = gie.devise === 'AUCUNE'
      pharmacieNom = gie.nom || 'Pharmacie'
      telephoneDefaut = userData?.telephone || gie.telephone || ''
    }
  }

  return (
    <CheckoutClient
      initialPlan={plan}
      isLoggedIn={!!user}
      currentTier={currentTier}
      isUpgrade={isUpgrade}
      enDollars={enDollars}
      pharmacieNom={pharmacieNom}
      telephoneDefaut={telephoneDefaut}
      hasOnlinePayment={{ mobileMoney: hasBictorysKeys, carte: hasMonerooKeys, chariow: hasChariowKeys, maketou: hasMaketouKeys }}
      dict={dict}
      locale={locale}
    />
  )
}
