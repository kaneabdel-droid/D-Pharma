import { getEcritures, getPlanComptable } from './actions'
import NouvelleEcritureModal from './NouvelleEcritureModal'
import PrintSectionButton from '@/components/PrintSectionButton'
import Link from 'next/link'
import { FileText, ArrowDownRight, ArrowUpRight, CheckCircle2, Filter, AlertCircle } from 'lucide-react'

export default async function ComptabilitePage(props: {
  searchParams: Promise<{ journal?: string }>
}) {
  const searchParams = await props.searchParams
  const selectedJournal = searchParams.journal || 'tous'

  const [{ ecritures, error }, { plan }] = await Promise.all([
    getEcritures(selectedJournal),
    getPlanComptable(),
  ])

  // Statistiques globales du journal
  const totalDebits = ecritures.reduce((acc, ec) => {
    return acc + (ec.lignes_ecritures_comptables || []).reduce((s: number, l: any) => s + Number(l.debit || 0), 0)
  }, 0)

  const totalCredits = ecritures.reduce((acc, ec) => {
    return acc + (ec.lignes_ecritures_comptables || []).reduce((s: number, l: any) => s + Number(l.credit || 0), 0)
  }, 0)

  const formatCFA = (val: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(val) + ' FCFA'

  const journalLabels: Record<string, string> = {
    ventes: 'Ventes (Recettes)',
    achats: 'Achats (Fournisseurs)',
    caisse: 'Caisse Principale',
    banque: 'Banque & Virement',
    od: 'Opérations Diverses',
  }

  return (
    <div className="space-y-6">
      {/* Barre d'action supérieure */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold font-heading text-foreground">
            Livre-Journal des Écritures
          </h2>
          <p className="text-xs text-foreground-muted">
            Historique exhaustif de tous les mouvements comptables de la pharmacie selon les normes SYSCOHADA.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PrintSectionButton sectionId="journal-comptable-print" label="Imprimer le Journal" />
          <NouvelleEcritureModal plan={plan || []} />
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <span className="text-xs text-foreground-muted font-medium">Nombre d&apos;Écritures</span>
          <p className="text-2xl font-bold text-foreground mt-1">{ecritures.length}</p>
          <span className="text-[11px] text-foreground-muted">Toutes pièces comptables enregistrées</span>
        </div>
        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <span className="text-xs text-foreground-muted font-medium">Total Débits Période</span>
          <p className="text-2xl font-bold text-primary mt-1">{formatCFA(totalDebits)}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Flux d&apos;emplois / charges / trésorerie</span>
        </div>
        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <span className="text-xs text-foreground-muted font-medium">Total Crédits Période</span>
          <p className="text-2xl font-bold text-secondary mt-1">{formatCFA(totalCredits)}</p>
          <span className="text-[11px] text-emerald-600 font-medium">
            {totalDebits === totalCredits ? '✓ Équilibre parfait débit / crédit' : '⚠ Différence constatée'}
          </span>
        </div>
      </div>

      {/* Filtres par Journal */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-foreground-muted mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Journal :
        </span>
        {[
          { id: 'tous', label: 'Tous les journaux' },
          { id: 'ventes', label: 'Ventes' },
          { id: 'achats', label: 'Achats' },
          { id: 'caisse', label: 'Caisse' },
          { id: 'banque', label: 'Banque' },
          { id: 'od', label: 'Opérations Diverses' },
        ].map((j) => {
          const isActive = selectedJournal === j.id
          return (
            <Link
              key={j.id}
              href={`/comptabilite?journal=${j.id}`}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface text-foreground-muted hover:text-foreground border border-surface-border'
              }`}
            >
              {j.label}
            </Link>
          )
        })}
      </div>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Erreur de chargement : {error}</span>
        </div>
      )}

      {/* Tableau du Journal */}
      <div id="journal-comptable-print" className="bg-surface border border-surface-border rounded-2xl shadow-sm overflow-hidden">
        {ecritures.length === 0 ? (
          <div className="p-12 text-center text-foreground-muted">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
            <p className="text-base font-semibold text-foreground">Aucune écriture comptable trouvée</p>
            <p className="text-xs text-foreground-muted mt-1 max-w-sm mx-auto">
              Utilisez le bouton &quot;Saisir une Écriture&quot; pour enregistrer votre première opération comptable en partie double.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-surface-border/40 text-foreground-muted text-[11px] uppercase tracking-wider border-b border-surface-border">
                <tr>
                  <th className="py-3 px-4 w-28 whitespace-nowrap">Date</th>
                  <th className="py-3 px-4 w-28 whitespace-nowrap">Journal</th>
                  <th className="py-3 px-4 w-40 whitespace-nowrap">Réf / Pièce</th>
                  <th className="py-3 px-4 w-24 whitespace-nowrap">Compte</th>
                  <th className="py-3 px-4 min-w-[240px]">Libellé de l&apos;Écriture</th>
                  <th className="py-3 px-4 text-right w-36 whitespace-nowrap">Débit</th>
                  <th className="py-3 px-4 text-right w-36 whitespace-nowrap">Crédit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {ecritures.map((ec: any) => {
                  const lignes = ec.lignes_ecritures_comptables || []

                  if (lignes.length === 0) {
                    return (
                      <tr key={ec.id} className="hover:bg-surface-border/20 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs text-foreground font-medium align-top whitespace-nowrap">
                          {ec.date_ecriture}
                        </td>
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-primary/10 text-primary">
                            {journalLabels[ec.journal] || ec.journal}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-foreground-muted align-top whitespace-nowrap">
                          {ec.numero_piece || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-foreground-muted align-top">—</td>
                        <td className="py-3.5 px-4 text-xs text-foreground font-medium align-top">
                          {ec.libelle}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-right font-mono text-foreground-muted align-top">—</td>
                        <td className="py-3.5 px-4 text-xs text-right font-mono text-foreground-muted align-top">—</td>
                      </tr>
                    )
                  }

                  // Ordonner les lignes : Débits d'abord, puis Crédits (norme SYSCOHADA)
                  const lignesTriees = [...lignes].sort((a: any, b: any) => {
                    const debitA = Number(a.debit) || 0
                    const debitB = Number(b.debit) || 0
                    if (debitA > 0 && debitB === 0) return -1
                    if (debitA === 0 && debitB > 0) return 1
                    return 0
                  })

                  return lignesTriees.map((l: any, idx: number) => {
                    const isFirst = idx === 0

                    return (
                      <tr
                        key={l.id || `${ec.id}-${idx}`}
                        className={`hover:bg-surface-border/20 transition-colors ${
                          isFirst ? 'border-t-2 border-surface-border bg-surface' : 'bg-surface/40'
                        }`}
                      >
                        {/* Spanning des métadonnées de la pièce sur toutes ses lignes */}
                        {isFirst && (
                          <>
                            <td
                              rowSpan={lignesTriees.length}
                              className="py-3.5 px-4 font-mono text-xs text-foreground font-medium align-top whitespace-nowrap border-r border-surface-border/50 bg-background/30"
                            >
                              {ec.date_ecriture}
                            </td>
                            <td
                              rowSpan={lignesTriees.length}
                              className="py-3.5 px-4 align-top whitespace-nowrap border-r border-surface-border/50 bg-background/30"
                            >
                              <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-primary/10 text-primary">
                                {journalLabels[ec.journal] || ec.journal}
                              </span>
                            </td>
                            <td
                              rowSpan={lignesTriees.length}
                              className="py-3.5 px-4 font-mono text-xs align-top border-r border-surface-border/50 bg-background/30"
                            >
                              <span className="font-bold text-foreground block">{ec.numero_piece || '—'}</span>
                              {ec.libelle && (
                                <span className="block text-[11px] text-foreground-muted mt-1 leading-snug break-words max-w-[170px]" title={ec.libelle}>
                                  {ec.libelle}
                                </span>
                              )}
                            </td>
                          </>
                        )}

                        {/* Compte individuel */}
                        <td className="py-3 px-4 font-mono text-xs align-top whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-border/60 text-foreground font-bold font-mono text-[11px]">
                            {l.compte}
                          </span>
                        </td>

                        {/* Libellé du mouvement */}
                        <td className="py-3 px-4 text-xs align-top">
                          <span className="text-foreground font-medium block">
                            {l.libelle || ec.libelle}
                          </span>
                        </td>

                        {/* Montant Débit */}
                        <td className="py-3 px-4 text-right font-mono text-xs font-bold text-primary align-top whitespace-nowrap">
                          {Number(l.debit) > 0 ? formatCFA(Number(l.debit)) : '—'}
                        </td>

                        {/* Montant Crédit */}
                        <td className="py-3 px-4 text-right font-mono text-xs font-bold text-secondary align-top whitespace-nowrap">
                          {Number(l.credit) > 0 ? formatCFA(Number(l.credit)) : '—'}
                        </td>
                      </tr>
                    )
                  })
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
