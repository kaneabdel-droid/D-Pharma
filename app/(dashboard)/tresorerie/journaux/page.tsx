import { getComptes } from '../actions'
import { getImputations } from '../imputations/actions'
import JournalClient from './JournalClient'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'

export const dynamic = 'force-dynamic'

export default async function JournauxPage({
  searchParams,
}: {
  searchParams?: Promise<{ compteId?: string }>
}) {
  const resolvedParams = searchParams ? await searchParams : undefined
  const initialCompteId = resolvedParams?.compteId
  const { comptes, error } = await getComptes()
  const { imputations } = await getImputations()
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const tenant = await getTenantContext()
  const t = dict.tresorerie_pages.journaux

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-xl border border-danger/20 text-sm">Erreur: {error}</div>
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-bold font-heading leading-6 text-foreground">{t.title}</h3>
        <p className="mt-1 text-sm text-foreground-muted">
          {t.desc}
        </p>
      </div>

      <JournalClient 
        comptes={comptes || []} 
        imputations={imputations || []} 
        initialCompteId={initialCompteId}
        dict={dict} 
        locale={locale} 
        gieName={tenant?.gieName || 'Mon Officine'} 
      />
    </div>
  )
}
