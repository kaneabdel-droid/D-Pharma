'use client'

import { useState } from 'react'
import { DollarSign, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { enregistrerMouvementCreance } from './actions'

type Client = {
  id: string
  nom: string
  type_client: string
  solde_creance: number
}

export default function ReglementClientModal({ clients }: { clients: Client[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedClient = clients.find(c => c.id === selectedClientId)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await enregistrerMouvementCreance(formData)

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
        <span>Encaisser un Règlement</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-md border border-surface-border overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center p-5 border-b border-surface-border bg-background/50">
              <div>
                <h3 className="text-lg font-bold font-heading text-foreground">
                  Règlement de Créance
                </h3>
                <p className="text-xs text-foreground-muted">
                  Enregistrer un paiement de particulier, entreprise ou remboursement mutuelle
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
                <label className="block text-xs font-semibold text-foreground mb-1">Client ou Organisme payeur *</label>
                <select 
                  name="client_id" 
                  required 
                  value={selectedClientId} 
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className={champ}
                >
                  <option value="">Sélectionner le client / l’organisme</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nom} ({Number(c.solde_creance || 0).toLocaleString('fr-FR')} FCFA dû)
                    </option>
                  ))}
                </select>
              </div>

              {selectedClient && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                  <span className="text-xs text-foreground-muted font-medium">Créance actuelle :</span>
                  <span className="text-sm font-extrabold text-primary">
                    {Number(selectedClient.solde_creance || 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Type d'opération</label>
                <select name="type_mouvement" defaultValue="reglement" className={champ}>
                  <option value="reglement">Paiement reçu / Encaissement de créance (Diminue la dette)</option>
                  <option value="facture_credit">Vente accordée à crédit (Augmente la dette)</option>
                  <option value="prise_en_charge">Prise en charge tiers payant (Augmente la créance mutuelle)</option>
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
                    placeholder="Ex: 25000" 
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
                <label className="block text-xs font-semibold text-foreground mb-1">N° de Reçu / Pièce / Chèque</label>
                <input type="text" name="numero_piece" placeholder="Ex: RECU-001, CHQ-8291..." className={champ} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Libellé / Remarques *</label>
                <input 
                  required 
                  type="text" 
                  name="libelle" 
                  placeholder="Ex: Règlement partiel ordonnance M. Diallo, Virement IPM..." 
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
                  {isSubmitting ? 'Validation...' : 'Valider le mouvement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
