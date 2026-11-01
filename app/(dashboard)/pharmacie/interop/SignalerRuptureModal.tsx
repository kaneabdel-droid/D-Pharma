'use client'

import { useState } from 'react'
import { signalerRuptureGrossiste } from './actions'
import {
  AlertTriangle, Send, CheckCircle2,
  Building2, Loader2, X
} from 'lucide-react'

export function SignalerRuptureModal({
  onClose,
}: {
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [medicament, setMedicament] = useState('')
  const [motif, setMotif] = useState('')
  const [urgence, setUrgence] = useState<'normal' | 'urgent' | 'critique'>('critique')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData()
    formData.append('medicament', medicament)
    formData.append('motif', motif)
    formData.append('niveau_urgence', urgence)

    await signalerRuptureGrossiste(formData)
    setLoading(false)
    setSuccess(true)
    setTimeout(() => {
      onClose()
    }, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-surface-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-danger/10 text-danger flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">
                Signaler une Rupture Fournisseur / Grossiste
              </h3>
              <p className="text-xs text-foreground-muted">
                Informer les médecins D-Santé d'éviter de prescrire cette référence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-foreground text-sm">
              Alerte de Rupture Diffusée au Réseau Médical
            </h4>
            <p className="text-xs text-foreground-muted max-w-xs mx-auto">
              Les médecins connectés à D-Santé verront le badge « Rupture » lors de la rédaction de leurs ordonnances.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-foreground block">
                Médicament / Spécialité en Rupture :
              </label>
              <input
                type="text"
                required
                value={medicament}
                onChange={(e) => setMedicament(e.target.value)}
                placeholder="ex: Artéméther injectable 80mg / Sérum Antivenimeux"
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-background text-foreground text-xs focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-foreground block">
                Détail fournisseur & Alternative recommandée :
              </label>
              <textarea
                required
                rows={3}
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="ex: Rupture générale chez Laborex et Ubipharm. Recommander le relais par voie orale ou molécule équivalente."
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-background text-foreground text-xs focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl border border-surface-border text-foreground-muted hover:text-foreground font-semibold text-xs cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="py-2.5 px-5 rounded-xl bg-danger hover:bg-danger/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Diffuser l’Alerte Rupture</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

