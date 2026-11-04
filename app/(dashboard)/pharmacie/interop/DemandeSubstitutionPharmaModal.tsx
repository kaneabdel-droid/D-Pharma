'use client'

import { useState } from 'react'
import { soumettreDemandeSubstitution } from './actions'
import {
  Pill, Send, CheckCircle2, Building2,
  AlertTriangle, Loader2, X, ArrowRight, Phone, User, Copy, Check
} from 'lucide-react'

export function DemandeSubstitutionPharmaModal({
  onClose,
  initialMedicament,
  initialOrdonnance,
  initialPatient,
  initialIpp,
  initialMedecin,
  initialMedecinTel,
  initialStructure,
}: {
  onClose: () => void
  initialMedicament?: string
  initialOrdonnance?: string
  initialPatient?: string
  initialIpp?: string
  initialMedecin?: string
  initialMedecinTel?: string
  initialStructure?: string
}) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [patientNom, setPatientNom] = useState(initialPatient || '')
  const [patientIpp, setPatientIpp] = useState(initialIpp || '')
  const [numeroOrdonnance, setNumeroOrdonnance] = useState(initialOrdonnance || '')
  const [medecinNom, setMedecinNom] = useState(initialMedecin || '')
  const [medecinTel, setMedecinTel] = useState(initialMedecinTel || '')
  const [structureNom, setStructureNom] = useState(initialStructure || '')
  const [prescrit, setPrescrit] = useState(initialMedicament || '')
  const [propose, setPropose] = useState('')
  const [motif, setMotif] = useState('')
  const [posologie, setPosologie] = useState('')
  const [copied, setCopied] = useState(false)

  const cleanPhone = medecinTel.replace(/[^0-9]/g, '')
  const whatsappText = `Bonjour ${medecinNom || 'Docteur'},\n` +
    `Officine Pharmacie : Demande d'accord de substitution DCI\n` +
    `Patient : *${patientNom || 'Patient'}* ${numeroOrdonnance ? `(Ordonnance : *${numeroOrdonnance}*)` : ''}\n\n` +
    `Médicament prescrit (indisponible) : *${prescrit}*\n` +
    `Substitut proposé en stock : *${propose}*\n` +
    `${posologie ? `Posologie suggérée : ${posologie}\n` : ''}` +
    `${motif ? `Motif : ${motif}\n` : ''}` +
    `Merci de bien vouloir nous confirmer votre accord pour cette délivrance.`

  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappText)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData()
    formData.append('patient_nom', patientNom)
    formData.append('patient_ipp', patientIpp)
    formData.append('numero_ordonnance', numeroOrdonnance)
    formData.append('medecin_nom', medecinNom)
    formData.append('structure_nom', structureNom)
    formData.append('medicament_prescrit', prescrit)
    formData.append('medicament_propose', propose)
    formData.append('motif', motif)
    formData.append('posologie_ajustee', posologie)

    await soumettreDemandeSubstitution(formData)
    setLoading(false)
    setSuccess(true)
    setTimeout(() => {
      onClose()
    }, 1200)
  }

  const handleEnvoyerWhatsApp = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!prescrit || !propose) {
      alert('Veuillez renseigner le médicament prescrit et le substitut proposé.')
      return
    }
    setLoading(true)
    const formData = new FormData()
    formData.append('patient_nom', patientNom)
    formData.append('patient_ipp', patientIpp)
    formData.append('numero_ordonnance', numeroOrdonnance)
    formData.append('medecin_nom', medecinNom)
    formData.append('structure_nom', structureNom)
    formData.append('medicament_prescrit', prescrit)
    formData.append('medicament_propose', propose)
    formData.append('motif', motif)
    formData.append('posologie_ajustee', posologie)

    await soumettreDemandeSubstitution(formData)
    setLoading(false)
    setSuccess(true)
    window.open(whatsappUrl, '_blank')
    setTimeout(() => {
      onClose()
    }, 1500)
  }

  const handleCopier = async () => {
    try {
      await navigator.clipboard.writeText(whatsappText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignorer
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-surface-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">
                Demande d’Accord de Substitution au Médecin
              </h3>
              <p className="text-xs text-foreground-muted">
                Proposer un générique / équivalent en cas de rupture de stock
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

        {success ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-foreground text-sm">
              Demande transmise avec succès !
            </h4>
            <p className="text-xs text-foreground-muted max-w-xs mx-auto">
              La demande a été enregistrée. L&apos;accord du prescripteur sera notifié dès validation.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground-muted block">
                  Nom du Patient :
                </label>
                <input
                  type="text"
                  required
                  value={patientNom}
                  onChange={(e) => setPatientNom(e.target.value)}
                  placeholder="ex: Aminata Diallo"
                  className="w-full px-3.5 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground-muted block">
                  N° IPP Patient / Tél :
                </label>
                <input
                  type="text"
                  value={patientIpp}
                  onChange={(e) => setPatientIpp(e.target.value)}
                  placeholder="ex: PAT-2610-001"
                  className="w-full px-3.5 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs focus:outline-none focus:border-primary font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground-muted block">
                  N° Ordonnance (si disponible) :
                </label>
                <input
                  type="text"
                  value={numeroOrdonnance}
                  onChange={(e) => setNumeroOrdonnance(e.target.value)}
                  placeholder="ex: ORD-2610-0012"
                  className="w-full px-3.5 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground-muted block">
                  Médecin Prescripteur :
                </label>
                <input
                  type="text"
                  value={medecinNom}
                  onChange={(e) => setMedecinNom(e.target.value)}
                  placeholder="ex: Dr. Diop (Clinique D-Santé)"
                  className="w-full px-3.5 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-foreground-muted block flex items-center justify-between">
                <span>N° WhatsApp direct du médecin (optionnel) :</span>
                <span className="text-[10px] text-emerald-600 font-bold">Envoi WhatsApp 1-Clic</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-foreground-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={medecinTel}
                  onChange={(e) => setMedecinTel(e.target.value)}
                  placeholder="ex: 221771234567 (ou laisser vide pour choisir le contact dans WhatsApp)"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/10 text-[11px] text-foreground-muted flex items-center gap-2">
              <span className="font-bold text-primary shrink-0">Liaison :</span>
              <span>
                Le N° d&apos;ordonnance relie automatiquement la demande au médecin traitant sur D-Santé. Vous pouvez aussi envoyer au médecin directement via WhatsApp.
              </span>
            </div>

            {/* Comparatif Prescription vs Proposition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-danger block">
                  Médicament Prescrit (Épuisé) :
                </label>
                <input
                  type="text"
                  required
                  value={prescrit}
                  onChange={(e) => setPrescrit(e.target.value)}
                  placeholder="ex: Augmentin 1g Sachet"
                  className="w-full px-3.5 py-2 rounded-xl border border-danger/30 bg-danger/5 text-foreground text-xs focus:outline-none focus:border-danger font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-emerald-600 block">
                  Substitut en Stock (Générique DCI) :
                </label>
                <input
                  type="text"
                  required
                  value={propose}
                  onChange={(e) => setPropose(e.target.value)}
                  placeholder="ex: Amoxicilline + Ac. Clav. 1g Comprimé"
                  className="w-full px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-foreground text-xs focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-foreground-muted block">
                Posologie Suggérée / Conseils :
              </label>
              <input
                type="text"
                value={posologie}
                onChange={(e) => setPosologie(e.target.value)}
                placeholder="ex: 1 comprimé matin et soir pendant 7 jours"
                className="w-full px-3.5 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-foreground-muted block">
                Motif de la demande :
              </label>
              <input
                type="text"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="ex: Rupture totale grossiste sur la forme sachet, générique comprimé disponible"
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-background text-foreground text-xs focus:outline-none focus:border-primary"
              />
            </div>

            {/* Aperçu Message WhatsApp si texte disponible */}
            {prescrit && propose && (
              <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600">
                  <span>Aperçu transmission WhatsApp :</span>
                  <button
                    type="button"
                    onClick={handleCopier}
                    className="hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copié' : 'Copier'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-foreground-muted font-mono whitespace-pre-wrap line-clamp-3">
                  {whatsappText}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-border">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-3.5 rounded-xl border border-surface-border text-foreground-muted hover:text-foreground font-semibold text-xs cursor-pointer"
              >
                Annuler
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleEnvoyerWhatsApp}
                  disabled={loading}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50 transition"
                  title="Enregistrer la demande et ouvrir WhatsApp avec le médecin"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  <span>Envoyer au Médecin via WhatsApp</span>
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  title="Enregistrer la demande directement sur le réseau D-Santé"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>D-Santé Direct</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
