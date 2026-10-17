'use client'

import { useState, useRef } from 'react'
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, ScanLine, Stethoscope, Pill, Sparkles, Filter } from 'lucide-react'
import { submitVente } from './actions'
import { executeOfflineSafe } from '@/lib/offline/offline-action-helper'

export type Medicament = {
  id: string
  nom: string
  code_barres: string | null
  type_produit?: string
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
  const [selectedCategory, setSelectedCategory] = useState<'tous' | 'medicament' | 'materiel' | 'service'>('tous')
  const [cart, setCart] = useState<LigneCart[]>([])
  const [moyenPaiement, setMoyenPaiement] = useState<'especes' | 'carte' | 'mobile_money'>('especes')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const searchInputRef = useRef<HTMLInputElement>(null)

  const filteredMedicaments = initialMedicaments.filter(m => {
    const matchesSearch = m.nom.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (m.code_barres && m.code_barres.toLowerCase().includes(searchTerm.toLowerCase()))
    
    if (!matchesSearch) return false

    if (selectedCategory === 'tous') return true
    if (selectedCategory === 'service') return m.type_produit === 'service'
    if (selectedCategory === 'materiel') return m.type_produit === 'materiel' || m.type_produit === 'fourniture'
    if (selectedCategory === 'medicament') return !m.type_produit || m.type_produit === 'medicament'
    return true
  })

  const addToCart = (med: Medicament) => {
    setCart(prev => {
      const existing = prev.find(item => item.medicament_id === med.id)
      if (existing) {
        if (med.type_produit !== 'service' && existing.quantite + 1 > med.quantite_stock) return prev
        return prev.map(item => item.medicament_id === med.id ? { ...item, quantite: item.quantite + 1 } : item)
      }
      return [...prev, { medicament_id: med.id, nom: med.nom, prix_unitaire: med.prix_vente, quantite: 1 }]
    })
    setSearchTerm('')
    if (searchInputRef.current) searchInputRef.current.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredMedicaments.length > 0) {
        const exact = filteredMedicaments.find(m => m.code_barres && m.code_barres.toLowerCase() === searchTerm.trim().toLowerCase())
        addToCart(exact || filteredMedicaments[0])
      }
    }
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Colonne de Gauche : Catalogue, Filtres et Recherche compacte */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
        <div className="bg-surface border border-surface-border p-4 sm:p-5 rounded-2xl shadow-sm">
          {/* Titre et statut scanner */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-lg font-bold font-heading text-foreground">{t.title || 'Catalogue Officinal'}</h2>
              <p className="text-xs text-foreground-muted">Médicaments, matériels médicaux et services de santé</p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-semibold">
                <ScanLine className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Douchette USB & Scan Actifs</span>
                <span className="sm:hidden">Scan Actif</span>
              </div>
              {initialMedicaments.length > 0 && (
                <button 
                  type="button"
                  title="Ajouter un article pour tester le scan sans douchette"
                  onClick={() => addToCart(initialMedicaments[0])}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Test Scan</span>
                </button>
              )}
            </div>
          </div>

          {/* Filtres par type */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {[
              { id: 'tous', label: `Tous (${initialMedicaments.length})` },
              { id: 'medicament', label: 'Médicaments', icon: Pill },
              { id: 'materiel', label: 'Matériels & Fournitures', icon: Stethoscope },
              { id: 'service', label: 'Services Officinaux', icon: Sparkles },
            ].map(tab => {
              const isActive = selectedCategory === tab.id
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id as any)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-background text-foreground-muted hover:text-foreground border border-surface-border'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
          
          {/* Barre de recherche compacte */}
          <div className="relative mb-3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-foreground-muted" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="block w-full pl-9 pr-3 py-2 text-sm border border-surface-border rounded-xl bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-shadow shadow-sm"
              placeholder={t.search_placeholder || 'Rechercher par nom ou scanner le code-barres (Touche Entrée)...'}
              autoFocus
            />
          </div>

          {/* Grille des articles compacte */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[520px] overflow-y-auto pr-1">
            {filteredMedicaments.slice(0, 24).map(med => {
              const isService = med.type_produit === 'service'
              const isMateriel = med.type_produit === 'materiel' || med.type_produit === 'fourniture'
              return (
                <div 
                  key={med.id} 
                  onClick={() => addToCart(med)}
                  className="border border-surface-border rounded-xl p-3 cursor-pointer hover:border-primary hover:shadow-sm transition-all group bg-background flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isService
                          ? 'bg-purple-500/10 text-purple-600'
                          : isMateriel
                          ? 'bg-cyan-500/10 text-cyan-600'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {isService ? 'Service' : isMateriel ? 'Matériel' : 'Médicament'}
                      </span>
                      <span className="text-[11px] text-foreground-muted">
                        {isService ? 'Actif' : `Stock: ${med.quantite_stock}`}
                      </span>
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {med.nom}
                    </div>
                  </div>
                  <div className="text-primary font-extrabold text-xs sm:text-sm mt-2">
                    {med.prix_vente.toLocaleString('fr-FR')} FCFA
                  </div>
                </div>
              )
            })}
            {filteredMedicaments.length === 0 && (
              <div className="col-span-full text-center py-10 text-foreground-muted text-xs">
                Aucun article ou prestation trouvé
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Colonne de Droite : Panier / Ticket de caisse - HAUTEUR MAXIMISÉE */}
      <div className="lg:col-span-5 xl:col-span-4 bg-surface border-2 border-surface-border rounded-2xl shadow-lg flex flex-col h-[calc(100vh-5.5rem)] min-h-[580px] max-h-[850px] sticky top-4">
        {/* En-tête compact du panier */}
        <div className="px-4 py-3 border-b border-surface-border bg-background/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-heading text-foreground">{t.cart || 'Panier en cours'}</h2>
              <span className="text-[11px] text-foreground-muted">
                {cart.reduce((s, i) => s + i.quantite, 0)} article(s) • {cart.length} réf.
              </span>
            </div>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-xs text-danger hover:underline font-semibold px-2 py-1"
            >
              {locale === 'ar' ? 'إفراغ السلة' : locale === 'en' ? 'Clear cart' : 'Vider le panier'}
            </button>
          )}
        </div>

        {/* Liste défilante des articles - HAUTEUR MAXIMISÉE POUR VISIBILITÉ TOTALE */}
        <div className="flex-1 overflow-y-auto px-3.5 py-2.5 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-foreground-muted">
              <div className="w-14 h-14 rounded-2xl bg-surface-border/40 flex items-center justify-center mb-2.5 text-foreground-muted">
                <ShoppingCart className="w-7 h-7 opacity-40 text-primary" />
              </div>
              <p className="font-semibold text-sm text-foreground">{t.empty_cart || 'Le panier est vide'}</p>
              <p className="text-xs mt-1 max-w-xs text-foreground-muted">
                Sélectionnez un médicament, matériel ou service dans le catalogue ou scannez son code-barres.
              </p>
            </div>
          ) : (
            cart.map(item => {
              const ligneTotal = item.prix_unitaire * item.quantite
              return (
                <div
                  key={item.medicament_id}
                  className="bg-background p-3 rounded-xl border border-surface-border hover:border-primary/50 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-foreground leading-snug line-clamp-2">
                        {item.nom}
                      </div>
                      <div className="text-xs font-semibold text-primary mt-0.5">
                        {item.prix_unitaire.toLocaleString('fr-FR')} FCFA <span className="text-foreground-muted font-normal text-[11px]">/ unité</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-foreground">
                        {ligneTotal.toLocaleString('fr-FR')} FCFA
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-surface-border/60">
                    <div className="flex items-center gap-1 bg-surface border border-surface-border rounded-lg p-0.5">
                      <button
                        onClick={() => updateQuantity(item.medicament_id, -1)}
                        className="w-7 h-7 rounded flex items-center justify-center text-foreground hover:bg-background hover:text-primary transition-colors active:scale-95"
                        aria-label="Diminuer la quantité"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-bold text-sm text-foreground">
                        {item.quantite}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.medicament_id, 1)}
                        className="w-7 h-7 rounded flex items-center justify-center text-foreground hover:bg-background hover:text-primary transition-colors active:scale-95"
                        aria-label="Augmenter la quantité"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.medicament_id)}
                      className="text-danger/80 hover:text-danger p-1.5 rounded-lg hover:bg-danger/10 transition-colors"
                      title="Supprimer la ligne"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pied de page compact du panier */}
        <div className="p-3.5 border-t-2 border-surface-border bg-background/90 rounded-b-2xl backdrop-blur-sm">
          {/* Total à Payer épuré */}
          <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-surface border border-primary/30 rounded-xl p-3 mb-3 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-foreground-muted">{t.total || 'Total à payer'}</span>
              <div className="text-xs text-primary font-medium">{cart.length} référence(s)</div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
              {totalAmount.toLocaleString('fr-FR')} <span className="text-base sm:text-lg font-bold">FCFA</span>
            </div>
          </div>

          {/* Sélecteur Mode de Règlement compact */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button
              type="button"
              onClick={() => setMoyenPaiement('especes')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl border transition-all font-semibold text-xs ${
                moyenPaiement === 'especes'
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-surface border-surface-border text-foreground hover:bg-surface-hover'
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>{t.cash || 'Espèces'}</span>
            </button>
            <button
              type="button"
              onClick={() => setMoyenPaiement('mobile_money')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl border transition-all font-semibold text-xs ${
                moyenPaiement === 'mobile_money'
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-surface border-surface-border text-foreground hover:bg-surface-hover'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>{t.mobile_money || 'Mobile'}</span>
            </button>
            <button
              type="button"
              onClick={() => setMoyenPaiement('carte')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl border transition-all font-semibold text-xs ${
                moyenPaiement === 'carte'
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-surface border-surface-border text-foreground hover:bg-surface-hover'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>{t.card || 'Carte'}</span>
            </button>
          </div>

          {message && (
            <div className={`mb-3 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              message.type === 'success' ? 'bg-success/15 text-success border border-success/30' : 'bg-danger/15 text-danger border border-danger/30'
            }`}>
              {message.text}
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isSubmitting}
            className="w-full bg-primary text-white py-2.5 rounded-xl font-bold text-sm sm:text-base hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Validation...' : (t.validate || "Valider l'encaissement")}
          </button>
        </div>
      </div>
    </div>
  )
}
