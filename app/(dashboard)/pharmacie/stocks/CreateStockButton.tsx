'use client'

import { useState } from 'react'
import { Plus, X, Pill, Stethoscope, Sparkles, AlertCircle } from 'lucide-react'
import { addStock } from './actions'

export default function CreateStockButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [typeProduit, setTypeProduit] = useState<'medicament' | 'materiel' | 'service'>('medicament')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.set('type_produit', typeProduit)
    const result = await addStock(formData)

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
        <span>Nouveau Produit / Service</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-lg border border-surface-border overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center p-5 border-b border-surface-border bg-background/50">
              <div>
                <h3 className="text-lg font-bold font-heading text-foreground">
                  Créer un Article / Service Officinal
                </h3>
                <p className="text-xs text-foreground-muted">
                  Médicament, matériel médical ou prestation de santé au comptoir
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

              {/* Sélecteur de type d'article */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Type de produit ou service</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTypeProduit('medicament')}
                    className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      typeProduit === 'medicament'
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-background border-surface-border text-foreground hover:bg-surface-border/50'
                    }`}
                  >
                    <Pill className="w-4 h-4" />
                    <span>Médicament</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTypeProduit('materiel')}
                    className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      typeProduit === 'materiel'
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-background border-surface-border text-foreground hover:bg-surface-border/50'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>Matériel & Fourniture</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTypeProduit('service')}
                    className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      typeProduit === 'service'
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-background border-surface-border text-foreground hover:bg-surface-border/50'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Service Officinal</span>
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  {typeProduit === 'service' ? 'Nom du service / prestation *' : typeProduit === 'materiel' ? 'Désignation du matériel ou fourniture *' : 'Nom commercial ou DCI du médicament *'}
                </label>
                <input 
                  required 
                  type="text" 
                  name="nom" 
                  className={champ} 
                  placeholder={
                    typeProduit === 'service' 
                      ? 'Ex: Contrôle Glycémie, Prise de Tension, Petit Pansement...' 
                      : typeProduit === 'materiel' 
                      ? 'Ex: Déambulateur pliable, Béquilles, Tensiomètre, Boîte de préservatifs...' 
                      : 'Ex: Paracétamol 500mg, Amoxicilline 1g, Arthemeter...'
                  } 
                />
              </div>

              {typeProduit !== 'service' && (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Code-barres / Référence (Optionnel)</label>
                  <input 
                    type="text" 
                    name="code_barres" 
                    className={champ} 
                    placeholder="Scanner ou saisir le code CIP / EAN..." 
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {typeProduit !== 'service' ? (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Quantité en stock *</label>
                    <input 
                      required 
                      type="number" 
                      step="1" 
                      min="0" 
                      name="quantite" 
                      defaultValue="10"
                      className={champ} 
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Disponibilité</label>
                    <input 
                      disabled
                      type="text" 
                      value="Permanente (Service)" 
                      className={`${champ} opacity-70 bg-surface`} 
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Prix de Vente (FCFA) *</label>
                  <input 
                    required 
                    type="number" 
                    step="50" 
                    min="1" 
                    name="prix_vente" 
                    placeholder="Ex: 1500" 
                    className={champ} 
                  />
                </div>
              </div>

              {typeProduit !== 'service' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Prix d'Achat (Optionnel)</label>
                    <input 
                      type="number" 
                      step="50" 
                      min="0" 
                      name="prix_achat" 
                      placeholder="Ex: 1000" 
                      className={champ} 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Date de Péremption *</label>
                    <input 
                      required 
                      type="date" 
                      name="date_peremption" 
                      defaultValue={new Date(Date.now() + 365*2*86400000).toISOString().split('T')[0]}
                      className={champ} 
                    />
                  </div>
                </div>
              )}

              {typeProduit === 'medicament' && (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">N° de Lot Fabricant (Optionnel)</label>
                  <input 
                    type="text" 
                    name="lot" 
                    placeholder="Ex: LOT-2026-X4" 
                    className={champ} 
                  />
                </div>
              )}

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
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
