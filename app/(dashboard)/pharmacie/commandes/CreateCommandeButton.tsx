'use client'

import { useState } from 'react'
import { Truck, X, Plus, Trash2 } from 'lucide-react'
import { createCommande } from './actions'

type Fournisseur = { id: string, nom: string }
type Medicament = { id: string, nom: string }

type LigneCommande = {
  medicament_id: string
  quantite: number
}

export default function CreateCommandeButton({
  fournisseurs,
  medicaments
}: {
  fournisseurs: Fournisseur[],
  medicaments: Medicament[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fournisseurId, setFournisseurId] = useState('')
  const [lines, setLines] = useState<LigneCommande[]>([
    { medicament_id: '', quantite: 1 }
  ])

  const addLine = () => {
    setLines(prev => [...prev, { medicament_id: '', quantite: 1 }])
  }

  const removeLine = (index: number) => {
    if (lines.length <= 1) return
    setLines(prev => prev.filter((_, i) => i !== index))
  }

  const updateLine = (index: number, field: keyof LigneCommande, value: string | number) => {
    setLines(prev => prev.map((l, i) => {
      if (i === index) {
        return { ...l, [field]: value }
      }
      return l
    }))
  }

  const handleOpen = () => {
    setError(null)
    setLines([{ medicament_id: '', quantite: 1 }])
    setFournisseurId('')
    setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!fournisseurId) {
      setError('Veuillez sélectionner un fournisseur / laboratoire.')
      return
    }

    const validLines = lines.filter(l => l.medicament_id && Number(l.quantite) > 0)
    if (validLines.length === 0) {
      setError('Veuillez ajouter au moins un médicament avec une quantité valide.')
      return
    }

    setIsSubmitting(true)

    const formData = new FormData()
    formData.append('fournisseur_id', fournisseurId)
    formData.append('lignes', JSON.stringify(validLines))

    // Rétrocompatibilité premier produit
    formData.append('medicament_id', validLines[0].medicament_id)
    formData.append('quantite', validLines[0].quantite.toString())

    const result = await createCommande(formData)

    setIsSubmitting(false)
    if (result.error) {
      setError(result.error)
    } else {
      setIsOpen(false)
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-sm"
      >
        <Truck className="w-5 h-5" />
        Passer Commande
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-2xl border border-surface-border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-surface-border bg-background/50">
              <div>
                <h3 className="text-xl font-bold font-heading text-foreground">Nouvelle Commande Laboratoire</h3>
                <p className="text-xs text-foreground-muted mt-0.5">Commandez plusieurs produits auprès de votre fournisseur</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-foreground-muted hover:text-foreground p-1 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
              {error && (
                <div className="bg-danger/10 text-danger p-3 rounded-xl text-sm font-medium border border-danger/20">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Fournisseur / Laboratoire *</label>
                <select
                  value={fournisseurId}
                  onChange={(e) => setFournisseurId(e.target.value)}
                  required
                  className="w-full border border-surface-border rounded-xl px-3.5 py-2.5 bg-background text-foreground font-medium focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                >
                  <option value="">Sélectionner un laboratoire / grossiste...</option>
                  {fournisseurs.map(f => (
                    <option key={f.id} value={f.id}>{f.nom}</option>
                  ))}
                </select>
              </div>

              {/* Lignes de commande multi-produits */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-foreground">
                    Médicaments commandés ({lines.length} ligne{lines.length > 1 ? 's' : ''}) *
                  </label>
                  <button
                    type="button"
                    onClick={addLine}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter une ligne
                  </button>
                </div>

                <div className="space-y-2.5">
                  {lines.map((line, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 bg-background p-3 rounded-xl border border-surface-border shadow-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <label className="block text-[11px] font-medium text-foreground-muted mb-1">
                          Produit #{idx + 1}
                        </label>
                        <select
                          value={line.medicament_id}
                          onChange={(e) => updateLine(idx, 'medicament_id', e.target.value)}
                          required
                          className="w-full border border-surface-border rounded-lg px-3 py-2 bg-surface text-foreground text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary"
                        >
                          <option value="">Choisir un médicament...</option>
                          {medicaments.map(m => (
                            <option key={m.id} value={m.id}>{m.nom}</option>
                          ))}
                        </select>
                      </div>

                      <div className="w-28 shrink-0">
                        <label className="block text-[11px] font-medium text-foreground-muted mb-1">
                          Quantité
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          required
                          value={line.quantite}
                          onChange={(e) => updateLine(idx, 'quantite', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full border border-surface-border rounded-lg px-3 py-2 bg-surface text-foreground text-sm font-bold text-center focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      {lines.length > 1 && (
                        <div className="pt-5 shrink-0">
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                            title="Supprimer cette ligne"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-surface-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 text-foreground-muted hover:text-foreground font-medium rounded-xl hover:bg-background transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary-hover disabled:opacity-50 transition-all shadow-sm"
                >
                  {isSubmitting ? 'Transmission en cours...' : `Confirmer la commande (${lines.filter(l => l.medicament_id).length} article${lines.length > 1 ? 's' : ''})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
