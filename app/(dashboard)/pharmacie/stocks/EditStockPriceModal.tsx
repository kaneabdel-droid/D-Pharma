'use client'

import { useState } from 'react'
import { Pencil, X, Check, AlertCircle, ShieldCheck, Tag } from 'lucide-react'
import { updateStockPrice } from './actions'

type StockItem = {
  id: string
  quantite: number
  prix_vente: number
  prix_achat?: number
  date_peremption: string
  lot?: string | null
  medicaments: {
    nom: string
    code_barres?: string | null
    type_produit?: string | null
  }
}

export default function EditStockPriceModal({ stock }: { stock: StockItem }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const isService = stock.medicaments.type_produit === 'service'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.set('stock_id', stock.id)

    const result = await updateStockPrice(formData)

    setIsSubmitting(false)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setIsOpen(false)
      }, 700)
    }
  }

  const champ = 'w-full border border-surface-border rounded-xl px-3.5 py-2.5 bg-background text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all'

  return (
    <>
      <button
        onClick={() => { setIsOpen(true); setError(null); setSuccess(false) }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-surface hover:bg-surface-border/50 text-foreground border border-surface-border transition-colors shadow-xs"
        title="Modifier le prix de vente ou le lot"
      >
        <Pencil className="w-3.5 h-3.5 text-primary" />
        <span>Modifier Prix</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-lg border border-surface-border overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center p-5 border-b border-surface-border bg-background/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-heading text-foreground">
                    Ajuster le Prix & Données du Stock
                  </h3>
                  <p className="text-xs text-foreground-muted font-medium">
                    {stock.medicaments.nom} {stock.medicaments.code_barres ? `(${stock.medicaments.code_barres})` : ''}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-border transition-colors"
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

              {/* Bannière explicative rassurante sur la non-rétroactivité */}
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3.5 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-foreground-muted leading-relaxed">
                  <p className="font-semibold text-foreground mb-0.5">Intégrité historique garantie :</p>
                  Ce nouveau prix s’appliquera <strong className="text-primary font-bold">uniquement aux prochaines ventes au comptoir (POS)</strong>. Tous les tickets de caisse, factures mutuelles et écritures comptables déjà passés restent rigoureusement intacts.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Nouveau Prix de Vente (FCFA) *
                  </label>
                  <input 
                    required 
                    type="number" 
                    step="any" 
                    min="1" 
                    name="prix_vente" 
                    defaultValue={stock.prix_vente}
                    className={`${champ} font-bold text-primary`} 
                  />
                  <span className="text-[10px] text-foreground-muted">Prix unitaire facturé au client</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Prix d'Achat Unitaire (FCFA)
                  </label>
                  <input 
                    type="number" 
                    step="any" 
                    min="0" 
                    name="prix_achat" 
                    defaultValue={stock.prix_achat || 0}
                    className={champ} 
                  />
                  <span className="text-[10px] text-foreground-muted">Coût d'achat grossiste / labo</span>
                </div>
              </div>

              {!isService && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      N° de Lot (Fabricant)
                    </label>
                    <input 
                      type="text" 
                      name="lot" 
                      defaultValue={stock.lot || ''}
                      placeholder="Ex: LOT-SL-2026"
                      className={champ} 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Date de Péremption
                    </label>
                    <input 
                      type="date" 
                      name="date_peremption" 
                      defaultValue={stock.date_peremption ? stock.date_peremption.split('T')[0] : ''}
                      className={champ} 
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-surface-border flex justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)} 
                  className="px-4 py-2 text-foreground-muted hover:text-foreground font-semibold text-xs rounded-xl hover:bg-background transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || success} 
                  className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-primary-hover disabled:opacity-50 transition-all shadow-sm flex items-center gap-1.5"
                >
                  {success ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Modifié !</span>
                    </>
                  ) : isSubmitting ? (
                    <span>Enregistrement...</span>
                  ) : (
                    <span>Appliquer le nouveau prix</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
