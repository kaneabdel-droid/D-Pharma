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
  const [telephone, setTelephone] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const formatCFA = (montant: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(montant) + ' FCFA'

  const cleanPhone = telephone.replace(/[^0-9]/g, '')
  const whatsappText = `Bonjour,
Télétransmission Tiers-Payant Officine :
Bordereau : *${bordereau.numero_bordereau}*
Organisme payeur : *${bordereau.organisme_nom}*
Période : ${bordereau.periode_debut} au ${bordereau.periode_fin}
Nombre de prises en charge : ${bordereau.nombre_factures} ordonnance(s)
Montant total réclamé : *${formatCFA(bordereau.montant_total_reclame)}*
${message ? `Note : ${message}\n` : ''}
Le récapitulatif détaillé a été expédié. Merci de bien vouloir nous accuser réception pour déclenchement du virement bancaire.`

  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappText)}`

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Email du contact IPM / Mutuelle
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="comptabilite@ipm-organisme.sn"
                className="w-full rounded-xl border border-surface-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1 flex items-center justify-between">
                <span>N° WhatsApp de l&apos;IPM</span>
                <span className="text-[10px] text-emerald-600 font-bold">WhatsApp Direct</span>
              </label>
              <input
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="ex: 221770000000"
                className="w-full rounded-xl border border-surface-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
          <p className="text-[11px] text-foreground-muted">
            Transmettez le récapitulatif complet des créances officine par Email officiel ou directement sur WhatsApp au gestionnaire IPM.
          </p>

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
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-foreground-muted hover:text-foreground"
            >
              Annuler
            </button>

            <div className="flex items-center gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Ouvrir WhatsApp avec le récapitulatif du bordereau"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                <span>WhatsApp</span>
              </a>

              <button
                type="submit"
                disabled={isSubmitting || isSuccess}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-md shadow-teal-600/20 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Envoi...' : 'Email Direct'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

