'use client'

import { useState, useRef, useTransition } from 'react'
import { 
  Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, 
  Smartphone, ScanLine, Stethoscope, Pill, Sparkles, Filter, 
  RotateCcw, AlertTriangle, CheckCircle2, History, UserCheck, 
  Building2, Landmark, Wallet, ArrowUpRight, ArrowDownRight, X, Clock
} from 'lucide-react'
import { submitVente, annulerVente } from './actions'
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

export type Compte = {
  id: string
  nom: string
  type?: string
  type_compte?: string
}

export type ClientExterne = {
  id: string
  nom: string
  type_client?: string
  telephone?: string | null
  taux_couverture?: number
  plafond_credit?: number
  solde_creance?: number
}

export default function PointDeVenteClient({ 
  initialMedicaments,
  comptes = [],
  clients = [],
  recentVentes = [],
  t = {},
  locale = 'fr'
}: { 
  initialMedicaments: Medicament[]
  comptes?: Compte[]
  clients?: ClientExterne[]
  recentVentes?: any[]
  t?: any
  locale?: string
}) {
  const [activeTab, setActiveTab] = useState<'pos' | 'historique'>('pos')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'tous' | 'medicament' | 'materiel' | 'service'>('tous')
  const [cart, setCart] = useState<LigneCart[]>([])
  
  // Modes de règlement: especes, mobile_money, carte, credit
  const [moyenPaiement, setMoyenPaiement] = useState<'especes' | 'mobile_money' | 'carte' | 'credit'>('especes')
  
  // Sélection du compte de trésorerie précis (Caisse, Wave, Orange Money, Banque)
  const [compteTresorerieId, setCompteTresorerieId] = useState<string>(() => {
    const defaultCaisse = comptes.find(c => c.nom?.toLowerCase().includes('caisse') || c.type === 'caisse')
    return defaultCaisse ? defaultCaisse.id : (comptes[0]?.id || '')
  })

  // Sélection du client pour la vente à crédit
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // État d'annulation de vente
  const [venteAAnnuler, setVenteAAnnuler] = useState<any | null>(null)
  const [motifAnnulation, setMotifAnnulation] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)
  const [rechercheHistorique, setRechercheHistorique] = useState('')

  const searchInputRef = useRef<HTMLInputElement>(null)

  // Filtrage du catalogue
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

  // Gestion du panier
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

  // Données du client sélectionné
  const selectedClient = clients.find(c => c.id === selectedClientId)
  const tauxCouverture = Number(selectedClient?.taux_couverture || 0)
  
  // Calcul part patient / part crédit
  let partCreditCalculee = 0
  let partPatientCalculee = totalAmount

  if (moyenPaiement === 'credit') {
    if (tauxCouverture > 0 && tauxCouverture <= 100) {
      partCreditCalculee = Math.round((totalAmount * tauxCouverture) / 100)
      partPatientCalculee = totalAmount - partCreditCalculee
    } else {
      partCreditCalculee = totalAmount
      partPatientCalculee = 0
    }
  }

  // Liste filtrée des comptes Mobile Money disponibles
  const mobileMoneyAccounts = comptes.filter(c => 
    c.type === 'mobile_money' || 
    c.type_compte === 'mobile_money' || 
    c.nom?.toLowerCase().includes('wave') || 
    c.nom?.toLowerCase().includes('orange') || 
    c.nom?.toLowerCase().includes('free') || 
    c.nom?.toLowerCase().includes('mobile')
  )

  // Changer de mode et adapter le compte de trésorerie par défaut
  const handleSelectMoyenPaiement = (mode: 'especes' | 'mobile_money' | 'carte' | 'credit') => {
    setMoyenPaiement(mode)
    if (mode === 'especes') {
      const c = comptes.find(c => c.nom?.toLowerCase().includes('caisse') || c.type === 'caisse')
      if (c) setCompteTresorerieId(c.id)
    } else if (mode === 'mobile_money') {
      // Si un compte mobile money existe, le pré-sélectionner
      if (mobileMoneyAccounts.length > 0) {
        // Préserver le compte actuel s'il fait déjà partie des comptes mobile money
        const isAlreadyMM = mobileMoneyAccounts.some(a => a.id === compteTresorerieId)
        if (!isAlreadyMM) {
          setCompteTresorerieId(mobileMoneyAccounts[0].id)
        }
      }
    } else if (mode === 'carte') {
      const c = comptes.find(c => c.nom?.toLowerCase().includes('banque') || c.nom?.toLowerCase().includes('cbao') || c.type === 'banque')
      if (c) setCompteTresorerieId(c.id)
    }
  }

  // Soumission de la vente
  const handleCheckout = async () => {
    if (cart.length === 0) return
    if (moyenPaiement === 'credit' && !selectedClientId) {
      setMessage({ type: 'error', text: '⚠️ En vente à crédit, vous devez obligatoirement sélectionner le client ou l\'organisme payeur.' })
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('cart', JSON.stringify(cart))
    formData.append('moyen_paiement', moyenPaiement)
    formData.append('montant_total', totalAmount.toString())
    formData.append('compte_tresorerie_id', compteTresorerieId || '')
    formData.append('client_id', selectedClientId || '')
    formData.append('part_patient', partPatientCalculee.toString())
    formData.append('part_credit', partCreditCalculee.toString())

    const result = await executeOfflineSafe({
      actionType: 'vente_pos',
      label: `Vente Pharmacie ${moyenPaiement} (${totalAmount.toLocaleString('fr-FR')} FCFA)`,
      payload: {
        cart,
        moyen_paiement: moyenPaiement,
        montant_total: totalAmount,
        compte_tresorerie_id: compteTresorerieId,
        client_id: selectedClientId,
        part_patient: partPatientCalculee,
        part_credit: partCreditCalculee
      },
      onlineAction: () => submitVente(formData)
    })

    setIsSubmitting(false)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else if (result.offline) {
      setMessage({ type: 'success', text: '💾 Vente enregistrée hors-ligne ! Les stocks et écritures comptables seront synchronisés dès retour du réseau.' })
      setCart([])
    } else {
      const ticket = (result as any)?.numero_ticket || 'Généré'
      setMessage({ type: 'success', text: `✓ Vente enregistrée avec succès ! Ticket ${ticket} comptabilisé dans le journal de vente et trésorerie.` })
      setCart([])
    }
  }

  // Confirmation de l'annulation d'une vente
  const handleConfirmerAnnulation = async () => {
    if (!venteAAnnuler) return
    setIsCancelling(true)

    const res = await annulerVente(venteAAnnuler.id, motifAnnulation)
    setIsCancelling(false)

    if (res?.error) {
      alert(res.error)
    } else {
      setVenteAAnnuler(null)
      setMotifAnnulation('')
      alert('✓ Vente annulée avec succès : stocks rétablis, écritures comptables contre-passées et caisse/crédit régularisés.')
    }
  }

  // Filtrage de l'historique des ventes
  const ventesFiltrees = recentVentes.filter(v => {
    const q = rechercheHistorique.toLowerCase().trim()
    if (!q) return true
    const ticketMatch = v.numero_ticket?.toLowerCase().includes(q)
    const clientMatch = v.clients_externes?.nom?.toLowerCase().includes(q)
    const modeMatch = v.moyen_paiement?.toLowerCase().includes(q)
    return ticketMatch || clientMatch || modeMatch
  })

  return (
    <div className="space-y-5">
      {/* Barre de navigation interne Point de Vente vs Historique */}
      <div className="flex items-center justify-between border-b border-surface-border pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'pos'
                ? 'bg-primary text-white shadow-md'
                : 'bg-surface text-foreground-muted hover:text-foreground border border-surface-border'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Point de Vente (Caisse)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('historique')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'historique'
                ? 'bg-primary text-white shadow-md'
                : 'bg-surface text-foreground-muted hover:text-foreground border border-surface-border'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historique & Annulation des Ventes</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-current font-extrabold">
              {recentVentes.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-foreground-muted flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Comptabilité & Trésorerie synchronisées en temps réel</span>
        </div>
      </div>

      {activeTab === 'pos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Colonne de Gauche : Catalogue, Filtres et Recherche compacte */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
            <div className="bg-surface border border-surface-border p-4 sm:p-5 rounded-2xl shadow-sm">
              {/* Titre et statut scanner */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-lg font-bold font-heading text-foreground">{t.title || 'Catalogue Officinal'}</h2>
                  <p className="text-xs text-foreground-muted">Médicaments, matériels médicaux et services</p>
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

              {/* Filtres par catégorie */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[
                  { id: 'tous', label: `${t.cat_all || 'Tous'} (${initialMedicaments.length})` },
                  { id: 'medicament', label: t.cat_meds || 'Médicaments', icon: Pill },
                  { id: 'materiel', label: t.cat_mat || 'Matériels & Fournitures', icon: Stethoscope },
                  { id: 'service', label: t.cat_services || 'Services Officinaux', icon: Sparkles },
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
              
              {/* Barre de recherche */}
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

              {/* Grille du catalogue */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[520px] overflow-y-auto pr-1">
                {filteredMedicaments.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-foreground-muted">
                    <p className="text-sm font-semibold">Aucun article trouvé</p>
                    <p className="text-xs mt-1">Modifiez vos critères de recherche ou ajoutez des stocks.</p>
                  </div>
                ) : (
                  filteredMedicaments.map(med => {
                    const rupture = med.type_produit !== 'service' && med.quantite_stock <= 0
                    return (
                      <div
                        key={med.id}
                        onClick={() => !rupture && addToCart(med)}
                        className={`group relative flex flex-col justify-between p-3 rounded-2xl border transition-all text-left ${
                          rupture
                            ? 'opacity-40 bg-background/50 border-surface-border cursor-not-allowed'
                            : 'bg-background hover:bg-surface-hover hover:border-primary/50 cursor-pointer shadow-sm hover:shadow'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                              {med.type_produit === 'service' ? 'Service' : med.type_produit === 'materiel' ? 'Matériel' : 'Médicament'}
                            </span>
                            {med.type_produit !== 'service' && (
                              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                                med.quantite_stock <= 5 
                                  ? 'bg-danger/10 text-danger' 
                                  : 'bg-emerald-500/10 text-emerald-600'
                              }`}>
                                {med.quantite_stock} dispo
                              </span>
                            )}
                          </div>
                          <h3 className="text-xs sm:text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                            {med.nom}
                          </h3>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-surface-border/60 flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-black text-foreground">
                            {med.prix_vente.toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-foreground-muted">FCFA</span>
                          </span>
                          <button
                            type="button"
                            disabled={rupture}
                            className="w-7 h-7 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all"
                            title="Ajouter au ticket"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Colonne de Droite : Panier, Règlement, Crédit & Caisse */}
          <div className="lg:col-span-5 xl:col-span-4 bg-surface border border-surface-border rounded-2xl shadow-sm flex flex-col">
            <div className="p-4 border-b border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-foreground font-heading">Panier d&apos;Encaissement</h3>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-danger hover:underline flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Vider</span>
                </button>
              )}
            </div>

            {/* Liste des articles du panier */}
            <div className="p-3.5 flex-1 max-h-[280px] overflow-y-auto space-y-2">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-foreground-muted">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-20 text-primary" />
                  <p className="text-xs font-semibold">Le ticket est vide</p>
                  <p className="text-[11px] text-foreground-muted mt-0.5">Scannez un code-barres ou cliquez sur un produit.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div
                    key={item.medicament_id}
                    className="bg-background p-2.5 rounded-xl border border-surface-border flex items-center justify-between gap-2 shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">{item.nom}</p>
                      <p className="text-[11px] font-semibold text-primary">
                        {item.prix_unitaire.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.medicament_id, -1)}
                        className="w-6 h-6 rounded bg-surface border border-surface-border flex items-center justify-center text-foreground hover:text-primary"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-foreground">{item.quantite}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.medicament_id, 1)}
                        className="w-6 h-6 rounded bg-surface border border-surface-border flex items-center justify-center text-foreground hover:text-primary"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.medicament_id)}
                        className="ml-1 p-1 text-danger/70 hover:text-danger rounded"
                        title="Retirer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pied du panier et règlement */}
            <div className="p-4 border-t border-surface-border bg-background/50 rounded-b-2xl space-y-3.5">
              {/* Total à Payer */}
              <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-surface border border-primary/30 rounded-xl p-3 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-foreground-muted">Total à payer</span>
                  <div className="text-xs text-primary font-medium">{cart.length} référence(s)</div>
                </div>
                <div className="text-2xl font-black text-primary tracking-tight font-mono">
                  {totalAmount.toLocaleString('fr-FR')} <span className="text-xs font-bold">FCFA</span>
                </div>
              </div>

              {/* Choix Type d'Opération : Comptant vs Vente à Crédit */}
              <div>
                <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Type d&apos;opération
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface border border-surface-border rounded-xl shadow-xs">
                  <button
                    type="button"
                    onClick={() => handleSelectMoyenPaiement('especes')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      moyenPaiement !== 'credit'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-foreground-muted hover:text-foreground hover:bg-black/5'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Paiement Comptant</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectMoyenPaiement('credit')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      moyenPaiement === 'credit'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-foreground-muted hover:text-foreground hover:bg-black/5'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Vente à Crédit / Mutuelle</span>
                  </button>
                </div>
              </div>

              {/* Si Comptant : Choix du Mode de Règlement */}
              {moyenPaiement !== 'credit' && (
                <div>
                  <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Moyen de règlement
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectMoyenPaiement('especes')}
                      className={`py-2 px-2 rounded-xl border text-center transition-all ${
                        moyenPaiement === 'especes'
                          ? 'bg-primary text-white border-primary shadow-sm font-bold'
                          : 'bg-surface border-surface-border text-foreground-muted hover:text-foreground text-xs'
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5 mx-auto mb-1" />
                      <span className="text-[10px] block">Espèces</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectMoyenPaiement('mobile_money')}
                      className={`py-2 px-2 rounded-xl border text-center transition-all ${
                        moyenPaiement === 'mobile_money'
                          ? 'bg-primary text-white border-primary shadow-sm font-bold'
                          : 'bg-surface border-surface-border text-foreground-muted hover:text-foreground text-xs'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5 mx-auto mb-1" />
                      <span className="text-[10px] block">Mobile Money</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectMoyenPaiement('carte')}
                      className={`py-2 px-2 rounded-xl border text-center transition-all ${
                        moyenPaiement === 'carte'
                          ? 'bg-primary text-white border-primary shadow-sm font-bold'
                          : 'bg-surface border-surface-border text-foreground-muted hover:text-foreground text-xs'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5 mx-auto mb-1" />
                      <span className="text-[10px] block">Carte/Bque</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Si Mobile Money : Choix précis du compte récepteur (Wave, Orange Money, etc.) */}
              {moyenPaiement === 'mobile_money' && (
                <div className="bg-surface p-3 rounded-xl border border-surface-border space-y-2">
                  <label className="block text-xs font-bold text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-primary" />
                      <span>Compte Mobile Money récepteur *</span>
                    </span>
                    {mobileMoneyAccounts.length > 1 && (
                      <span className="text-[10px] text-primary font-medium">({mobileMoneyAccounts.length} comptes disponibles)</span>
                    )}
                  </label>

                  {mobileMoneyAccounts.length > 1 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {mobileMoneyAccounts.map((acc) => {
                        const isSel = compteTresorerieId === acc.id
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => setCompteTresorerieId(acc.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                              isSel
                                ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs ring-2 ring-primary/30'
                                : 'border-surface-border bg-background text-foreground hover:border-primary/50'
                            }`}
                          >
                            <span className="text-xs truncate">{acc.nom}</span>
                            {isSel && <span className="text-[10px] text-primary font-bold">✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <select
                      value={compteTresorerieId}
                      onChange={(e) => setCompteTresorerieId(e.target.value)}
                      className="block w-full rounded-lg border border-surface-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary"
                    >
                      {(mobileMoneyAccounts.length > 0 ? mobileMoneyAccounts : comptes).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nom} ({c.type || c.type_compte || 'compte'})
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-[10px] text-foreground-muted">
                    L&apos;argent sera automatiquement imputé sur le journal <strong>{comptes.find(c => c.id === compteTresorerieId)?.nom || 'sélectionné'}</strong>.
                  </p>
                </div>
              )}

              {/* Si Espèces ou Carte : Affichage du journal récepteur */}
              {(moyenPaiement === 'especes' || moyenPaiement === 'carte') && (
                <div className="bg-surface p-2.5 rounded-xl border border-surface-border">
                  <label htmlFor="compte_tresorerie" className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-primary" />
                    <span>Journal de trésorerie récepteur *</span>
                  </label>
                  <select
                    id="compte_tresorerie"
                    value={compteTresorerieId}
                    onChange={(e) => setCompteTresorerieId(e.target.value)}
                    className="block w-full rounded-lg border border-surface-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    {comptes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom} ({c.type || c.type_compte || 'compte'})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-foreground-muted mt-1">
                    L&apos;encaissement sera automatiquement crédité dans ce journal.
                  </p>
                </div>
              )}

              {/* Bloc Vente à Crédit / Convention client */}
              {moyenPaiement === 'credit' && (
                <div className="bg-amber-500/10 border-2 border-amber-500/40 p-3.5 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="client_credit" className="block text-xs font-bold text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                      <span>Client Débiteur / Mutuelle / IPM *</span>
                    </label>
                    {!selectedClientId && (
                      <span className="text-[10px] bg-danger text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                        Client Requis
                      </span>
                    )}
                  </div>

                  <select
                    id="client_credit"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    required
                    className={`block w-full rounded-lg bg-background px-2.5 py-2 text-xs font-bold text-foreground focus:ring-2 focus:ring-amber-500 transition-all ${
                      !selectedClientId
                        ? 'border-2 border-amber-500 ring-2 ring-amber-500/20'
                        : 'border border-surface-border'
                    }`}
                  >
                    <option value="">-- Sélectionner obligatoirement le client --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nom} ({c.type_client || 'Client'}) {c.taux_couverture ? `- ${c.taux_couverture}% PEC` : ''} [Dette: {Number(c.solde_creance || 0).toLocaleString('fr-FR')} F]
                      </option>
                    ))}
                  </select>

                  {!selectedClientId ? (
                    <div className="text-[11px] text-amber-800 dark:text-amber-200 bg-amber-500/15 p-2.5 rounded-lg border border-amber-500/30 font-semibold">
                      ⚠️ En vente à crédit, vous devez obligatoirement préciser le client ou la mutuelle avant de pouvoir valider la vente.
                    </div>
                  ) : (
                    <div className="bg-background/90 p-2.5 rounded-lg border border-amber-300 dark:border-amber-700 text-xs space-y-1.5">
                      <div className="flex justify-between items-center text-foreground font-medium">
                        <span>Prise en charge ({tauxCouverture}%) :</span>
                        <span className="font-bold font-mono text-amber-700 dark:text-amber-300">
                          {partCreditCalculee.toLocaleString('fr-FR')} FCFA (Créance Client)
                        </span>
                      </div>
                      {partPatientCalculee > 0 && (
                        <div className="flex justify-between items-center text-foreground font-medium">
                          <span>Part Patient (Ticket modérateur) :</span>
                          <span className="font-bold font-mono text-emerald-600">
                            {partPatientCalculee.toLocaleString('fr-FR')} FCFA (Comptant)
                          </span>
                        </div>
                      )}
                      <div className="pt-1 border-t border-surface-border text-[10px] text-foreground-muted flex justify-between">
                        <span>Créance actuelle : {Number(selectedClient?.solde_creance || 0).toLocaleString('fr-FR')} FCFA</span>
                        <span>Plafond : {selectedClient?.plafond_credit ? `${selectedClient.plafond_credit.toLocaleString('fr-FR')} FCFA` : 'Non plafonné'}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {message && (
                <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  message.type === 'success' ? 'bg-success/15 text-success border border-success/30' : 'bg-danger/15 text-danger border border-danger/30'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{message.text}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleCheckout}
                disabled={cart.length === 0 || isSubmitting || (moyenPaiement === 'credit' && !selectedClientId)}
                className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 ${
                  moyenPaiement === 'credit' && !selectedClientId
                    ? 'bg-amber-500/30 text-amber-800 dark:text-amber-300 cursor-not-allowed border border-amber-500/40'
                    : 'bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  'Enregistrement en cours...'
                ) : moyenPaiement === 'credit' ? (
                  !selectedClientId ? (
                    '⚠️ Précisez le client pour valider le crédit'
                  ) : (
                    `✓ Valider la Vente à Crédit (${totalAmount.toLocaleString('fr-FR')} FCFA)`
                  )
                ) : (
                  `✓ Valider l'Encaissement (${totalAmount.toLocaleString('fr-FR')} FCFA)`
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ONGLET HISTORIQUE DES VENTES & ANNULATION */
        <div className="bg-surface border border-surface-border rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-surface-border">
            <div>
              <h3 className="text-base font-bold font-heading text-foreground">
                Historique des Ventes du Point de Vente
              </h3>
              <p className="text-xs text-foreground-muted">
                Consultez les tickets enregistrés et annulez une vente avec remise automatique en stock et contre-passation comptable.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-foreground-muted" />
              <input
                type="text"
                value={rechercheHistorique}
                onChange={(e) => setRechercheHistorique(e.target.value)}
                placeholder="N° ticket, client, mode..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-surface-border bg-background text-foreground"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-background/80 text-foreground-muted uppercase tracking-wider text-[11px] font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Ticket & Date</th>
                  <th className="py-2.5 px-3">Articles vendus</th>
                  <th className="py-2.5 px-3">Client / Organisme</th>
                  <th className="py-2.5 px-3">Règlement / Journal</th>
                  <th className="py-2.5 px-3 text-right">Montant Total</th>
                  <th className="py-2.5 px-3 text-center">Statut</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {ventesFiltrees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-foreground-muted">
                      Aucune vente trouvée.
                    </td>
                  </tr>
                ) : (
                  ventesFiltrees.map((v: any) => {
                    const estAnnulee = v.statut === 'annulee'
                    const lignes = v.lignes_vente_pharmacie || []

                    return (
                      <tr key={v.id} className={`hover:bg-surface-hover transition-colors ${estAnnulee ? 'opacity-50 bg-danger/5' : ''}`}>
                        <td className="py-3 px-3 align-top font-mono">
                          <span className={`font-bold block ${estAnnulee ? 'line-through text-danger' : 'text-foreground'}`}>
                            {v.numero_ticket || `TK-${v.id.slice(0, 8)}`}
                          </span>
                          <span className="text-[10px] text-foreground-muted">
                            {new Date(v.date_vente).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </td>

                        <td className="py-3 px-3 align-top max-w-xs">
                          <div className="space-y-0.5">
                            {lignes.map((l: any) => (
                              <div key={l.id} className="text-[11px] text-foreground flex items-center justify-between gap-2">
                                <span className="truncate">{l.medicaments?.nom || 'Article'}</span>
                                <span className="font-mono font-bold text-foreground-muted">×{l.quantite}</span>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="py-3 px-3 align-top">
                          {v.clients_externes?.nom ? (
                            <div>
                              <span className="font-bold text-foreground block">{v.clients_externes.nom}</span>
                              <span className="text-[10px] text-primary uppercase font-bold">{v.clients_externes.type_client || 'Client'}</span>
                            </div>
                          ) : (
                            <span className="text-foreground-muted italic">Comptoir Anonyme</span>
                          )}
                        </td>

                        <td className="py-3 px-3 align-top">
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary/10 text-primary">
                              {v.moyen_paiement}
                            </span>
                            {v.comptes?.nom && (
                              <span className="block text-[10px] text-foreground-muted font-medium">
                                Journal: {v.comptes.nom}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 align-top text-right font-mono font-bold text-sm text-foreground">
                          <span className={estAnnulee ? 'line-through text-danger' : ''}>
                            {Number(v.montant_total).toLocaleString('fr-FR')} FCFA
                          </span>
                          {Number(v.part_credit) > 0 && (
                            <span className="block text-[10px] font-semibold text-amber-600">
                              (dont {Number(v.part_credit).toLocaleString('fr-FR')} à crédit)
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 align-top text-center">
                          {estAnnulee ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger/15 text-danger border border-danger/20">
                                ✗ Annulée
                              </span>
                              {v.motif_annulation && (
                                <span className="block text-[10px] text-danger/80 italic mt-0.5">{v.motif_annulation}</span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/20">
                              ✓ Validée
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 align-top text-right">
                          {!estAnnulee && (
                            <button
                              type="button"
                              onClick={() => {
                                setVenteAAnnuler(v)
                                setMotifAnnulation('')
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-danger/10 text-danger hover:bg-danger hover:text-white transition-all shadow-sm"
                              title="Annuler cette vente et remettre les articles en stock"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Annuler</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMATION D'ANNULATION DE VENTE */}
      {venteAAnnuler && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-surface-border w-full max-w-md rounded-2xl p-5 shadow-2xl relative">
            <button
              onClick={() => setVenteAAnnuler(null)}
              className="absolute right-4 top-4 p-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-black/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-danger mb-2 font-bold">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-heading">Annuler la vente {venteAAnnuler.numero_ticket}</h3>
            </div>

            <p className="text-xs text-foreground-muted mb-3 leading-relaxed">
              Cette opération est irréversible et va appliquer les régularisations suivantes :
            </p>

            <ul className="text-xs text-foreground space-y-1 mb-4 bg-background p-3 rounded-xl border border-surface-border">
              <li className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                ✓ Reprise systématique des médicaments en stock (+ quantités restituées)
              </li>
              <li className="flex items-center gap-1.5 text-primary font-semibold">
                ✓ Contre-passation de l&apos;écriture dans le journal de vente (SYSCOHADA)
              </li>
              <li className="flex items-center gap-1.5 text-amber-600 font-semibold">
                ✓ Déduction de l&apos;encaissement dans le journal de trésorerie ou annulation créance
              </li>
            </ul>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Motif de l&apos;annulation (optionnel)
                </label>
                <input
                  type="text"
                  value={motifAnnulation}
                  onChange={(e) => setMotifAnnulation(e.target.value)}
                  placeholder="Ex : Erreur de produit, retour patient..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVenteAAnnuler(null)}
                  disabled={isCancelling}
                  className="px-3 py-1.5 rounded-xl border border-surface-border text-xs font-semibold text-foreground hover:bg-surface-hover"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={handleConfirmerAnnulation}
                  disabled={isCancelling}
                  className="px-4 py-1.5 rounded-xl bg-danger text-white text-xs font-bold hover:bg-danger/90 disabled:opacity-50 flex items-center gap-1.5 shadow"
                >
                  {isCancelling ? 'Annulation en cours...' : 'Confirmer l\'annulation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
