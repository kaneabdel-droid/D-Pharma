'use client'

import { useState } from 'react'
import { Mail, Send, X, Check, Building2 } from 'lucide-react'
import { BordereauPharmaIpm, envoyerBordereauPharmaIpmParEmail } from './actions'

export function TransmettreEmailPharmaIpmModal({
  bordereau,
  onClose,
}: {
  bordereau: BordereauPharmaIpm
  onClose: () => void
}) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      setStatusMsg('Veuillez renseigner une adresse email valide pour l’organisme IPM.')
      return
    }

    setIsSubmitting(true)
    setStatusMsg(null)

    const res = await envoyerBordereauPharmaIpmParEmail(bordereau.id, email, message)
    setIsSubmitting(false)

    if (res?.error) {
      setStatusMsg(`Erreur : ${res.error}`)
    } else {
      setIsSuccess(true)
      setStatusMsg(`✓ ${res.message || 'Bordereau transmis avec succès à l’IPM !'}`)
      setTimeout(() => {
        onClose()
      }, 2000)
    }
  }

  const formatCFA = (montant: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(montant) + ' FCFA'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="relative w-full max-w-lg rounded-2xl bg-surface border border-surface-border shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-surface-border bg-background/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">
                Transmettre Bordereau Tiers-Payant à l&apos;IPM
              </h3>
              <p className="text-xs text-foreground-muted">
                {bordereau.numero_bordereau} • {bordereau.organisme_nom}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSend} className="p-5 space-y-4">
          {statusMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                isSuccess
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700'
                  : 'bg-primary/10 border border-primary/20 text-primary'
              }`}
            >
              {isSuccess && <Check className="w-4 h-4 shrink-0 text-emerald-600" />}
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Bordereau Summary */}
          <div className="p-3.5 rounded-xl bg-background border border-surface-border space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-foreground-muted">Organisme Destinataire :</span>
              <span className="font-bold text-foreground">{bordereau.organisme_nom}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-muted">Nombre de prises en charge :</span>
              <span className="font-bold text-foreground">{bordereau.nombre_factures} ordonnances</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-muted">Montant Total à Rembourser :</span>
              <span className="font-mono font-bold text-teal-600">
                {formatCFA(bordereau.montant_total_reclame)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Email du contact IPM / Mutuelle
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="comptabilite@ipm-organisme.sn"
              className="w-full rounded-xl border border-surface-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            />
            <p className="text-[11px] text-foreground-muted mt-1">
              L&apos;IPM recevra le récapitulatif complet des délivrances officine pour audit et déclenchement du virement bancaire.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Message d&apos;accompagnement (optionnel)
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex: Merci de procéder au virement sur notre compte d'officine conformément à notre convention..."
              className="w-full rounded-xl border border-surface-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-foreground-muted hover:text-foreground"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isSuccess}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-md shadow-teal-600/20 transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Transmission en cours...' : 'Transmettre par email'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
