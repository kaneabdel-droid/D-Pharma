import { Activity, PackageOpen, Truck, Banknote, ArrowRight } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'
import { uniteMontant } from '@/lib/currency'

export default async function Dashboard() {
  const unite = uniteMontant((await getTenantContext())?.devise)
  const supabase = await createClient()
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  
  // Date du jour pour filtrer les ventes
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()

  // On récupère les stats pertinentes pour la pharmacie
  const [
    { data: ventesJourData },
    { count: alertesStockCount },
    { count: commandesEnAttenteCount },
    { data: ventesRecentes },
    { data: comptes },
    { data: transactions },
  ] = await Promise.all([
    // Ventes du jour
    supabase.from('ventes_pharmacie').select('montant_total').gte('date_vente', todayStr),
    // Stock faible (exemple: quantité < 10)
    supabase.from('stocks_pharmacie').select('*', { count: 'exact', head: true }).lt('quantite', 10),
    // Commandes labo en attente
    supabase.from('commandes_labo').select('*', { count: 'exact', head: true }).neq('statut', 'complete'),
    // Activités récentes (Dernières ventes)
    supabase.from('ventes_pharmacie').select('id, montant_total, moyen_paiement, date_vente').order('date_vente', { ascending: false }).limit(4),
    // Aperçu financier (Trésorerie globale, partagée avec la logique existante)
    supabase.from('comptes').select('solde'),
    supabase.from('transactions').select('type_transaction, montant'),
  ])

  // Calcul du CA du jour
  const caJour = ventesJourData?.reduce((acc, v) => acc + (Number(v.montant_total) || 0), 0) || 0

  const soldeInitialTotal = comptes?.reduce((acc: number, c: any) => acc + (Number(c.solde || c.solde_initial) || 0), 0) || 0
  let totalEntrees = 0
  let totalSorties = 0
  
  if (transactions) {
    transactions.forEach(t => {
      if (t.type_transaction === 'entree') {
        totalEntrees += Number(t.montant)
      } else if (t.type_transaction === 'sortie') {
        totalSorties += Number(t.montant)
      }
    })
  }
  const soldeActuel = soldeInitialTotal + totalEntrees - totalSorties

  const stats = [
    { name: dict.dashboard.pharma_stats.sales_today, value: `${caJour.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}${unite}`, icon: Activity, desc: dict.dashboard.pharma_stats.sales_today_desc, color: 'text-blue-600', bg: 'bg-blue-100', link: '/pharmacie/pos' },
    { name: dict.dashboard.pharma_stats.low_stock, value: alertesStockCount || '0', icon: PackageOpen, desc: dict.dashboard.pharma_stats.low_stock_desc, color: 'text-red-600', bg: 'bg-red-100', link: '/pharmacie/stocks' },
    { name: dict.dashboard.pharma_stats.pending_orders, value: commandesEnAttenteCount || '0', icon: Truck, desc: dict.dashboard.pharma_stats.pending_orders_desc, color: 'text-orange-600', bg: 'bg-orange-100', link: '/pharmacie/commandes' },
    { name: dict.dashboard.finance.balance, value: `${soldeActuel.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}${unite}`, icon: Banknote, desc: 'Trésorerie Globale', color: 'text-emerald-600', bg: 'bg-emerald-100', link: '/tresorerie' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">{dict.dashboard.title}</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            {dict.dashboard.welcome}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.name}
            className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface p-6 shadow-sm border border-surface-border transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className={`rounded-lg p-3 ${item.bg}`}>
                <item.icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
              </div>
              {item.link && (
                <Link href={item.link} className="text-foreground-muted hover:text-primary transition-colors">
                  <ArrowRight className="h-5 w-5" />
                </Link>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-foreground-muted">{item.name}</p>
              {item.value !== null ? (
                <p className="mt-1 text-2xl font-semibold text-foreground break-words">{item.value}</p>
              ) : null}
            </div>
            <div className="mt-1">
              {item.desc && <span className="text-xs text-foreground-muted">{item.desc}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Dernières ventes */}
        <div className="rounded-xl bg-surface border border-surface-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-surface-border bg-background/50">
            <h3 className="text-lg font-semibold leading-6 text-foreground">{dict.dashboard.recent_sales.title}</h3>
          </div>
          <div className="p-6 flex-1 bg-surface">
            <div className="flow-root">
              <ul role="list" className="-mb-8">
                {ventesRecentes && ventesRecentes.length > 0 ? (
                  ventesRecentes.map((vente, idx) => (
                    <li key={vente.id} className="relative pb-8">
                      {idx !== ventesRecentes.length - 1 ? (
                        <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-surface-border" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-surface">
                            <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm text-foreground">
                              {dict.dashboard.recent_sales.sale_of} <span className="font-medium">{vente.id.substring(0, 8)}</span>
                              {' '}- <span className="font-semibold text-primary">{vente.montant_total.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}{unite}</span>
                            </p>
                            <p className="text-xs text-foreground-muted mt-0.5 capitalize">{vente.moyen_paiement}</p>
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-foreground-muted">
                            <time dateTime={vente.date_vente}>
                              {new Date(vente.date_vente).toLocaleTimeString(locale === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                            </time>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-foreground-muted text-center py-4">{dict.dashboard.recent_sales.empty}</li>
                )}
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-border">
              <Link href="/pharmacie/pos" className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1">
                {dict.dashboard.recent_sales.pos_link} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Trésorerie */}
        <div className="rounded-xl bg-surface border border-surface-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-surface-border bg-background/50 flex justify-between items-center">
            <h3 className="text-lg font-semibold leading-6 text-foreground">{dict.dashboard.finance.title}</h3>
            <Link href="/tresorerie" className="text-sm font-medium text-primary hover:text-primary/80">
              {dict.dashboard.finance.view_journal}
            </Link>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center bg-surface space-y-6">
            
            <div className="bg-background rounded-lg border border-surface-border p-5 text-center">
              <p className="text-sm font-medium text-foreground-muted mb-1">{dict.dashboard.finance.balance}</p>
              <p className={`text-3xl font-bold ${soldeActuel >= 0 ? 'text-foreground' : 'text-danger'}`}>
                {soldeActuel.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}{unite}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-success/10 border border-success/20 rounded-lg p-4 text-center">
                <p className="text-xs font-medium text-success mb-1">{dict.dashboard.finance.inflows}</p>
                <p className="text-lg font-bold text-success">
                  +{totalEntrees.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="bg-danger/10 border border-danger/20 rounded-lg p-4 text-center">
                <p className="text-xs font-medium text-danger mb-1">{dict.dashboard.finance.outflows}</p>
                <p className="text-lg font-bold text-danger">
                  -{totalSorties.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
