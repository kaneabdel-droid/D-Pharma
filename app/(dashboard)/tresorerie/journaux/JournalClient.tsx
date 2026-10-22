'use client'

import { useState, useEffect, useCallback } from 'react'
import { getJournal } from '../actions'
import AddTransactionModal from './AddTransactionModal'
import TransactionRowActions from './TransactionRowActions'
import PrintSectionButton from '@/components/PrintSectionButton'
import AddCompteModal from '../AddCompteModal'
import { Wallet, Landmark, BookOpen, Layers } from 'lucide-react'

export default function JournalClient({ 
  comptes, 
  imputations, 
  dict, 
  locale, 
  gieName 
}: { 
  comptes: any[], 
  imputations: any[], 
  dict: any, 
  locale: string, 
  gieName: string 
}) {
  const [comptesList, setComptesList] = useState<any[]>(comptes || [])
  const [selectedCompte, setSelectedCompte] = useState<string>('tous')
  const [journal, setJournal] = useState<any[]>([])
  const [soldeInitial, setSoldeInitial] = useState(0)
  const [compteNom, setCompteNom] = useState('Tous les journaux')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const t = dict.tresorerie_pages.journaux
  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-US'
  const imputationParId = new Map(imputations.map((imp) => [imp.id, imp.libelle]))

  // Synchroniser comptesList si les props changent
  useEffect(() => {
    if (comptes && comptes.length > 0) {
      setComptesList(comptes)
    }
  }, [comptes])

  const fetchJournal = useCallback(async () => {
    setLoading(true)
    const res = await getJournal(selectedCompte)
    setLoading(false)
    if (res?.error) {
      setError(res.error)
    } else {
      setError('')
      setJournal(res.journal || [])
      setSoldeInitial(res.soldeInitial || 0)
      if (res.compteNom) setCompteNom(res.compteNom)
    }
  }, [selectedCompte])

  useEffect(() => {
    fetchJournal()
  }, [fetchJournal])

  const handleCompteCreated = (newCompte: any) => {
    if (newCompte) {
      setComptesList((prev) => {
        const exists = prev.some((c) => c.id === newCompte.id)
        if (exists) return prev
        return [...prev, { ...newCompte, type_compte: newCompte.type_compte || newCompte.type, solde_courant: newCompte.solde }]
      })
      setSelectedCompte(newCompte.id)
    }
  }

  const isTous = selectedCompte === 'tous'

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-end sm:justify-between sm:gap-4 flex-wrap gap-y-4">
        <div className="max-w-md w-full">
          <label htmlFor="compte" className="block text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            {t.select_account || 'Journal de trésorerie'}
          </label>
          <select
            id="compte"
            value={selectedCompte}
            onChange={(e) => setSelectedCompte(e.target.value)}
            className="block w-full rounded-xl border border-surface-border bg-background px-3.5 py-2.5 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm font-medium"
          >
            <option value="tous">📚 Tous les journaux (Vue globale consolidée)</option>
            <optgroup label="Journaux & Comptes individuels">
              {comptesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} ({c.type_compte || c.type || 'compte'})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <PrintSectionButton sectionId="journal-print" label={dict.common.print} />
          
          <AddCompteModal 
            dict={dict} 
            buttonLabel="+ Nouveau Journal" 
            onSuccess={handleCompteCreated} 
          />

          <AddTransactionModal 
            compteId={isTous ? (comptesList[0]?.id || '') : selectedCompte} 
            comptes={comptesList}
            imputations={imputations} 
            onSuccess={(newCompteId) => {
              if (newCompteId && newCompteId !== selectedCompte && !isTous) {
                setSelectedCompte(newCompteId)
              } else {
                fetchJournal()
              }
            }} 
            dict={dict} 
          />
        </div>
      </div>

      {loading && <div className="text-foreground-muted animate-pulse py-4">{t.loading}</div>}
      {error && <div className="p-4 bg-danger/10 text-danger rounded-xl border border-danger/20 text-sm">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-2xl border border-surface-border bg-surface shadow-sm" id="journal-print">
          <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold text-foreground font-heading">{gieName}</h2>
              <p className="text-xs text-foreground-muted flex items-center gap-1.5 mt-0.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>{compteNom}</span>
                <span className="text-surface-border">•</span>
                <span>{journal.length} opération(s) enregistrée(s)</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-foreground-muted block font-medium">Solde initial</span>
              <span className="text-sm font-bold text-foreground font-mono">
                {Number(soldeInitial).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} FCFA
              </span>
            </div>
          </div>

          <table className="min-w-full divide-y divide-surface-border">
            <thead className="bg-background/70 text-[11px] uppercase tracking-wider text-foreground-muted font-semibold">
              <tr>
                <th scope="col" className="px-5 py-3 text-left">{dict.common.date}</th>
                <th scope="col" className="px-5 py-3 text-left">Journal</th>
                <th scope="col" className="px-5 py-3 text-left">{t.headers.reason}</th>
                <th scope="col" className="px-5 py-3 text-left">{t.headers.imputation}</th>
                <th scope="col" className="px-5 py-3 text-right text-success">{t.headers.in}</th>
                <th scope="col" className="px-5 py-3 text-right text-danger">{t.headers.out}</th>
                <th scope="col" className="px-5 py-3 text-right">{t.headers.balance}</th>
                <th scope="col" className="relative px-5 py-3">
                  <span className="sr-only">{t.headers.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-surface text-sm">
              {journal.map((ligne, idx) => (
                <tr key={ligne.id || idx} className="hover:bg-surface-hover transition-colors">
                  <td className="whitespace-nowrap px-5 py-3.5 text-foreground font-mono text-xs">
                    {new Date(ligne.created_at).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary">
                      {ligne.compte_type === 'banque' ? <Landmark className="w-3 h-3" /> : <Wallet className="w-3 h-3" />}
                      {ligne.compte_nom || 'Journal'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-foreground font-medium">
                    {ligne.motif}
                    {ligne.type_piece && <span className="ml-2 text-xs text-secondary font-mono">[{ligne.type_piece}]</span>}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-foreground-muted text-xs">
                    {ligne.imputation_id ? (imputationParId.get(ligne.imputation_id) || '—') : '—'}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right text-success font-semibold font-mono">
                    {ligne.entree ? `+${ligne.entree.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}` : '—'}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right text-danger font-semibold font-mono">
                    {ligne.sortie ? `-${ligne.sortie.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}` : '—'}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right text-foreground font-bold font-mono bg-background/40">
                    {Number(ligne.solde).toLocaleString(dateLocale, { maximumFractionDigits: 0 })}
                  </td>
                  <td className="relative whitespace-nowrap px-5 py-3.5 text-right font-medium">
                    <TransactionRowActions transaction={ligne} imputations={imputations} onSuccess={fetchJournal} dict={dict} />
                  </td>
                </tr>
              ))}

              {journal.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-foreground-muted">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30 text-primary" />
                    <p className="font-semibold text-foreground text-sm">Aucune opération pour ce journal</p>
                    <p className="text-xs text-foreground-muted mt-1">
                      Solde initial disponible : {Number(soldeInitial).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} FCFA
                    </p>
                  </td>
                </tr>
              )}

              {/* Ligne récapitulative du solde initial */}
              <tr className="bg-background/80 font-medium">
                <td colSpan={6} className="px-5 py-3.5 text-sm text-foreground text-right italic">
                  {t.initial_balance} :
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-sm text-right text-foreground font-bold font-mono">
                  {Number(soldeInitial).toLocaleString(dateLocale, { maximumFractionDigits: 0 })}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
