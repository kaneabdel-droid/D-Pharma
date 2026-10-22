'use client'

import { useState } from 'react'
import { CheckCircle, X, ShieldCheck, AlertCircle, PackageCheck, AlertTriangle } from 'lucide-react'
import { accuserReception } from './actions'

type CommandeLigne = {
  id: string
  medicament_id: string
  quantite_commandee: number
  quantite_recue?: number
  prix_achat_unitaire?: number
  medicaments: {
    id: string
    nom: string
  }
}

type Commande = {
  id: string
  statut: string
  date_commande: string
  date_reception?: string | null
  fournisseurs_labo: {
    id: string
    nom: string
  }
  lignes_commande_labo: CommandeLigne[]
}

type StockInfo = {
  prix_vente: number
  prix_achat?: number
  lot?: string | null
  date_peremption?: string | null
}

export default function ReceiveCommandeModal({
  commande,
  stockMap = {}
}: {
  commande: Commande
  stockMap?: Record<string, StockInfo>
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [constaterAchat, setConstaterAchat] = useState(true)

  // Initialisation des lignes de contrôle
  const defaultPeremption = new Date()
  defaultPeremption.setFullYear(defaultPeremption.getFullYear() + 2)
  const defaultPeremptionStr = defaultPeremption.toISOString().split('T')[0]

  const [lignes, setLignes] = useState(() => {
    return (commande.lignes_commande_labo || []).map((l) => {
      const stock = stockMap[l.medicament_id] || {}
      return {
        ligne_id: l.id,
        medicament_id: l.medicament_id,
        nom: l.medicaments?.nom || 'Article',
        quantite_commandee: Number(l.quantite_commandee || 1),
        quantite_recue: Number(l.quantite_commandee || 1),
        prix_achat: Number(l.prix_achat_unitaire || stock.prix_achat || 0),
        prix_vente: Number(stock.prix_vente || 0),
        lot: stock.lot || `REC-${Date.now().toString().slice(-6)}`,
        date_peremption: stock.date_peremption ? stock.date_peremption.split('T')[0] : defaultPeremptionStr
      }
    })
  })

  const updateLigne = (idx: number, field: string, value: any) => {
    setLignes(prev => prev.map((item, i) => {
      if (i === idx) {
        return { ...item, [field]: value }
      }
      return item
    }))
  }

  // Calcul du montant total de la livraison
  const totalAchat = lignes.reduce((sum, item) => sum + (Number(item.quantite_recue || 0) * Number(item.prix_achat || 0)), 0)

  // Vérifier si un prix de vente est manquant ou nul
  const missingSellingPrice = lignes.some(l => !l.prix_vente || Number(l.prix_vente) <= 0)

  const handleOpen = () => {
    setError(null)
    setLignes((commande.lignes_commande_labo || []).map((l) => {
      const stock = stockMap[l.medicament_id] || {}
      return {
        ligne_id: l.id,
        medicament_id: l.medicament_id,
        nom: l.medicaments?.nom || 'Article',
        quantite_commandee: Number(l.quantite_commandee || 1),
        quantite_recue: Number(l.quantite_commandee || 1),
        prix_achat: Number(l.prix_achat_unitaire || stock.prix_achat || 0),
        prix_vente: Number(stock.prix_vente || 0),
        lot: `REC-${Date.now().toString().slice(-6)}`,
        date_peremption: stock.date_peremption ? stock.date_peremption.split('T')[0] : defaultPeremptionStr
      }
    }))
    setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (missingSellingPrice) {
      setError('Veuillez renseigner un Prix de Vente valide (> 0) pour chaque médicament afin de permettre la vente au comptoir.')
      return
    }

    setIsSubmitting(true)

    const formData = new FormData()
    formData.append('commande_id', commande.id)
    formData.append('constater_achat', constaterAchat ? 'true' : 'false')
    formData.append('lignes', JSON.stringify(lignes))

    const result = await accuserReception(formData)

    setIsSubmitting(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setIsOpen(false)
    }
  }

  const champ = 'w-full border border-surface-border rounded-xl px-2.5 py-1.5 bg-background text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all'

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-success/10 text-success hover:bg-success/20 transition-colors shadow-xs"
        title="Contrôler la réception, vérifier les prix et mettre en stock"
      >
        <PackageCheck className="w-4 h-4" />
        <span>Réceptionner</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-4xl border border-surface-border overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-surface-border bg-background/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-success/15 text-success">
                  <PackageCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-heading text-foreground">
                    Contrôle de Réception & Mise en Stock
                  </h3>
                  <p className="text-xs text-foreground-muted">
                    Fournisseur : <strong className="text-foreground">{commande.fournisseurs_labo?.nom}</strong> • Commande du {new Date(commande.date_commande).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1.5 rounded-xl text-foreground-muted hover:text-foreground hover:bg-surface-border transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {error && (
                  <div className="bg-danger/10 text-danger border border-danger/20 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Explication claire */}
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3.5 flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-xs text-foreground-muted leading-relaxed">
                    <p className="font-semibold text-foreground mb-0.5">Mise en rayon & Constatation comptable :</p>
                    Vérifiez les quantités reçues, confirmez le <strong>prix d'achat grossiste</strong> et le <strong>prix de vente au comptoir</strong>. Les articles seront immédiatement disponibles à la vente au POS, et la facture d'achat sera imputée en comptabilité (Journal des Achats).
                  </div>
                </div>

                {/* Tableau des lignes de réception */}
                <div className="border border-surface-border rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-surface-border text-left">
                      <thead className="bg-background/80 text-[11px] font-bold uppercase text-foreground-muted">
                        <tr>
                          <th className="py-2.5 px-3">Médicament / Produit</th>
                          <th className="py-2.5 px-2 text-center w-20">Cmd</th>
                          <th className="py-2.5 px-2 w-24">Qté Reçue *</th>
                          <th className="py-2.5 px-2 w-28">Prix Achat *</th>
                          <th className="py-2.5 px-2 w-28">Prix Vente *</th>
                          <th className="py-2.5 px-2 w-28">N° de Lot</th>
                          <th className="py-2.5 px-3 w-32">Péremption *</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border bg-surface text-xs">
                        {lignes.map((ligne, idx) => (
                          <tr key={ligne.ligne_id} className="hover:bg-background/40 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-foreground">
                              {ligne.nom}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-foreground-muted font-medium">
                              {ligne.quantite_commandee}
                            </td>
                            <td className="py-2 px-2">
                              <input
                                required
                                type="number"
                                step="any"
                                min="0"
                                value={ligne.quantite_recue}
                                onChange={(e) => updateLigne(idx, 'quantite_recue', parseFloat(e.target.value) || 0)}
                                className={`${champ} text-center font-bold`}
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                required
                                type="number"
                                step="any"
                                min="0"
                                value={ligne.prix_achat}
                                onChange={(e) => updateLigne(idx, 'prix_achat', parseFloat(e.target.value) || 0)}
                                className={champ}
                                placeholder="0"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                required
                                type="number"
                                step="any"
                                min="1"
                                value={ligne.prix_vente}
                                onChange={(e) => updateLigne(idx, 'prix_vente', parseFloat(e.target.value) || 0)}
                                className={`${champ} font-bold text-primary ${!ligne.prix_vente || ligne.prix_vente <= 0 ? 'border-warning ring-1 ring-warning' : ''}`}
                                placeholder="Prix vente"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={ligne.lot}
                                onChange={(e) => updateLigne(idx, 'lot', e.target.value)}
                                className={champ}
                                placeholder="Lot..."
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                required
                                type="date"
                                value={ligne.date_peremption}
                                onChange={(e) => updateLigne(idx, 'date_peremption', e.target.value)}
                                className={champ}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Option de constatation comptable automatique */}
                <div className="bg-background/70 border border-surface-border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={constaterAchat}
                      onChange={(e) => setConstaterAchat(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary border-surface-border bg-surface"
                    />
                    <div className="text-xs">
                      <p className="font-semibold text-foreground">Constater la facture d'achat en comptabilité</p>
                      <p className="text-foreground-muted">Génère l'écriture Débit 601 (Achats) / Crédit 401 (Fournisseur) et met à jour la dette</p>
                    </div>
                  </label>

                  <div className="text-right sm:border-l sm:border-surface-border sm:pl-4">
                    <span className="text-[11px] font-medium text-foreground-muted block">Total Facture Achat :</span>
                    <span className="text-lg font-bold font-heading text-foreground">
                      {totalAchat.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>

                {missingSellingPrice && (
                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-xl flex items-center gap-2 text-warning text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Attention : Un ou plusieurs produits ont un prix de vente à 0 FCFA. Veuillez saisir leur prix de vente public pour permettre leur facturation au POS.</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-surface-border bg-background/50 flex justify-between items-center">
                <span className="text-xs text-foreground-muted font-medium">
                  {lignes.length} article(s) contrôlé(s)
                </span>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-foreground-muted hover:text-foreground font-semibold text-xs rounded-xl hover:bg-background transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-success text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-success/90 disabled:opacity-50 transition-all shadow-sm flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{isSubmitting ? 'Traitement en cours...' : 'Valider la Réception & Mettre en Stock'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
