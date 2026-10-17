'use client'

import { useState } from 'react'
import { Plus, X, Truck, AlertCircle } from 'lucide-react'
import { ajouterFournisseur } from './actions'

export default function FournisseurModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await ajouterFournisseur(formData)

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
        className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors shadow-sm"
      >
        <Plus className="w-4 h-4" />
        <span>Nouveau Grossiste / Fournisseur</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-lg border border-surface-border overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center p-5 border-b border-surface-border bg-background/50">
              <div>
                <h3 className="text-lg font-bold font-heading text-foreground">
                  Fiche Grossiste Répartiteur / Laboratoire
                </h3>
                <p className="text-xs text-foreground-muted">
                  Créer un compte fournisseur pour le suivi des commandes et des dettes
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
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Raison sociale du Fournisseur / Grossiste *
                </label>
                <input 
                  required 
                  type="text" 
                  name="nom" 
                  placeholder="Ex: Laborex Sénégal, Copharm, Ubipharm, Sodipharm..." 
                  className={champ} 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Code Interne / Réf.</label>
                  <input type="text" name="code_fournisseur" placeholder="Ex: LABOREX-DK" className={champ} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">NINEA / RCCM</label>
                  <input type="text" name="rccm_ninea" placeholder="Ex: SN-DKR-2020..." className={champ} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Téléphone de contact</label>
                  <input type="text" name="contact_telephone" placeholder="Ex: +221 33 800 00 00" className={champ} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">E-mail commandes</label>
                  <input type="email" name="contact_email" placeholder="commandes@fournisseur.sn" className={champ} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Adresse de livraison / Dépôt</label>
                <input type="text" name="adresse" placeholder="Ex: Zone Industrielle Bel Air, Dakar" className={champ} />
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
                  className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-primary-hover disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? 'Enregistrement...' : 'Créer le fournisseur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
