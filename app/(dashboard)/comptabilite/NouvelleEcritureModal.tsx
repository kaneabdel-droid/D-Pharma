'use client'

import { useState } from 'react'
import { Plus, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { ajouterEcriture } from './actions'

type PlanItem = {
  compte: string
  libelle: string
  classe: number
}

export default function NouvelleEcritureModal({ plan }: { plan: PlanItem[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const res = await ajouterEcriture(formData)

    setIsSubmitting(false)
    if (res?.error) {
      setError(res.error)
    } else {
      setIsOpen(false)
    }
  }

  const champ = 'block w-full rounded-xl border border-surface-border bg-background py-2.5 px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

  return (
    <>
      <button
        onClick={() => { setIsOpen(true); setError(null) }}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-primary-hover transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>Saisir une Écriture</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-surface-border w-full max-w-xl rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-5 top-5 p-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-black/5"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold font-heading text-foreground mb-1">
              Nouvelle Écriture Comptable
            </h3>
            <p className="text-xs text-foreground-muted mb-6">
              Enregistrement en partie double : tout montant débité équivaut à un montant crédité.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Date</label>
                  <input
                    type="date"
                    name="date_ecriture"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    required
                    className={champ}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Journal</label>
                  <select name="journal" defaultValue="ventes" className={champ}>
                    <option value="ventes">Ventes (Recettes)</option>
                    <option value="achats">Achats (Grossistes)</option>
                    <option value="caisse">Caisse</option>
                    <option value="banque">Banque</option>
                    <option value="od">Opérations Diverses</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">N° Pièce / Réf</label>
                  <input
                    type="text"
                    name="numero_piece"
                    placeholder="FAC-2026-001"
                    className={champ}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Libellé de l&apos;opération</label>
                <input
                  type="text"
                  name="libelle"
                  required
                  placeholder="ex: Ventes au comptoir journée du 16/10, Achat Laborex..."
                  className={champ}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-surface-border">
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Compte Débit (Emploi / Entrée)
                  </label>
                  <select name="compte_debit" required className={champ} defaultValue="531">
                    <option value="">Sélectionner le compte débité</option>
                    {plan.map((p) => (
                      <option key={p.compte} value={p.compte}>
                        {p.compte} - {p.libelle}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">
                    Compte Crédit (Ressource / Sortie)
                  </label>
                  <select name="compte_credit" required className={champ} defaultValue="701">
                    <option value="">Sélectionner le compte crédité</option>
                    {plan.map((p) => (
                      <option key={p.compte} value={p.compte}>
                        {p.compte} - {p.libelle}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Montant (FCFA)
                </label>
                <input
                  type="number"
                  name="montant"
                  required
                  min="1"
                  step="any"
                  placeholder="ex: 150000"
                  className={champ}
                />
              </div>

              <div className="pt-4 border-t border-surface-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl border border-surface-border text-sm font-semibold text-foreground-muted hover:text-foreground"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-bold shadow-md hover:bg-primary-hover disabled:opacity-50"
                >
                  {isSubmitting ? 'Validation...' : 'Valider l’écriture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
