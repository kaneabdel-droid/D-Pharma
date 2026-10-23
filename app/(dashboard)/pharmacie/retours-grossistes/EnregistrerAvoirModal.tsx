'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Receipt, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { enregistrerAvoirGrossiste } from './actions'

interface RetourItem {
  id: string
  numero_bon_retour: string
  date_retour: string
  fournisseurs_labo?: { nom: string } | null
  valeur_estimee_ht: number
}

export default function EnregistrerAvoirModal({ retour }: { retour: RetourItem }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [montantHT, setMontantHT] = useState(retour.valeur_estimee_ht || 0)
  const [montantTVA, setMontantTVA] = useState(0)

  const formatCFA = (val: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(val) + ' FCFA'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    formData.set('retour_id', retour.id)

    const res = await enregistrerAvoirGrossiste(formData)
    setLoading(false)

    if (res.error) {
      setError(res.error)
    } else {
      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
        router.refresh()
      }, 700)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5 transition-colors"
      >
        <Receipt className="w-3.5 h-3.5" />
        <span>Saisir l'Avoir Grossiste</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-surface-border p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold font-heading text-base text-foreground">
                  Enregistrer l'Avoir Grossiste
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-foreground-muted hover:text-foreground text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="mt-3 p-3 rounded-xl bg-background border border-surface-border text-xs space-y-1">
              <p className="text-foreground-muted">
                Grossiste : <strong className="text-foreground">{retour.fournisseurs_labo?.nom || 'Grossiste'}</strong>
              </p>
              <p className="text-foreground-muted">
                Réf Bon de Retour : <span className="font-mono font-bold text-primary">{retour.numero_bon_retour}</span>
              </p>
              <p className="text-foreground-muted">
                Valeur estimée initiale : <span className="font-mono font-bold">{formatCFA(retour.valeur_estimee_ht)}</span>
              </p>
            </div>

            {error && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Avoir enregistré et écriture comptable générée !</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground-muted uppercase mb-1">
                  N° de Note d'Avoir Grossiste *
                </label>
                <input
                  type="text"
                  name="numero_avoir_grossiste"
                  required
                  placeholder="Ex: AV-LAB-2026-9812"
                  className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground-muted uppercase mb-1">
                  Date de l'Avoir *
                </label>
                <input
                  type="date"
                  name="date_avoir"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground-muted uppercase mb-1">
                    Montant HT Crédité *
                  </label>
                  <input
                    type="number"
                    name="montant_avoir_ht"
                    min="1"
                    required
                    value={montantHT}
                    onChange={(e) => setMontantHT(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground-muted uppercase mb-1">
                    TVA Créditée (si 18%)
                  </label>
                  <input
                    type="number"
                    name="montant_avoir_tva"
                    min="0"
                    value={montantTVA}
                    onChange={(e) => setMontantTVA(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="p-3 bg-surface rounded-xl border border-surface-border text-xs flex justify-between items-center">
                <span className="font-semibold text-foreground-muted">Total Déduit de votre Dette Fournisseur :</span>
                <span className="font-black font-mono text-sm text-emerald-600">{formatCFA(montantHT + montantTVA)}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-xl border border-surface-border text-foreground text-xs font-semibold hover:bg-background"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Valider l'Avoir</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
