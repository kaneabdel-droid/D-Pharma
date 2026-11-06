'use client'

import { useState } from 'react'
import { ArrowLeftRight, CheckCircle2, AlertTriangle, X, Wallet, Landmark } from 'lucide-react'
import { transfertFonds } from './actions'

export default function TransfertCaisseModal({ 
  comptes = [],
  defaultSourceId
}: { 
  comptes: any[]
  defaultSourceId?: string 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [sourceId, setSourceId] = useState(defaultSourceId || (comptes[0]?.id || ''))
  const [destId, setDestId] = useState(() => {
    const other = comptes.find(c => c.id !== (defaultSourceId || comptes[0]?.id))
    return other?.id || ''
  })
  const [montant, setMontant] = useState('')
  const [motif, setMotif] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleOpen = () => {
    if (defaultSourceId) setSourceId(defaultSourceId)
    const other = comptes.find(c => c.id !== (defaultSourceId || sourceId))
    if (other) setDestId(other.id)
    setError(null)
    setSuccess(false)
    setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const val = parseFloat(montant)
    if (isNaN(val) || val <= 0) {
      setError('Veuillez saisir un montant valide.')
      return
    }

    if (sourceId === destId) {
      setError('Le compte source et le compte destinataire doivent être différents.')
      return
    }

    setLoading(true)
    const res = await transfertFonds({
      compte_source_id: sourceId,
      compte_dest_id: destId,
      montant: val,
      motif: motif.trim() || 'Virement interne / Décharge de caisse'
    })
    setLoading(false)

    if (res?.error) {
      setError(res.error)
    } else {
      setSuccess(true)
      setTimeout(() => {
        setIsOpen(false)
        setMontant('')
        setMotif('')
        setSuccess(false)
      }, 1400)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-surface-border bg-surface text-foreground hover:border-primary hover:text-primary transition-all shadow-xs"
        title="Effectuer un virement interne ou une décharge de caisse"
      >
        <ArrowLeftRight className="w-3.5 h-3.5 text-primary" />
        <span>Virement / Décharge de Caisse</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-surface-border w-full max-w-md rounded-2xl p-5 shadow-2xl relative text-left">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-black/5"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-heading text-foreground">
                  Virement Interne / Décharge de Caisse
                </h3>
                <p className="text-xs text-foreground-muted">
                  Transférez des fonds entre postes de caisse, coffre ou compte bancaire.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-3 p-2.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-3 p-2.5 rounded-xl bg-success/15 border border-success/30 text-success text-xs flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>✓ Transfert comptabilisé avec succès !</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Poste / Compte Source (Débit) *
                </label>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground focus:ring-1 focus:ring-primary"
                  required
                >
                  {comptes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nom} ({c.type || c.type_compte || 'compte'}) - Solde: {Number(c.solde_courant || c.solde || 0).toLocaleString('fr-FR')} FCFA
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Poste / Compte Destinataire (Crédit) *
                </label>
                <select
                  value={destId}
                  onChange={(e) => setDestId(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground focus:ring-1 focus:ring-primary"
                  required
                >
                  {comptes.map(c => (
                    <option key={c.id} value={c.id} disabled={c.id === sourceId}>
                      {c.nom} ({c.type || c.type_compte || 'compte'}) - Solde: {Number(c.solde_courant || c.solde || 0).toLocaleString('fr-FR')} FCFA
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Montant à transférer (FCFA) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  placeholder="Ex : 100000"
                  required
                  className="w-full text-sm font-mono font-bold px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Motif / Libellé de l&apos;opération
                </label>
                <input
                  type="text"
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  placeholder="Ex : Décharge caisse fin de journée, versement coffre..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="px-3 py-2 rounded-xl border border-surface-border text-xs font-semibold text-foreground hover:bg-surface-hover"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading ? 'Transfert en cours...' : 'Valider le Virement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

