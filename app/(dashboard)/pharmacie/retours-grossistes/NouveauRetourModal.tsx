'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Trash2, Truck, Loader2, AlertCircle } from 'lucide-react'
import { creerBonRetourGrossiste } from './actions'

interface FournisseurItem {
  id: string
  nom: string
}

export default function NouveauRetourModal({ fournisseurs }: { fournisseurs: FournisseurItem[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [lignes, setLignes] = useState<Array<{
    designation: string
    lot: string
    date_peremption: string
    quantite: number
    prix_achat_ht: number
  }>>([
    {
      designation: '',
      lot: '',
      date_peremption: new Date().toISOString().split('T')[0],
      quantite: 1,
      prix_achat_ht: 0,
    },
  ])

  const ajouterLigne = () => {
    setLignes((prev) => [
      ...prev,
      {
        designation: '',
        lot: '',
        date_peremption: new Date().toISOString().split('T')[0],
        quantite: 1,
        prix_achat_ht: 0,
      },
    ])
  }

  const supprimerLigne = (idx: number) => {
    setLignes((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateLigne = (idx: number, champ: string, val: any) => {
    setLignes((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [champ]: val } : l))
    )
  }

  const formatCFA = (val: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(val) + ' FCFA'

  const totalHT = lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prix_achat_ht) || 0), 0)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (lignes.length === 0) {
      setError('Veuillez ajouter au moins un article à retourner.')
      return
    }

    setLoading(true)
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('lignes', JSON.stringify(lignes))

    const res = await creerBonRetourGrossiste(formData)
    setLoading(false)

    if (res.error) {
      setError(res.error)
    } else {
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-sm"
      >
        <Plus className="w-4 h-4" />
        <span>Nouveau Bon de Retour Grossiste</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-surface-border p-6 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-surface-border">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold font-heading text-lg text-foreground">
                    Créer un Bon de Retour Grossiste
                  </h3>
                  <p className="text-xs text-foreground-muted">
                    Préparation du colis de reprise (Laborex, COPHASE, Sodipharm, Duopharm...)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-foreground-muted hover:text-foreground text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground-muted uppercase mb-1">
                    Grossiste-Répartiteur *
                  </label>
                  <select
                    name="fournisseur_id"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">-- Choisir le grossiste --</option>
                    {fournisseurs.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground-muted uppercase mb-1">
                    Date du retour *
                  </label>
                  <input
                    type="date"
                    name="date_retour"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground-muted uppercase mb-1">
                    Motif du retour *
                  </label>
                  <select
                    name="motif"
                    defaultValue="perime_reprise"
                    className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="perime_reprise">Périmés / Reprise conventionnelle</option>
                    <option value="erreur_livraison">Erreur de livraison / Commande non conforme</option>
                    <option value="produit_abime">Produit endommagé / Casse à la réception</option>
                    <option value="rappel_lot">Rappel de lot fabricant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground-muted uppercase mb-1">
                    Taux de reprise prévu (%)
                  </label>
                  <input
                    type="number"
                    name="taux_reprise_applique"
                    defaultValue="100"
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Lignes d'articles */}
              <div className="space-y-2 pt-2 border-t border-surface-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Articles retournés ({lignes.length})
                  </span>
                  <button
                    type="button"
                    onClick={ajouterLigne}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter un article
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto divide-y divide-surface-border">
                  {lignes.map((l, idx) => (
                    <div key={idx} className="pt-2 grid grid-cols-12 gap-2 items-center text-xs">
                      <div className="col-span-5">
                        <input
                          type="text"
                          required
                          value={l.designation}
                          onChange={(e) => updateLigne(idx, 'designation', e.target.value)}
                          placeholder="Nom de la spécialité"
                          className="w-full px-2 py-1.5 rounded-lg border border-surface-border bg-background text-xs font-semibold"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={l.lot}
                          onChange={(e) => updateLigne(idx, 'lot', e.target.value)}
                          placeholder="N° Lot"
                          className="w-full px-2 py-1.5 rounded-lg border border-surface-border bg-background text-xs font-mono"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          required
                          value={l.quantite}
                          onChange={(e) => updateLigne(idx, 'quantite', e.target.value)}
                          placeholder="Qté"
                          className="w-full px-2 py-1.5 rounded-lg border border-surface-border bg-background text-xs font-bold text-center"
                        />
                      </div>
                      <div className="col-span-2 flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={l.prix_achat_ht}
                          onChange={(e) => updateLigne(idx, 'prix_achat_ht', e.target.value)}
                          placeholder="P.A."
                          className="w-full px-2 py-1.5 rounded-lg border border-surface-border bg-background text-xs font-mono text-right"
                        />
                        {lignes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => supprimerLigne(idx)}
                            className="p-1 text-danger hover:bg-danger/10 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-background border border-surface-border flex justify-between items-center text-xs">
                  <span className="text-foreground-muted">Valeur estimée du retour :</span>
                  <span className="font-bold font-mono text-sm text-primary">{formatCFA(totalHT)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground-muted uppercase mb-1">
                  Notes / Instructions particulières
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Ex: Colis scellé remis au chauffeur du grossiste lors de la livraison du matin..."
                  className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
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
                  <span>Créer le Bon de Retour</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
