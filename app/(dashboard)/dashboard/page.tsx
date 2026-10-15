import { Activity, PackageOpen, Truck, Banknote, ArrowRight, TrendingUp, Award, AlertTriangle, ShieldCheck } from 'lucide-react'
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
    { data: stocksData },
    { data: lignesVenteData },
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
    // Évolution des stocks
    supabase.from('stocks_pharmacie').select('id, quantite, prix_vente, date_peremption, lot, medicaments(nom)'),
    // Meilleures ventes (lignes de vente)
    supabase.from('lignes_vente_pharmacie').select('quantite, prix_unitaire, medicament_id, medicaments(nom)').order('created_at', { ascending: false }).limit(200),
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

  // Calculs Évolution & Santé des stocks
  const allStocks = stocksData || []
  const valeurTotaleStock = allStocks.reduce((sum, s) => sum + (Number(s.quantite || 0) * Number(s.prix_vente || 0)), 0)
  const totalUnitesStock = allStocks.reduce((sum, s) => sum + Number(s.quantite || 0), 0)

  const limitDate90 = new Date()
  limitDate90.setDate(limitDate90.getDate() + 90)

  const ruptureStock = allStocks.filter(s => Number(s.quantite) <= 0).length
  const stockFaible = allStocks.filter(s => Number(s.quantite) > 0 && Number(s.quantite) < 10).length
  const stockNormal = allStocks.filter(s => Number(s.quantite) >= 10).length
  const peremptionProche = allStocks.filter(s => {
    if (!s.date_peremption || Number(s.quantite) <= 0) return false
    return new Date(s.date_peremption) <= limitDate90
  }).length

  const totalRefs = allStocks.length
  const pctNormal = totalRefs > 0 ? Math.round((stockNormal / totalRefs) * 100) : 100
  const pctFaible = totalRefs > 0 ? Math.round((stockFaible / totalRefs) * 100) : 0
  const pctRupture = totalRefs > 0 ? Math.round((ruptureStock / totalRefs) * 100) : 0

  // Calculs Meilleures Ventes
  const ventesParMedicament: Record<string, { nom: string; quantite: number; ca: number }> = {}
  if (lignesVenteData) {
    lignesVenteData.forEach((l: any) => {
      const nom = l.medicaments?.nom || 'Médicament'
      const key = l.medicament_id || nom
      if (!ventesParMedicament[key]) {
        ventesParMedicament[key] = { nom, quantite: 0, ca: 0 }
      }
      ventesParMedicament[key].quantite += Number(l.quantite || 0)
      ventesParMedicament[key].ca += Number(l.quantite || 0) * Number(l.prix_unitaire || 0)
    })
  }

  const topVentes = Object.values(ventesParMedicament)
    .sort((a, b) => b.quantite - a.quantite)
    .slice(0, 5)

  const maxVenteQte = topVentes.length > 0 ? Math.max(...topVentes.map(v => v.quantite)) : 1

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
      
      {/* 4 Indicateurs Clés */}
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

      {/* Évolution des Stocks & Meilleures Ventes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Widget 1 : Évolution & Santé des Stocks */}
        <div className="rounded-xl bg-surface border border-surface-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-surface-border bg-background/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-heading text-foreground">Évolution & État des Stocks</h3>
                <p className="text-xs text-foreground-muted">Santé globale de l&apos;officine et niveaux d&apos;alerte</p>
              </div>
            </div>
            <Link href="/pharmacie/stocks" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              Inventaire <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-6 space-y-6 flex-1 flex flex-col justify-between">
            {/* Chiffres Globaux du Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background rounded-xl p-4 border border-surface-border">
                <span className="text-xs font-medium text-foreground-muted block">Valeur marchande</span>
                <span className="text-2xl font-extrabold text-foreground mt-1 block">
                  {valeurTotaleStock.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {unite}
                </span>
                <span className="text-[11px] text-foreground-muted">{totalRefs} références enregistrées</span>
              </div>
              <div className="bg-background rounded-xl p-4 border border-surface-border">
                <span className="text-xs font-medium text-foreground-muted block">Unités en rayon</span>
                <span className="text-2xl font-extrabold text-primary mt-1 block">
                  {totalUnitesStock.toLocaleString('fr-FR')} <span className="text-xs font-normal text-foreground-muted">unités</span>
                </span>
                <span className="text-[11px] text-foreground-muted">Disponibles immédiatement</span>
              </div>
            </div>

            {/* Barre de répartition de la santé du stock */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold mb-2">
                <span className="text-foreground">Répartition de la couverture ({totalRefs} produits)</span>
                <span className="text-emerald-600 font-bold">{pctNormal}% en stock optimal</span>
              </div>
              <div className="w-full h-3.5 bg-surface-border rounded-full overflow-hidden flex shadow-inner">
                <div style={{ width: `${pctNormal}%` }} className="bg-emerald-500 transition-all duration-500" title={`Optimal: ${pctNormal}%`} />
                <div style={{ width: `${pctFaible}%` }} className="bg-amber-400 transition-all duration-500" title={`Faible: ${pctFaible}%`} />
                <div style={{ width: `${pctRupture}%` }} className="bg-rose-500 transition-all duration-500" title={`Rupture: ${pctRupture}%`} />
              </div>
              <div className="flex items-center gap-4 text-[11px] font-medium mt-2 text-foreground-muted">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Optimal ({stockNormal})</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Faible ({stockFaible})</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Rupture ({ruptureStock})</span>
              </div>
            </div>

            {/* Badges d'alertes péremptions & réapprovisionnement */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-surface-border/60">
              <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                peremptionProche > 0 ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400' : 'bg-background border-surface-border text-foreground-muted'
              }`}>
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold leading-tight">{peremptionProche} lot(s) à surveiller</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Péremption &lt; 90 jours</div>
                </div>
              </div>

              <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                stockFaible > 0 || ruptureStock > 0 ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400' : 'bg-background border-surface-border text-foreground-muted'
              }`}>
                <PackageOpen className="w-5 h-5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold leading-tight">{stockFaible + ruptureStock} alerte(s) réappro</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Stock critique ou épuisé</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Widget 2 : Meilleures Ventes (Top Médicaments) */}
        <div className="rounded-xl bg-surface border border-surface-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-surface-border bg-background/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-heading text-foreground">Palmarès des Meilleures Ventes</h3>
                <p className="text-xs text-foreground-muted">Médicaments et spécialités les plus délivrés</p>
              </div>
            </div>
            <Link href="/pharmacie/pos" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              Caisse POS <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            {topVentes.length === 0 ? (
              <div className="py-12 text-center text-foreground-muted">
                <Award className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Aucune vente enregistrée pour le moment.</p>
                <p className="text-xs mt-1">Les produits les plus demandés apparaîtront ici automatiquement.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topVentes.map((item, index) => {
                  const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`
                  const ratio = Math.max(8, Math.round((item.quantite / maxVenteQte) * 100))
                  return (
                    <div key={item.nom} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 text-center font-bold text-sm shrink-0">{medal}</span>
                          <span className="font-bold text-foreground truncate">{item.nom}</span>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <span className="font-extrabold text-foreground text-sm">{item.quantite} vendus</span>
                          <span className="text-xs text-foreground-muted block">
                            {item.ca.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {unite}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-surface-border rounded-full overflow-hidden shadow-inner">
                        <div 
                          style={{ width: `${ratio}%` }} 
                          className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-500" 
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between text-xs text-foreground-muted">
              <span>Classement calculé sur les sorties caisse</span>
              <Link href="/pharmacie/pos" className="font-semibold text-primary hover:underline">
                Nouvelle vente POS →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Dernières Ventes & Trésorerie Globale */}
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
