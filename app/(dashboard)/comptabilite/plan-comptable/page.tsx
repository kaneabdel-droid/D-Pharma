import { getPlanComptable } from '../actions'
import { BookOpen, Layers, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default async function PlanComptablePage(props: {
  searchParams: Promise<{ classe?: string }>
}) {
  const searchParams = await props.searchParams
  const selectedClasse = searchParams.classe ? parseInt(searchParams.classe, 10) : undefined

  const { plan, error } = await getPlanComptable()

  const classesLabels: Record<number, { title: string; color: string }> = {
    1: { title: 'Classe 1 : Ressources Durables (Capitaux, Emprunts)', color: 'text-indigo-500 bg-indigo-500/10' },
    2: { title: 'Classe 2 : Actif Immobilisé (Agencements officine, Matériel)', color: 'text-sky-500 bg-sky-500/10' },
    3: { title: 'Classe 3 : Stocks (Médicaments, Parapharmacie)', color: 'text-emerald-500 bg-emerald-500/10' },
    4: { title: 'Classe 4 : Tiers (Clients, Assurances, Grossistes)', color: 'text-amber-500 bg-amber-500/10' },
    5: { title: 'Classe 5 : Trésorerie (Caisse, Banques, Mobile Money)', color: 'text-cyan-500 bg-cyan-500/10' },
    6: { title: 'Classe 6 : Charges (Achats médicaments, Salaires, Loyer)', color: 'text-rose-500 bg-rose-500/10' },
    7: { title: 'Classe 7 : Produits (Ventes comptoir, Tiers payant)', color: 'text-emerald-600 bg-emerald-600/10' },
  }

  const filteredPlan = selectedClasse
    ? (plan || []).filter((p: any) => p.classe === selectedClasse)
    : plan || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold font-heading text-foreground">
            Plan Comptable SYSCOHADA Révisé - Spécialité Pharmacie
          </h2>
          <p className="text-xs text-foreground-muted">
            Nomenclature officielle des comptes adaptés à l&apos;officine pharmaceutique selon les normes OHADA.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
          <ShieldCheck className="w-4 h-4" />
          <span>Norme SYSCOHADA Conforme</span>
        </div>
      </div>

      {/* Filtres par classe */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/comptabilite/plan-comptable"
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            !selectedClasse
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface text-foreground-muted hover:text-foreground border border-surface-border'
          }`}
        >
          Tous les comptes ({plan?.length || 0})
        </Link>
        {[1, 2, 3, 4, 5, 6, 7].map((cl) => {
          const isActive = selectedClasse === cl
          const count = (plan || []).filter((p: any) => p.classe === cl).length
          return (
            <Link
              key={cl}
              href={`/comptabilite/plan-comptable?classe=${cl}`}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface text-foreground-muted hover:text-foreground border border-surface-border'
              }`}
            >
              Classe {cl} ({count})
            </Link>
          )
        })}
      </div>

      {/* Liste des comptes par classe */}
      <div className="space-y-6">
        {[1, 2, 3, 4, 5, 6, 7]
          .filter((cl) => !selectedClasse || selectedClasse === cl)
          .map((cl) => {
            const items = filteredPlan.filter((p: any) => p.classe === cl)
            if (items.length === 0) return null
            const meta = classesLabels[cl] || { title: `Classe ${cl}`, color: 'text-foreground' }

            return (
              <div key={cl} className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 bg-surface-border/30 border-b border-surface-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm text-foreground">{meta.title}</span>
                  </div>
                  <span className="text-xs font-semibold text-foreground-muted">
                    {items.length} compte{items.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="divide-y divide-surface-border/40">
                  {items.map((item: any) => (
                    <div
                      key={item.compte}
                      className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-surface-border/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-surface border border-surface-border text-foreground">
                          {item.compte}
                        </span>
                        <span className="text-sm font-medium text-foreground">{item.libelle}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-foreground-muted text-[11px] capitalize">
                          {item.type || 'Compte'}
                        </span>
                        {item.description && (
                          <span className="hidden md:inline text-foreground-muted text-[11px] max-w-xs truncate italic">
                            — {item.description}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
