'use client'

import { useState } from 'react'
import { soumettreDemandeSubstitution } from './actions'
import {
  Pill, Send, CheckCircle2, Building2,
  AlertTriangle, Loader2, X, ArrowRight
} from 'lucide-react'

export function DemandeSubstitutionPharmaModal({
  onClose,
  initialMedicament,
}: {
  onClose: () => void
  initialMedicament?: string
}) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [patientNom, setPatientNom] = useState('')
  const [patientIpp, setPatientIpp] = useState('')
  const [numeroOrdonnance, setNumeroOrdonnance] = useState('')
  const [medecinNom, setMedecinNom] = useState('')
  const [structureNom, setStructureNom] = useState('')
  const [prescrit, setPrescrit] = useState(initialMedicament || '')
  const [propose, setPropose] = useState('')
  const [motif, setMotif] = useState('')
  const [posologie, setPosologie] = useState('')

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
              <h3 className="font-bold text-foreground text-base">
                Demande d’Accord de Substitution au Médecin
              </h3>
              <p className="text-xs text-foreground-muted">
                Proposer un générique / équivalent en cas de rupture de stock
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
              Demande Transmise au Médecin Prescripteur
            </h4>
            <p className="text-xs text-foreground-muted max-w-xs mx-auto">
              Le médecin a reçu la demande d’accord sur son interface D-Santé. La réponse apparaîtra en temps réel au comptoir.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-bold text-foreground block">
                  Nom du Patient :
                </label>
                <input
                  type="text"
                  required
                  value={patientNom}
                  onChange={(e) => setPatientNom(e.target.value)}
                  placeholder="ex: Aminata Diallo"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-background text-foreground text-xs focus:outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-foreground block">
                  N° IPP Patient / Tél :
                </label>
                <input
                  type="text"
                  value={patientIpp}
                  onChange={(e) => setPatientIpp(e.target.value)}
                  placeholder="ex: PAT-2610-001"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-background text-foreground text-xs focus:outline-none focus:border-primary font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  Médecin Prescripteur / Clinique :
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

            <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/10 text-[11px] text-foreground-muted flex items-center gap-2">
              <span className="font-bold text-primary shrink-0">Liaison :</span>
              <span>
                Le N° d&apos;ordonnance relie automatiquement la demande au médecin traitant sur D-Santé. Si l&apos;ordonnance est externe, son nom permet l&apos;audit au dossier.
              </span>
            </div>

            {/* Comparatif Prescription vs Proposition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 p-3 rounded-2xl bg-danger/5 border border-danger/20">
                <label className="font-bold text-danger block uppercase text-[10px]">
                  Médicament Prescrit (Épuisé) :
                </label>
                <input
                  type="text"
                  required
                  value={prescrit}
                  onChange={(e) => setPrescrit(e.target.value)}
                  placeholder="ex: Augmentin 1g Sachet"
                  className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs font-bold focus:outline-none focus:border-danger"
                />
              </div>

              <div className="space-y-1.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <label className="font-bold text-emerald-600 block uppercase text-[10px]">
                  Substitut en Stock (Générique DCI) :
                </label>
                <input
                  type="text"
                  required
                  value={propose}
                  onChange={(e) => setPropose(e.target.value)}
                  placeholder="ex: Amoxicilline + Ac. Clav. 1g Comprimé"
                  className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs font-bold text-emerald-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground-muted block">
                Posologie Suggérée / Conseils :
              </label>
              <input
                type="text"
                value={posologie}
                onChange={(e) => setPosologie(e.target.value)}
                placeholder="ex: 1 comprimé matin et soir pendant 7 jours"
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-background text-foreground text-xs focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
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
                className="py-2.5 px-5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Envoyer au Médecin D-Santé</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

