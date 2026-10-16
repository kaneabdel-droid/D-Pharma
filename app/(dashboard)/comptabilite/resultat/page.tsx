import { getResultatOfficinal } from '../actions'
import { BarChart3, TrendingUp, TrendingDown, DollarSign, PieChart, ShieldAlert } from 'lucide-react'

export default async function ResultatPage() {
  const {
    produits,
    charges,
    totalProduits,
    totalCharges,
    achatsMedicaments,
    margeBrute,
    resultatNet,
  } = await getResultatOfficinal()

  const formatCFA = (val: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(val) + ' FCFA'

  const tauxMarge = totalProduits > 0 ? ((margeBrute / totalProduits) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-heading text-foreground">
          Compte de Résultat de l&apos;Officine
        </h2>
        <p className="text-xs text-foreground-muted">
          Performance économique, marge brute commerciale sur médicaments et résultat net d&apos;exploitation.
        </p>
      </div>

      {/* Cartes KPI clés de l'officine */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <span className="text-xs text-foreground-muted font-medium">Chiffre d&apos;Affaires (Produits 7xx)</span>
          <p className="text-2xl font-bold text-foreground mt-1">{formatCFA(totalProduits)}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Ventes comptoir & tiers payant</span>
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <span className="text-xs text-foreground-muted font-medium">Achats Médicaments (601/602)</span>
          <p className="text-2xl font-bold text-amber-500 mt-1">{formatCFA(achatsMedicaments || 0)}</p>
          <span className="text-[11px] text-foreground-muted">Coût d&apos;achat des approvisionnements</span>
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <span className="text-xs text-foreground-muted font-medium">Marge Brute Officinale</span>
          <p className="text-2xl font-bold text-primary mt-1">{formatCFA(margeBrute)}</p>
          <span className="text-[11px] text-primary font-medium">Taux de marge : {tauxMarge}%</span>
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <span className="text-xs text-foreground-muted font-medium">Résultat Net Officinal</span>
          <p
            className={`text-2xl font-bold mt-1 ${
              resultatNet >= 0 ? 'text-emerald-600' : 'text-rose-500'
            }`}
          >
            {formatCFA(resultatNet)}
          </p>
          <span className="text-[11px] font-medium flex items-center gap-1">
            {resultatNet >= 0 ? (
              <>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Bénéfice net d&apos;exercice</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-rose-500">Perte nette</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Grille Produits vs Charges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PRODUITS (Classe 7) */}
        <div className="bg-surface border border-surface-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-emerald-500/10 border-b border-surface-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-foreground">Produits d&apos;Exploitation (Classe 7)</h3>
            </div>
            <span className="font-mono font-bold text-emerald-600 text-sm">{formatCFA(totalProduits)}</span>
          </div>

          {produits.length === 0 ? (
            <div className="p-8 text-center text-xs text-foreground-muted">
              Aucun produit d&apos;exploitation enregistré
            </div>
          ) : (
            <div className="divide-y divide-surface-border/40">
              {produits.map((p) => {
                const montant = p.credit - p.debit
                return (
                  <div key={p.compte} className="px-5 py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-foreground mr-2">{p.compte}</span>
                      <span className="text-foreground-muted">{p.libelle}</span>
                    </div>
                    <span className="font-mono font-semibold text-emerald-600">{formatCFA(montant)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* CHARGES (Classe 6) */}
        <div className="bg-surface border border-surface-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-rose-500/10 border-b border-surface-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-rose-500" />
              <h3 className="font-bold text-foreground">Charges d&apos;Exploitation (Classe 6)</h3>
            </div>
            <span className="font-mono font-bold text-rose-500 text-sm">{formatCFA(totalCharges)}</span>
          </div>

          {charges.length === 0 ? (
            <div className="p-8 text-center text-xs text-foreground-muted">
              Aucune charge d&apos;exploitation enregistrée
            </div>
          ) : (
            <div className="divide-y divide-surface-border/40">
              {charges.map((c) => {
                const montant = c.debit - c.credit
                return (
                  <div key={c.compte} className="px-5 py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-foreground mr-2">{c.compte}</span>
                      <span className="text-foreground-muted">{c.libelle}</span>
                    </div>
                    <span className="font-mono font-semibold text-rose-500">{formatCFA(montant)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
