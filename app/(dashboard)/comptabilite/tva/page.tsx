import { getCalculDeclarationTVA, getHistoriqueDeclarationsTVA } from './actions'
import { getTenantContext } from '@/utils/supabase/tenant'
import { getDictionary, getLocale } from '@/dictionaries'
import DeclarationTVAClient from './DeclarationTVAClient'

export const dynamic = 'force-dynamic'

export default async function DeclarationTVAPage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string; annee?: string }>
}) {
  const { mois: moisParam, annee: anneeParam } = await searchParams
  const dateActuelle = new Date()
  const mois = moisParam ? parseInt(moisParam, 10) : dateActuelle.getMonth() + 1
  const annee = anneeParam ? parseInt(anneeParam, 10) : dateActuelle.getFullYear()

  const [tenant, { calcul }, { historique }, locale] = await Promise.all([
    getTenantContext(),
    getCalculDeclarationTVA(mois, annee),
    getHistoriqueDeclarationsTVA(),
    getLocale(),
  ])

  const dict = await getDictionary(locale)

  return (
    <DeclarationTVAClient
      calculInitial={calcul as any}
      pharmaNom={tenant?.gieName || 'Pharmacie'}
      historique={historique || []}
      dict={dict}
      locale={locale}
    />
  )
}
