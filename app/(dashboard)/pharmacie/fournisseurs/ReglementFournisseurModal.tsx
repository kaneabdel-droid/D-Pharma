'use client'

import { useState } from 'react'
import { DollarSign, X, AlertCircle } from 'lucide-react'
import { enregistrerMouvementDette } from './actions'

type Fournisseur = {
  id: string
  nom: string
  solde_dette: number
}

export default function ReglementFournisseurModal({ fournisseurs }: { fournisseurs: Fournisseur[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedFournisseurId, setSelectedFournisseurId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedFournisseur = fournisseurs.find(f => f.id === selectedFournisseurId)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await enregistrerMouvementDette(formData)

    setIsSubmitting(false)
    if (result.error) {
      setError(result.error)
    } else {
      setIsOpen(false)
    }
  }

  const champ = 'w-full border border-surface-border rounded-xl px-3.5 py-2.5 bg-background text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all'

  return (
    <>
      <button
        onClick={() => { setIsOpen(true); setError(null) }}
        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-sm"
      >
        <DollarSign className="w-4 h-4" />
        <span>Régler un Fournisseur</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-md border border-surface-border overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center p-5 border-b border-surface-border bg-background/50">
              <div>
                <h3 className="text-lg font-bold font-heading text-foreground">
                  Règlement de Dette Grossiste
                </h3>
                <p className="text-xs text-foreground-muted">
                  Enregistrer un paiement effectué à un laboratoire ou grossiste
                </p>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-border"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="bg-danger/10 text-danger border border-danger/20 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Grossiste / Fournisseur *</label>
                <select 
                  name="fournisseur_id" 
                  required 
                  value={selectedFournisseurId} 
                  onChange={(e) => setSelectedFournisseurId(e.target.value)}
                  className={champ}
                >
                  <option value="">Sélectionner le grossiste</option>
                  {fournisseurs.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.nom} ({Number(f.solde_dette || 0).toLocaleString('fr-FR')} FCFA dû)
                    </option>
                  ))}
                </select>
              </div>

              {selectedFournisseur && (
                <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-between">
                  <span className="text-xs text-foreground-muted font-medium">Dette actuelle :</span>
                  <span className="text-sm font-extrabold text-danger">
                    {Number(selectedFournisseur.solde_dette || 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Type d'opération</label>
                <select name="type_mouvement" defaultValue="reglement_effectue" className={champ}>
                  <option value="reglement_effectue">Paiement effectué au grossiste (Diminue la dette)</option>
                  <option value="facture_achat">Nouvelle facture grossiste reçue (Augmente la dette)</option>
                  <option value="avoir">Avoir / Remise accordée par le grossiste</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Montant (FCFA) *</label>
                  <input 
                    required 
                    type="number" 
                    step="any" 
                    min="1" 
                    name="montant" 
                    placeholder="Ex: 500000" 
                    className={champ} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Date</label>
                  <input 
                    type="date" 
                    name="date_mouvement" 
                    defaultValue={new Date().toISOString().split('T')[0]} 
                    className={champ} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Mode de règlement / Réf. Chèque / Virement</label>
                <input type="text" name="numero_piece" placeholder="Ex: Chèque BOA N° 82910, Virement..." className={champ} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Libellé de l'opération *</label>
                <input 
                  required 
                  type="text" 
                  name="libelle" 
                  placeholder="Ex: Règlement facture Laborex commande #2026-02..." 
                  className={champ} 
                />
              </div>

              <div className="pt-3 border-t border-surface-border flex justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)} 
                  className="px-4 py-2 text-foreground-muted hover:text-foreground font-semibold text-xs rounded-xl"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? 'Validation...' : 'Valider le paiement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
