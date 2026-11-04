'use client'

import { useState } from 'react'
import { X, Send, Copy, Check, User, Phone, FileText, Building2 } from 'lucide-react'

interface OrdonnanceItem {
  medicament: string
  quantite: number
  posologie: string
  disponibleEnStock: boolean
  stockActuel: number
}

interface OrdonnanceData {
  numero: string
  date: string
  patientNom: string
  patientIpp: string
  medecinNom: string
  structureNom: string
  items: OrdonnanceItem[]
}

export function EnvoyerMedecinWhatsAppModal({
  ordonnance,
  onClose,
}: {
  ordonnance: OrdonnanceData
  onClose: () => void
}) {
  const [medecinTel, setMedecinTel] = useState('')
  const [motif, setMotif] = useState<'disponibilite' | 'posologie' | 'rupture' | 'libre'>('disponibilite')
  const [notePersonnalisee, setNotePersonnalisee] = useState('')
  const [copied, setCopied] = useState(false)

  const itemsEnRupture = ordonnance.items.filter((i) => !i.disponibleEnStock)
  const itemsEnStock = ordonnance.items.filter((i) => i.disponibleEnStock)

  const genererMessageWhatsApp = () => {
    let msg = `Bonjour ${ordonnance.medecinNom || 'Docteur'},\n`
    msg += `Officine Pharmacie — Au sujet de l'ordonnance *${ordonnance.numero}* du ${ordonnance.date}\n`
    msg += `Patient : *${ordonnance.patientNom}* (IPP : ${ordonnance.patientIpp})\n\n`

    if (motif === 'disponibilite') {
      msg += `📋 *Point sur la dispensation des médicaments :*\n`
      if (itemsEnStock.length > 0) {
        msg += `✅ *Disponibles immédiatement :*\n`
        itemsEnStock.forEach((it) => {
          msg += `• ${it.medicament} (Qté : ${it.quantite})\n`
        })
      }
      if (itemsEnRupture.length > 0) {
        msg += `⚠️ *En rupture à l'officine :*\n`
        itemsEnRupture.forEach((it) => {
          msg += `• ${it.medicament} (Qté demandée : ${it.quantite})\n`
        })
        msg += `Nous tenons des équivalents DCI en stock si vous souhaitez une substitution.\n`
      }
    } else if (motif === 'posologie') {
      msg += `❓ *Demande de précision sur la posologie :*\n`
      ordonnance.items.forEach((it) => {
        msg += `• ${it.medicament} : ${it.posologie}\n`
      })
    } else if (motif === 'rupture') {
      msg += `🚨 *Alerte rupture stock :*\n`
      if (itemsEnRupture.length > 0) {
        itemsEnRupture.forEach((it) => {
          msg += `• ${it.medicament} est actuellement indisponible.\n`
        })
      } else {
        msg += `Certains produits prescrits sont en rupture grossiste.\n`
      }
    }

    if (notePersonnalisee.trim()) {
      msg += `\n💬 *Note du pharmacien :*\n${notePersonnalisee.trim()}\n`
    }

    msg += `\nMerci de votre retour confraternel.`
    return msg
  }

  const messageText = genererMessageWhatsApp()
  const cleanPhone = medecinTel.replace(/[^0-9]/g, '')
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`

  const handleCopier = async () => {
    try {
      await navigator.clipboard.writeText(messageText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignorer
    }
  }

  const handleOuvrirWhatsApp = () => {
    window.open(whatsappUrl, '_blank')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Entête */}
        <div className="flex items-start justify-between border-b border-surface-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">
                Envoyer au Médecin via WhatsApp
              </h3>
              <p className="text-xs text-foreground-muted">
                Échange direct avec {ordonnance.medecinNom} ({ordonnance.structureNom})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-foreground-muted hover:text-foreground hover:bg-surface-border/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Détails Médecin & Destinataire */}
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-2xl bg-surface-hover/50 border border-surface-border flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-foreground-muted block">
                Prescripteur D-Santé
              </span>
              <p className="font-bold text-foreground">{ordonnance.medecinNom}</p>
              <p className="text-[11px] text-foreground-muted">{ordonnance.structureNom}</p>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-foreground-muted block">
                Ordonnance
              </span>
              <p className="font-mono font-bold text-primary">{ordonnance.numero}</p>
              <p className="text-[11px] text-foreground-muted">{ordonnance.patientNom}</p>
            </div>
          </div>

          {/* Numéro WhatsApp */}
          <div className="space-y-1">
            <label className="font-semibold text-foreground-muted block flex items-center justify-between">
              <span>N° WhatsApp direct du médecin (optionnel) :</span>
              <span className="text-[10px] text-emerald-600 font-bold">Sélection automatique si vide</span>
            </label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-foreground-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={medecinTel}
                onChange={(e) => setMedecinTel(e.target.value)}
                placeholder="ex: 221771234567 (ou laisser vide pour choisir dans WhatsApp)"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Motif du message */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground-muted block">
              Type de notification :
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMotif('disponibilite')}
                className={`p-2 rounded-xl border text-left font-medium transition cursor-pointer ${
                  motif === 'disponibilite'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 font-bold'
                    : 'border-surface-border text-foreground hover:bg-surface-hover/40'
                }`}
              >
                Disponibilité & Ruptures
              </button>
              <button
                type="button"
                onClick={() => setMotif('posologie')}
                className={`p-2 rounded-xl border text-left font-medium transition cursor-pointer ${
                  motif === 'posologie'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 font-bold'
                    : 'border-surface-border text-foreground hover:bg-surface-hover/40'
                }`}
              >
                Précision Posologie
              </button>
            </div>
          </div>

          {/* Note personnalisée additionnelle */}
          <div className="space-y-1">
            <label className="font-semibold text-foreground-muted block">
              Remarque / Question additionnelle (optionnel) :
            </label>
            <textarea
              rows={2}
              value={notePersonnalisee}
              onChange={(e) => setNotePersonnalisee(e.target.value)}
              placeholder="ex: Le dosage 500mg est disponible au lieu du 1g prescrit..."
              className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Aperçu du message WhatsApp */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-foreground-muted">
                Aperçu du message transmis au médecin :
              </label>
              <button
                type="button"
                onClick={handleCopier}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-semibold"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-2xl bg-background border border-surface-border text-[11px] text-foreground font-sans whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
              {messageText}
            </pre>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-surface-border">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-surface-border text-foreground-muted hover:text-foreground font-semibold text-xs cursor-pointer"
          >
            Fermer
          </button>

          <button
            type="button"
            onClick={handleOuvrirWhatsApp}
            className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
            title="Ouvrir WhatsApp pour envoyer le message au médecin"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            <span>Envoyer au Médecin via WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  )
}
