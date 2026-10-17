'use client'

import { useState } from 'react'
import { Plus, X, Users, Building, ShieldCheck, AlertCircle } from 'lucide-react'
import { ajouterClient } from './actions'

export default function ClientModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [typeClient, setTypeClient] = useState<'particulier' | 'entreprise' | 'mutuelle' | 'assurance'>('particulier')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.set('type_client', typeClient)
    const result = await ajouterClient(formData)

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
        <span>Nouveau Client / Tiers Payant</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-lg border border-surface-border overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center p-5 border-b border-surface-border bg-background/50">
              <div>
                <h3 className="text-lg font-bold font-heading text-foreground">
                  Fiche Client / Tiers Payant
                </h3>
                <p className="text-xs text-foreground-muted">
                  Particulier à crédit, entreprise conventionnée, mutuelle de santé ou assurance
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

              {/* Type de client */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Catégorie de client</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'particulier', label: 'Particulier', icon: Users },
                    { id: 'entreprise', label: 'Entreprise', icon: Building },
                    { id: 'mutuelle', label: 'Mutuelle/IPM', icon: ShieldCheck },
                    { id: 'assurance', label: 'Assurance', icon: ShieldCheck },
                  ].map(tab => {
                    const isActive = typeClient === tab.id
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setTypeClient(tab.id as any)}
                        className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                          isActive
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-background border-surface-border text-foreground hover:bg-surface-border/50'
                        }`}
                      >
                        <tab.icon className="w-4 h-4" />
                        <span className="text-[11px] truncate w-full text-center">{tab.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  {typeClient === 'particulier' ? 'Nom et Prénom du client *' : 'Raison sociale / Nom de l’organisme *'}
                </label>
                <input 
                  required 
                  type="text" 
                  name="nom" 
                  className={champ} 
                  placeholder={
                    typeClient === 'particulier' 
                      ? 'Ex: Amadou Diallo, Mme Sarr...' 
                      : typeClient === 'entreprise' 
                      ? 'Ex: Sonatel, Port Autonome, Senelec...' 
                      : 'Ex: IPM Médina, Mutuelle de Santé, AXA, Sanlam...'
                  } 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Téléphone</label>
                  <input type="text" name="telephone" placeholder="Ex: +221 77 000 00 00" className={champ} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">E-mail</label>
                  <input type="email" name="email" placeholder="contact@..." className={champ} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Adresse / Ville</label>
                <input type="text" name="adresse" placeholder="Ex: Dakar-Plateau, Rue 12..." className={champ} />
              </div>

              {typeClient !== 'particulier' && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-surface-border">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Matricule / Réf. Convention</label>
                    <input type="text" name="matricule_assure" placeholder="Ex: CONV-2026-01" className={champ} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Taux Prise en Charge (%)</label>
                    <input type="number" step="1" min="0" max="100" name="taux_couverture" defaultValue="80" className={champ} />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Plafond de Crédit Autorisé (FCFA)</label>
                <input type="number" step="5000" min="0" name="plafond_credit" placeholder="Ex: 100000 (0 = Pas de limite)" className={champ} />
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
                  {isSubmitting ? 'Enregistrement...' : 'Créer le client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
