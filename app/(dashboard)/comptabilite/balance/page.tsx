import { getBalance } from '../actions'
import { Scale, CheckCircle2, AlertTriangle, ArrowDownRight, ArrowUpRight } from 'lucide-react'

export default async function BalancePage() {
  const { balance, totaux, error } = await getBalance()

  const formatCFA = (val: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(val) + ' FCFA'

  const isEquilibree = Math.abs((totaux?.debit || 0) - (totaux?.credit || 0)) < 0.01

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold font-heading text-foreground">
            Balance Générale des Comptes
          </h2>
          <p className="text-xs text-foreground-muted">
            Synthèse globale des mouvements cumulés et des soldes de l&apos;officine (Grand Livre / Balance).
          </p>
        </div>

        <div
          className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl border ${
            isEquilibree
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
          }`}
        >
          {isEquilibree ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Balance Équilibrée (Débit = Crédit)</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Déséquilibre détecté</span>
            </>
          )}
        </div>
      </div>

      {/* Cartes Totaux */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <span className="text-xs text-foreground-muted font-medium">Cumul Mouvements Débit</span>
          <p className="text-xl font-bold text-primary mt-1">{formatCFA(totaux?.debit || 0)}</p>
        </div>
        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <span className="text-xs text-foreground-muted font-medium">Cumul Mouvements Crédit</span>
          <p className="text-xl font-bold text-secondary mt-1">{formatCFA(totaux?.credit || 0)}</p>
        </div>
        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <span className="text-xs text-foreground-muted font-medium">Total Soldes Débiteurs</span>
          <p className="text-xl font-bold text-emerald-600 mt-1">{formatCFA(totaux?.soldeDebiteur || 0)}</p>
          <span className="text-[11px] text-foreground-muted">Actifs & Charges</span>
        </div>
        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <span className="text-xs text-foreground-muted font-medium">Total Soldes Créditeurs</span>
          <p className="text-xl font-bold text-indigo-600 mt-1">{formatCFA(totaux?.soldeCrediteur || 0)}</p>
          <span className="text-[11px] text-foreground-muted">Passifs & Produits</span>
        </div>
      </div>

      {/* Tableau Balance */}
      <div className="bg-surface border border-surface-border rounded-2xl shadow-sm overflow-hidden">
        {(!balance || balance.length === 0) ? (
          <div className="p-12 text-center text-foreground-muted">
            <Scale className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
            <p className="text-base font-semibold text-foreground">Aucun mouvement comptable</p>
            <p className="text-xs text-foreground-muted mt-1">
              La balance se remplira automatiquement à partir des écritures enregistrées dans le journal.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-border/40 text-foreground-muted text-[11px] uppercase tracking-wider border-b border-surface-border">
                <tr>
                  <th className="py-3 px-4">N° Compte</th>
                  <th className="py-3 px-4">Intitulé du Compte</th>
                  <th className="py-3 px-4 text-right">Mouvement Débit</th>
                  <th className="py-3 px-4 text-right">Mouvement Crédit</th>
                  <th className="py-3 px-4 text-right">Solde Débiteur</th>
                  <th className="py-3 px-4 text-right">Solde Créditeur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50">
                {balance.map((item) => (
                  <tr key={item.compte} className="hover:bg-surface-border/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-xs text-foreground whitespace-nowrap">
                      {item.compte}
                    </td>
                    <td className="py-3 px-4 text-foreground font-medium">
                      {item.libelle}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-right text-foreground-muted">
                      {item.debit > 0 ? formatCFA(item.debit) : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-right text-foreground-muted">
                      {item.credit > 0 ? formatCFA(item.credit) : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-right font-semibold text-emerald-600">
                      {item.soldeDebiteur > 0 ? formatCFA(item.soldeDebiteur) : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-right font-semibold text-indigo-600">
                      {item.soldeCrediteur > 0 ? formatCFA(item.soldeCrediteur) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-border/60 border-t-2 border-surface-border font-bold text-xs">
                <tr>
                  <td colSpan={2} className="py-3.5 px-4 text-foreground uppercase tracking-wider">
                    Totaux Généraux
                  </td>
                  <td className="py-3.5 px-4 font-mono text-right text-primary">
                    {formatCFA(totaux?.debit || 0)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-right text-secondary">
                    {formatCFA(totaux?.credit || 0)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-right text-emerald-600">
                    {formatCFA(totaux?.soldeDebiteur || 0)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-right text-indigo-600">
                    {formatCFA(totaux?.soldeCrediteur || 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
