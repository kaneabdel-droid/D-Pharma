'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, ScanLine } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { submitVente } from './actions'
import { executeOfflineSafe } from '@/lib/offline/offline-action-helper'

type Medicament = {
  id: string
  nom: string
  code_barres: string | null
  prix_vente: number
  quantite_stock: number
  date_peremption: string
}

type LigneCart = {
  medicament_id: string
  nom: string
  prix_unitaire: number
  quantite: number
}

export default function PointDeVenteClient({ 
  initialMedicaments,
  t = {},
  locale = 'fr'
}: { 
  initialMedicaments: Medicament[]
  t?: any
  locale?: string
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState<LigneCart[]>([])
  const [moyenPaiement, setMoyenPaiement] = useState<'especes' | 'carte' | 'mobile_money'>('especes')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Simulation de scan de code-barres :
  // Si on tape vite, on considère que c'est un scan et on ajoute directement.
  // Pour la simulation manuelle, on ajoute un bouton "Scanner".

  const filteredMedicaments = initialMedicaments.filter(m => 
    m.nom.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.code_barres && m.code_barres.includes(searchTerm))
  )

  const addToCart = (med: Medicament) => {
    setCart(prev => {
      const existing = prev.find(item => item.medicament_id === med.id)
      if (existing) {
        // Optionnel : vérifier si on dépasse le stock
        if (existing.quantite + 1 > med.quantite_stock) return prev
        return prev.map(item => item.medicament_id === med.id ? { ...item, quantite: item.quantite + 1 } : item)
      }
      return [...prev, { medicament_id: med.id, nom: med.nom, prix_unitaire: med.prix_vente, quantite: 1 }]
    })
    setSearchTerm('')
    if (searchInputRef.current) searchInputRef.current.focus()
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.medicament_id === id) {
        const newQ = item.quantite + delta
        return newQ > 0 ? { ...item, quantite: newQ } : item
      }
      return item
    }))
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.medicament_id !== id))
  }

  const totalAmount = cart.reduce((sum, item) => sum + (item.prix_unitaire * item.quantite), 0)

  const handleCheckout = async () => {
    if (cart.length === 0) return
    setIsSubmitting(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('cart', JSON.stringify(cart))
    formData.append('moyen_paiement', moyenPaiement)
    formData.append('montant_total', totalAmount.toString())

    const result = await executeOfflineSafe({
      actionType: 'vente_pos',
      label: `Vente Pharmacie ${moyenPaiement} (${totalAmount.toLocaleString('fr-FR')} FCFA)`,
      payload: {
        cart,
        moyen_paiement: moyenPaiement,
        montant_total: totalAmount
      },
      onlineAction: () => submitVente(formData)
    })

    setIsSubmitting(false)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else if (result.offline) {
      setMessage({ type: 'success', text: '💾 Vente enregistrée hors-ligne ! Les stocks et transactions seront synchronisés dès retour du réseau.' })
      setCart([])
    } else {
      setMessage({ type: 'success', text: 'Vente enregistrée avec succès !' })
      setCart([])
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Colonne de Gauche : Recherche & Scan */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="bg-surface border border-surface-border p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold font-heading text-foreground">{t.title || 'Catalogue Médicaments'}</h2>
            {/* Simulation Scan Code Barres */}
            <button 
              onClick={() => {
                // Simule le scan du premier produit pour la démo
                if (initialMedicaments.length > 0) addToCart(initialMedicaments[0])
              }}
              className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg font-medium hover:bg-primary/20 transition-colors"
            >
              <ScanLine className="w-5 h-5" />
              {t.scanner || 'Simuler Scan'}
            </button>
          </div>
          
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-foreground-muted" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-surface-border rounded-xl bg-background text-foreground focus:ring-primary focus:border-primary transition-shadow shadow-sm"
              placeholder={t.search_placeholder || 'Rechercher par nom ou scanner le code-barres...'}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredMedicaments.slice(0, 12).map(med => (
              <div 
                key={med.id} 
                onClick={() => addToCart(med)}
                className="border border-surface-border rounded-xl p-4 cursor-pointer hover:border-primary hover:shadow-md transition-all group bg-background"
              >
                <div className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">{med.nom}</div>
                <div className="text-sm text-foreground-muted mb-2">Stock: {med.quantite_stock}</div>
                <div className="text-primary font-bold">{med.prix_vente.toLocaleString('fr-FR')} FCFA</div>
              </div>
            ))}
            {filteredMedicaments.length === 0 && (
              <div className="col-span-full text-center py-8 text-foreground-muted">
                Aucun médicament trouvé
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Colonne de Droite : Panier / Ticket de caisse */}
      <div className="bg-surface border-2 border-surface-border rounded-2xl shadow-md flex flex-col h-[calc(100vh-8rem)] sticky top-6">
        <div className="p-5 border-b border-surface-border bg-background/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-heading text-foreground">{t.cart || 'Panier en cours'}</h2>
              <p className="text-xs text-foreground-muted">
                {cart.reduce((s, i) => s + i.quantite, 0)} article(s)
              </p>
            </div>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-xs text-danger hover:underline font-medium px-2 py-1"
            >
              {locale === 'ar' ? 'إفراغ السلة' : locale === 'en' ? 'Clear cart' : 'Vider le panier'}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center text-foreground-muted py-16 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-surface-border/40 flex items-center justify-center mb-3 text-foreground-muted">
                <ShoppingCart className="w-8 h-8 opacity-40" />
              </div>
              <p className="font-semibold text-foreground">{t.empty_cart || 'Le panier est vide'}</p>
              <p className="text-sm mt-1 max-w-xs">{t.search_placeholder || 'Sélectionnez un médicament ou scannez son code-barres pour commencer la vente.'}</p>
            </div>
          ) : (
            cart.map(item => {
              const ligneTotal = item.prix_unitaire * item.quantite
              return (
                <div
                  key={item.medicament_id}
                  className="bg-background p-4 rounded-xl border-2 border-surface-border hover:border-primary/40 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-bold text-foreground leading-snug line-clamp-2">
                        {item.nom}
                      </div>
                      <div className="text-xs font-semibold text-primary mt-0.5">
                        {item.prix_unitaire.toLocaleString(locale === 'ar' ? 'ar-EG' : locale === 'en' ? 'en-US' : 'fr-FR')} FCFA <span className="text-foreground-muted font-normal">/ unité</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-extrabold text-foreground">
                        {ligneTotal.toLocaleString(locale === 'ar' ? 'ar-EG' : locale === 'en' ? 'en-US' : 'fr-FR')} FCFA
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-surface-border/60">
                    <div className="flex items-center gap-1.5 bg-surface border-2 border-surface-border rounded-xl p-0.5 shadow-inner">
                      <button
                        onClick={() => updateQuantity(item.medicament_id, -1)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground hover:bg-background hover:text-primary transition-colors active:scale-95"
                        aria-label="Diminuer la quantité"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center font-bold text-base text-foreground">
                        {item.quantite}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.medicament_id, 1)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground hover:bg-background hover:text-primary transition-colors active:scale-95"
                        aria-label="Augmenter la quantité"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.medicament_id)}
                      className="text-danger/80 hover:text-danger p-2 rounded-lg hover:bg-danger/10 transition-colors"
                      title="Supprimer la ligne"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="p-5 border-t-2 border-surface-border bg-background/80 rounded-b-2xl backdrop-blur-sm">
          {/* Card Total à Payer Haute Visibilité */}
          <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-surface border-2 border-primary/30 rounded-xl p-4 mb-5 shadow-sm">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-xs uppercase tracking-wider font-bold text-foreground-muted">{t.total || 'Total à payer'}</span>
              <span className="text-xs font-semibold text-primary">{cart.length} réf.</span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
              {totalAmount.toLocaleString(locale === 'ar' ? 'ar-EG' : locale === 'en' ? 'en-US' : 'fr-FR')} <span className="text-xl sm:text-2xl font-bold">FCFA</span>
            </div>
          </div>

          {/* Sélecteur Mode de Règlement */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            <button
              type="button"
              onClick={() => setMoyenPaiement('especes')}
              className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all font-semibold text-xs ${
                moyenPaiement === 'especes'
                  ? 'bg-primary text-white border-primary shadow-sm scale-[1.02]'
                  : 'bg-surface border-surface-border text-foreground hover:bg-surface-hover'
              }`}
            >
              <Banknote className="w-5 h-5" />
              <span>{t.cash || 'Espèces'}</span>
            </button>
            <button
              type="button"
              onClick={() => setMoyenPaiement('mobile_money')}
              className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all font-semibold text-xs ${
                moyenPaiement === 'mobile_money'
                  ? 'bg-primary text-white border-primary shadow-sm scale-[1.02]'
                  : 'bg-surface border-surface-border text-foreground hover:bg-surface-hover'
              }`}
            >
              <Smartphone className="w-5 h-5" />
              <span>{t.mobile_money || 'Mobile'}</span>
            </button>
            <button
              type="button"
              onClick={() => setMoyenPaiement('carte')}
              className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all font-semibold text-xs ${
                moyenPaiement === 'carte'
                  ? 'bg-primary text-white border-primary shadow-sm scale-[1.02]'
                  : 'bg-surface border-surface-border text-foreground hover:bg-surface-hover'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span>{t.card || 'Carte'}</span>
            </button>
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${
              message.type === 'success' ? 'bg-success/15 text-success border border-success/30' : 'bg-danger/15 text-danger border border-danger/30'
            }`}>
              {message.text}
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isSubmitting}
            className="w-full bg-primary text-white py-3.5 rounded-xl font-extrabold text-base sm:text-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (locale === 'ar' ? 'جارِ التسجيل...' : locale === 'en' ? 'Processing...' : 'Validation en cours...') : (t.validate || "Valider l'encaissement")}
          </button>
        </div>
      </div>
    </div>
  )
}
