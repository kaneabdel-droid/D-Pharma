'use client'

import { useState, useMemo } from 'react'
import { Layers, ShieldCheck, Search, CheckCircle2, Bookmark } from 'lucide-react'

export type CompteComptable = {
  id?: string
  compte: string
  libelle: string
  classe: number
  type?: string
  description?: string
  actif?: boolean
}

export default function PlanComptableClient({ 
  initialPlan = [] 
}: { 
  initialPlan: CompteComptable[] 
}) {
  const [selectedClasse, setSelectedClasse] = useState<number | 'tous'>('tous')
  const [search, setSearch] = useState('')

  const classesLabels: Record<number, { title: string; subtitle: string; color: string; badge: string }> = {
    1: { 
      title: 'Classe 1 : Capitaux et Ressources Durables', 
      subtitle: 'Capital, réserves, résultat net, emprunts & dettes à long terme',
      color: 'text-indigo-600 dark:text-indigo-400',
      badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
    },
    2: { 
      title: 'Classe 2 : Actif Immobilisé', 
      subtitle: 'Fonds commercial d\'officine, agencements, matériel informatique & automates',
      color: 'text-sky-600 dark:text-sky-400',
      badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
    },
    3: { 
      title: 'Classe 3 : Stocks et En-cours', 
      subtitle: 'Médicaments éthiques & génériques, parapharmacie, orthopédie & dépréciations',
      color: 'text-emerald-600 dark:text-emerald-400',
      badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    },
    4: { 
      title: 'Classe 4 : Comptes de Tiers', 
      subtitle: 'Grossistes-répartiteurs, clients comptoir, mutuelles & organismes de tiers payant, TVA',
      color: 'text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    },
    5: { 
      title: 'Classe 5 : Comptes de Trésorerie', 
      subtitle: 'Caisses comptoir (571/572), comptes Mobile Money (551), banques locales (521)',
      color: 'text-cyan-600 dark:text-cyan-400',
      badge: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
    },
    6: { 
      title: 'Classe 6 : Comptes de Charges', 
      subtitle: 'Achats marchandises grossistes, loyer, salaires préparateurs, électricité chaîne du froid',
      color: 'text-rose-600 dark:text-rose-400',
      badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
    },
    7: { 
      title: 'Classe 7 : Comptes de Produits', 
      subtitle: 'Ventes médicaments ordonnance, parapharmacie, remises accordées & subventions',
      color: 'text-emerald-700 dark:text-emerald-300',
      badge: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 border-emerald-600/20'
    },
    8: { 
      title: 'Classe 8 : Comptes HAO & Éléments Extraordinaires', 
      subtitle: 'Cessions d\'actifs, charges et indemnités hors activités ordinaires',
      color: 'text-purple-600 dark:text-purple-400',
      badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    },
  }

  // Filtrage combiné recherche et classe
  const filteredPlan = useMemo(() => {
    return initialPlan.filter((p) => {
      if (selectedClasse !== 'tous' && p.classe !== selectedClasse) {
        return false
      }
      if (!search.trim()) return true
      const q = search.toLowerCase().trim()
      const matchCode = p.compte.toLowerCase().includes(q)
      const matchLibelle = p.libelle.toLowerCase().includes(q)
      const matchType = p.type?.toLowerCase().includes(q)
      return matchCode || matchLibelle || matchType
    })
  }, [initialPlan, selectedClasse, search])

  return (
    <div className="space-y-6">
      {/* En-tête officiel */}
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
          <span>Norme SYSCOHADA Conforme • 75 comptes officinaux</span>
        </div>
      </div>

      {/* Barre d'outils : Recherche instantanée et Filtres par classe */}
      <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-foreground-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par numéro de compte ou intitulé (ex: 551, Caisse, Grossiste)..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-surface-border bg-background text-foreground focus:ring-1 focus:ring-primary shadow-xs"
            />
          </div>

          <div className="text-xs text-foreground-muted font-medium self-end sm:self-center">
            {filteredPlan.length} compte{filteredPlan.length > 1 ? 's' : ''} affiché{filteredPlan.length > 1 ? 's' : ''}
          </div>
        </div>

        {/* Boutons de sélection rapide de classe */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-surface-border/60">
          <button
            type="button"
            onClick={() => setSelectedClasse('tous')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedClasse === 'tous'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-background text-foreground-muted hover:text-foreground border border-surface-border'
            }`}
          >
            Tous les comptes ({initialPlan.length})
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((cl) => {
            const isActive = selectedClasse === cl
            const count = initialPlan.filter((p) => p.classe === cl).length
            return (
              <button
                key={cl}
                type="button"
                onClick={() => setSelectedClasse(cl)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-background text-foreground-muted hover:text-foreground border border-surface-border'
                }`}
              >
                Classe {cl} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Liste des comptes regroupés par classe */}
      <div className="space-y-6">
        {[1, 2, 3, 4, 5, 6, 7, 8]
          .filter((cl) => selectedClasse === 'tous' || selectedClasse === cl)
          .map((cl) => {
            const items = filteredPlan.filter((p) => p.classe === cl)
            if (items.length === 0) return null
            const meta = classesLabels[cl] || { 
              title: `Classe ${cl}`, 
              subtitle: '', 
              color: 'text-foreground',
              badge: 'bg-surface text-foreground border-surface-border'
            }

            return (
              <div key={cl} className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-xs">
                {/* En-tête de la classe */}
                <div className="px-5 py-3.5 bg-surface-border/20 border-b border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm font-heading text-foreground">{meta.title}</h3>
                      {meta.subtitle && (
                        <p className="text-[11px] text-foreground-muted mt-0.5">{meta.subtitle}</p>
                      )}
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border self-start sm:self-center ${meta.badge}`}>
                    {items.length} compte{items.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Liste des comptes de cette classe */}
                <div className="divide-y divide-surface-border/50">
                  {items.map((item) => (
                    <div
                      key={item.compte}
                      className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-background/80 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-surface border border-surface-border text-foreground shadow-2xs min-w-[52px] text-center">
                          {item.compte}
                        </span>
                        <div>
                          <span className="text-xs sm:text-sm font-semibold text-foreground">
                            {item.libelle}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          item.type === 'actif'
                            ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                            : item.type === 'passif'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : item.type === 'charge'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        }`}>
                          {item.type || 'Compte'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

        {filteredPlan.length === 0 && (
          <div className="p-12 text-center bg-surface border border-surface-border rounded-2xl text-foreground-muted space-y-2">
            <Search className="w-8 h-8 mx-auto opacity-30 text-primary" />
            <p className="text-sm font-semibold">Aucun compte ne correspond à votre recherche.</p>
            <button
              type="button"
              onClick={() => { setSearch(''); setSelectedClasse('tous') }}
              className="text-xs text-primary font-bold hover:underline"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
