'use client'

import { useState, useRef, useEffect } from 'react'
import {
  PackageCheck, X, ShieldCheck, AlertCircle, ScanLine, Plus,
  Trash2, CheckCircle2, Pill, Sparkles, Barcode, ArrowRight, Check
} from 'lucide-react'
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
    code_barres?: string | null
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

export type LotReception = {
  id: string
  ligne_id: string
  medicament_id: string
  nom: string
  code_barres: string
  lot: string
  date_peremption: string
  quantite_commandee: number
  quantite_recue: number
  prix_achat: number
  prix_vente: number
  is_active_scan: boolean
}

// Bip sonore doux via Web Audio API lors du scan
function playBeepSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
    osc.start()
    osc.stop(ctx.currentTime + 0.12)
  } catch {}
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

  // Scanner state
  const [scanInput, setScanInput] = useState('')
  const [lastScannedFeedback, setLastScannedFeedback] = useState<{
    nom: string
    lot: string
    qte: number
    isNewBarcode?: boolean
  } | null>(null)
  const [unrecognizedCode, setUnrecognizedCode] = useState<string | null>(null)

  const scanInputRef = useRef<HTMLInputElement>(null)

  // Date de péremption par défaut (+2 ans)
  const defaultPeremption = new Date()
  defaultPeremption.setFullYear(defaultPeremption.getFullYear() + 2)
  const defaultPeremptionStr = defaultPeremption.toISOString().split('T')[0]

  // Initialisation des lots
  const buildInitialLots = () => {
    return (commande.lignes_commande_labo || []).map((l, index) => {
      const stock = stockMap[l.medicament_id] || {}
      const defLot = `LOT-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${String.fromCharCode(65 + (index % 26))}`
      return {
        id: `lot_${l.id}_${Date.now()}_${index}`,
        ligne_id: l.id,
        medicament_id: l.medicament_id,
        nom: l.medicaments?.nom || 'Article',
        code_barres: l.medicaments?.code_barres || '',
        lot: stock.lot || defLot,
        date_peremption: stock.date_peremption ? stock.date_peremption.split('T')[0] : defaultPeremptionStr,
        quantite_commandee: Number(l.quantite_commandee || 1),
        quantite_recue: Number(l.quantite_commandee || 1),
        prix_achat: Number(l.prix_achat_unitaire || stock.prix_achat || 0),
        prix_vente: Number(stock.prix_vente || 0),
        is_active_scan: index === 0, // Le premier article est actif au départ
      }
    })
  }

  const [lots, setLots] = useState<LotReception[]>([])

  const handleOpen = () => {
    setError(null)
    setLastScannedFeedback(null)
    setUnrecognizedCode(null)
    setScanInput('')
    setLots(buildInitialLots())
    setIsOpen(true)
    setTimeout(() => {
      scanInputRef.current?.focus()
    }, 200)
  }

  // Activer un lot spécifique pour le scan
  const setActiveLotForScan = (lotId: string) => {
    setLots(prev => prev.map(l => ({
      ...l,
      is_active_scan: l.id === lotId
    })))
    scanInputRef.current?.focus()
  }

  // Ajouter un nouveau lot pour le même médicament
  const handleAddLotForMedicament = (medicamentId: string) => {
    const parent = lots.find(l => l.medicament_id === medicamentId)
    if (!parent) return

    const existingLotsForMed = lots.filter(l => l.medicament_id === medicamentId)
    const nextSuffix = String.fromCharCode(65 + (existingLotsForMed.length % 26))
    const newLotNumber = `LOT-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${nextSuffix}`

    const newLot: LotReception = {
      id: `lot_${medicamentId}_${Date.now()}`,
      ligne_id: parent.ligne_id,
      medicament_id: parent.medicament_id,
      nom: parent.nom,
      code_barres: parent.code_barres,
      lot: newLotNumber,
      date_peremption: defaultPeremptionStr,
      quantite_commandee: parent.quantite_commandee,
      quantite_recue: 1,
      prix_achat: parent.prix_achat,
      prix_vente: parent.prix_vente,
      is_active_scan: true,
    }

    setLots(prev => [
      ...prev.map(l => ({ ...l, is_active_scan: false })),
      newLot
    ])

    setTimeout(() => scanInputRef.current?.focus(), 100)
  }

  // Supprimer un lot secondaire
  const handleRemoveLot = (lotId: string, medicamentId: string) => {
    const lotsOfMed = lots.filter(l => l.medicament_id === medicamentId)
    if (lotsOfMed.length <= 1) return // Ne pas supprimer le seul lot existant
    setLots(prev => prev.filter(l => l.id !== lotId))
  }

  // Mise à jour d'un champ d'un lot
  const updateLotField = (lotId: string, field: keyof LotReception, value: any) => {
    setLots(prev => prev.map(l => {
      if (l.id === lotId) {
        // Si on met à jour le code-barres, le synchroniser sur tous les lots de ce médicament
        if (field === 'code_barres') {
          return { ...l, [field]: value }
        }
        return { ...l, [field]: value }
      }
      if (field === 'code_barres' && l.medicament_id === lots.find(x => x.id === lotId)?.medicament_id) {
        return { ...l, code_barres: value }
      }
      return l
    }))
  }

  // Traitement d'un scan code-barre
  const processBarcodeScan = (scannedCodeRaw: string) => {
    const code = scannedCodeRaw.trim()
    if (!code) return

    setUnrecognizedCode(null)

    // 1. Chercher si ce code-barre est déjà associé à un médicament de la commande
    const matchingLots = lots.filter(l => l.code_barres && l.code_barres.trim() === code)

    if (matchingLots.length > 0) {
      // Trouver le lot actif pour ce médicament, ou le premier lot
      const targetLot = matchingLots.find(l => l.is_active_scan) || matchingLots[0]

      setLots(prev => prev.map(l => {
        if (l.id === targetLot.id) {
          const newQte = Number(l.quantite_recue || 0) + 1
          setLastScannedFeedback({
            nom: l.nom,
            lot: l.lot,
            qte: newQte,
            isNewBarcode: false,
          })
          return { ...l, quantite_recue: newQte, is_active_scan: true }
        }
        return { ...l, is_active_scan: false }
      }))

      playBeepSound()
      setScanInput('')
      return
    }

    // 2. Si le code n'est pas encore reconnu :
    // Vérifier si un lot est actuellement sélectionné par l'utilisateur
    const activeLot = lots.find(l => l.is_active_scan)
    if (activeLot) {
      // Associer ce nouveau code-barres au médicament actif et incrémenter de +1
      setLots(prev => prev.map(l => {
        if (l.medicament_id === activeLot.medicament_id) {
          const isTarget = l.id === activeLot.id
          const newQte = isTarget ? Number(l.quantite_recue || 0) + 1 : l.quantite_recue
          if (isTarget) {
            setLastScannedFeedback({
              nom: l.nom,
              lot: l.lot,
              qte: newQte,
              isNewBarcode: true,
            })
          }
          return {
            ...l,
            code_barres: code,
            quantite_recue: newQte,
            is_active_scan: isTarget,
          }
        }
        return { ...l, is_active_scan: false }
      }))

      playBeepSound()
      setScanInput('')
      return
    }

    // 3. Si aucun lot n'est sélectionné et le code est inconnu, demander à quel article l'attribuer
    setUnrecognizedCode(code)
    setScanInput('')
  }

  // Attribution manuelle d'un code-barres inconnu à un article
  const assignCodeToMedicament = (medicamentId: string, code: string) => {
    const medLots = lots.filter(l => l.medicament_id === medicamentId)
    const targetLot = medLots.find(l => l.is_active_scan) || medLots[0]

    if (!targetLot) return

    setLots(prev => prev.map(l => {
      if (l.medicament_id === medicamentId) {
        const isTarget = l.id === targetLot.id
        const newQte = isTarget ? Number(l.quantite_recue || 0) + 1 : l.quantite_recue
        if (isTarget) {
          setLastScannedFeedback({
            nom: l.nom,
            lot: l.lot,
            qte: newQte,
            isNewBarcode: true,
          })
        }
        return {
          ...l,
          code_barres: code,
          quantite_recue: newQte,
          is_active_scan: isTarget,
        }
      }
      return { ...l, is_active_scan: false }
    }))

    playBeepSound()
    setUnrecognizedCode(null)
    scanInputRef.current?.focus()
  }

  // Calcul du montant total de l'achat
  const totalAchat = lots.reduce((sum, item) => sum + (Number(item.quantite_recue || 0) * Number(item.prix_achat || 0)), 0)

  // Vérifier si des prix de vente sont manquants
  const missingSellingPrice = lots.some(l => !l.prix_vente || Number(l.prix_vente) <= 0)

  // Groupement des lots par médicament pour un affichage hiérarchique clair
  const groupedMedicaments = Array.from(new Set(lots.map(l => l.medicament_id))).map(medId => {
    const medLots = lots.filter(l => l.medicament_id === medId)
    const first = medLots[0]
    const totalRecu = medLots.reduce((sum, l) => sum + Number(l.quantite_recue || 0), 0)
    return {
      medicament_id: medId,
      nom: first.nom,
      code_barres: first.code_barres,
      quantite_commandee: first.quantite_commandee,
      total_recu: totalRecu,
      lots: medLots,
    }
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (missingSellingPrice) {
      setError('Veuillez renseigner un Prix de Vente valide (> 0) pour chaque lot afin de permettre la vente au comptoir.')
      return
    }

    setIsSubmitting(true)

    const formData = new FormData()
    formData.append('commande_id', commande.id)
    formData.append('constater_achat', constaterAchat ? 'true' : 'false')
    formData.append('lignes', JSON.stringify(lots))

    const result = await accuserReception(formData)

    setIsSubmitting(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setIsOpen(false)
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-success/10 text-success hover:bg-success/20 transition-colors shadow-xs"
        title="Contrôler la réception par code-barres et mise en stock multi-lots"
      >
        <PackageCheck className="w-4 h-4" />
        <span>Réceptionner</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-5xl border border-surface-border overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-surface-border bg-background/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-success/15 text-success">
                  <PackageCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-heading text-foreground">
                    Réception Commande & Mise en Stock Multi-Lots
                  </h3>
                  <p className="text-xs text-foreground-muted">
                    Fournisseur : <strong className="text-foreground">{commande.fournisseurs_labo?.nom}</strong> • Commande du {new Date(commande.date_commande).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-foreground-muted hover:text-foreground hover:bg-surface-border transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SCAN BARCODE HEADER ZONE */}
            <div className="p-4 bg-primary/5 border-b border-primary/20 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-primary">
                    <ScanLine className="w-5 h-5 animate-pulse" />
                  </div>
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        processBarcodeScan(scanInput)
                      }
                    }}
                    placeholder="Bipez le code-barre d'une boîte avec la douchette (ou saisie manuelle + Entrée)..."
                    className="w-full pl-11 pr-24 py-2.5 rounded-xl border-2 border-primary/40 bg-background text-sm font-mono text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => processBarcodeScan(scanInput)}
                    className="absolute inset-y-1.5 right-1.5 px-3 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Biper</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-foreground-muted shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="font-semibold text-emerald-600">Douchette prête</span>
                </div>
              </div>

              {/* Feedback flash du scan */}
              {lastScannedFeedback && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 p-2.5 rounded-xl text-xs flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Article bipé : <strong>{lastScannedFeedback.nom}</strong> ({lastScannedFeedback.lot}) ➔ <strong>{lastScannedFeedback.qte} boîte(s) reçue(s)</strong>.
                      {lastScannedFeedback.isNewBarcode && (
                        <span className="ml-1.5 px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">
                          Code-barre enregistré d'entrée !
                        </span>
                      )}
                    </span>
                  </div>
                  <button
                    onClick={() => setLastScannedFeedback(null)}
                    className="text-foreground-muted hover:text-foreground text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Nouveau code-barres non encore attribué */}
              {unrecognizedCode && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 p-3 rounded-xl text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Barcode className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Nouveau code-barre <strong>{unrecognizedCode}</strong> détecté. À quel article de la commande l'attribuer ?
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {groupedMedicaments.map((med) => (
                      <button
                        key={med.medicament_id}
                        type="button"
                        onClick={() => assignCodeToMedicament(med.medicament_id, unrecognizedCode)}
                        className="px-2.5 py-1 rounded-lg bg-surface border border-surface-border text-foreground hover:border-primary hover:text-primary font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Pill className="w-3 h-3 text-primary" />
                        <span>{med.nom}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setUnrecognizedCode(null)}
                      className="px-2 py-1 rounded-lg text-foreground-muted hover:text-foreground text-xs"
                    >
                      Ignorer
                    </button>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                {error && (
                  <div className="bg-danger/10 text-danger border border-danger/20 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Explication ergonomique */}
                <div className="bg-surface border border-surface-border rounded-2xl p-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-foreground">
                      Contrôle par scan douchette & Gestion multi-lots
                    </p>
                    <p className="text-foreground-muted leading-relaxed">
                      Bipez chaque boîte pour alimenter directement le lot actif. Si un article est livré sous différents lots ou dates d'expiration, cliquez sur <strong>« + Ajouter un lot »</strong>. Les codes-barres sont automatiquement sauvegardés d'entrée dans le catalogue de l'officine.
                    </p>
                  </div>
                </div>

                {/* LISTE DES ARTICLES COMMANDÉS & LEURS LOTS */}
                <div className="space-y-4">
                  {groupedMedicaments.map((medGroup) => {
                    const isFullyReceived = medGroup.total_recu === medGroup.quantite_commandee
                    const isOverReceived = medGroup.total_recu > medGroup.quantite_commandee

                    return (
                      <div
                        key={medGroup.medicament_id}
                        className="bg-background rounded-2xl border border-surface-border p-4 space-y-3 shadow-xs"
                      >
                        {/* En-tête Article */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-surface-border/60 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Pill className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-foreground">{medGroup.nom}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isFullyReceived
                                    ? 'bg-success/15 text-success'
                                    : isOverReceived
                                    ? 'bg-amber-500/15 text-amber-600'
                                    : 'bg-primary/10 text-primary'
                                }`}>
                                  {medGroup.total_recu} / {medGroup.quantite_commandee} reçu(s)
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mt-1">
                                <Barcode className="w-3.5 h-3.5 text-foreground-muted" />
                                <span className="text-[11px] text-foreground-muted">Code-barre :</span>
                                <input
                                  type="text"
                                  value={medGroup.code_barres}
                                  placeholder="Non renseigné (scannez pour associer)"
                                  onChange={(e) => {
                                    // Mettre à jour le code barre pour tous les lots de cet article
                                    const firstLot = medGroup.lots[0]
                                    if (firstLot) updateLotField(firstLot.id, 'code_barres', e.target.value)
                                  }}
                                  className="text-[11px] font-mono px-2 py-0.5 rounded border border-surface-border bg-surface text-foreground w-56 focus:border-primary outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddLotForMedicament(medGroup.medicament_id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Ajouter un autre lot</span>
                          </button>
                        </div>

                        {/* Tableau des lots de ce médicament */}
                        <div className="space-y-2">
                          {medGroup.lots.map((lotItem, lotIdx) => (
                            <div
                              key={lotItem.id}
                              className={`p-3 rounded-xl border transition-all ${
                                lotItem.is_active_scan
                                  ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/30'
                                  : 'border-surface-border bg-surface hover:border-surface-border/80'
                              }`}
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs">
                                {/* Sélecteur Lot actif pour scan */}
                                <div className="sm:col-span-3 flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setActiveLotForScan(lotItem.id)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                      lotItem.is_active_scan
                                        ? 'bg-primary text-white shadow-xs'
                                        : 'bg-background border border-surface-border text-foreground-muted hover:text-foreground'
                                    }`}
                                    title="Cliquer pour diriger les prochains scans douchette sur ce lot"
                                  >
                                    <span className={`w-2 h-2 rounded-full ${lotItem.is_active_scan ? 'bg-white animate-pulse' : 'bg-foreground-muted'}`}></span>
                                    <span>{lotItem.is_active_scan ? 'Lot actif scan' : 'Rendre actif'}</span>
                                  </button>
                                  <input
                                    type="text"
                                    value={lotItem.lot}
                                    placeholder="N° de Lot (ex: LOT-A)"
                                    onChange={(e) => updateLotField(lotItem.id, 'lot', e.target.value)}
                                    className="w-full font-mono font-bold px-2 py-1 rounded border border-surface-border bg-background text-foreground"
                                    required
                                  />
                                </div>

                                {/* Date de péremption */}
                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] text-foreground-muted font-medium mb-0.5">Péremption</label>
                                  <input
                                    type="date"
                                    value={lotItem.date_peremption}
                                    onChange={(e) => updateLotField(lotItem.id, 'date_peremption', e.target.value)}
                                    className="w-full px-2 py-1 rounded border border-surface-border bg-background text-foreground text-xs"
                                    required
                                  />
                                </div>

                                {/* Quantité reçue avec boutons + et - */}
                                <div className="sm:col-span-3">
                                  <label className="block text-[10px] text-foreground-muted font-medium mb-0.5">Quantité reçue</label>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => updateLotField(lotItem.id, 'quantite_recue', Math.max(0, Number(lotItem.quantite_recue || 0) - 1))}
                                      className="w-7 h-7 rounded border border-surface-border bg-background text-foreground hover:bg-surface-border flex items-center justify-center font-bold"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      step="1"
                                      min="0"
                                      value={lotItem.quantite_recue}
                                      onChange={(e) => updateLotField(lotItem.id, 'quantite_recue', Math.max(0, parseInt(e.target.value) || 0))}
                                      className="w-16 font-bold text-center px-2 py-1 rounded border border-surface-border bg-background text-foreground text-xs font-mono"
                                      required
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateLotField(lotItem.id, 'quantite_recue', Number(lotItem.quantite_recue || 0) + 1)}
                                      className="w-7 h-7 rounded border border-surface-border bg-background text-foreground hover:bg-surface-border flex items-center justify-center font-bold"
                                    >
                                      +
                                    </button>
                                    <span className="text-[10px] text-foreground-muted ml-1">boîtes</span>
                                  </div>
                                </div>

                                {/* Prix d'achat grossiste */}
                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] text-foreground-muted font-medium mb-0.5">P. Achat (FCFA)</label>
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={lotItem.prix_achat}
                                    onChange={(e) => updateLotField(lotItem.id, 'prix_achat', Number(e.target.value) || 0)}
                                    className="w-full font-mono px-2 py-1 rounded border border-surface-border bg-background text-foreground text-xs text-right"
                                    required
                                  />
                                </div>

                                {/* Prix de vente comptoir */}
                                <div className="sm:col-span-2 flex items-center gap-1.5">
                                  <div className="flex-1">
                                    <label className="block text-[10px] text-foreground-muted font-medium mb-0.5">P. Vente (FCFA) *</label>
                                    <input
                                      type="number"
                                      step="1"
                                      min="1"
                                      value={lotItem.prix_vente}
                                      onChange={(e) => updateLotField(lotItem.id, 'prix_vente', Number(e.target.value) || 0)}
                                      className={`w-full font-mono font-bold px-2 py-1 rounded border text-xs text-right ${
                                        !lotItem.prix_vente || lotItem.prix_vente <= 0
                                          ? 'border-danger bg-danger/5 text-danger'
                                          : 'border-surface-border bg-background text-foreground'
                                      }`}
                                      required
                                    />
                                  </div>

                                  {medGroup.lots.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveLot(lotItem.id, medGroup.medicament_id)}
                                      className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-colors mt-3 shrink-0 cursor-pointer"
                                      title="Supprimer ce lot"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Option Constatation comptable */}
                <div className="bg-surface border border-surface-border rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="constaterAchatCheck"
                      checked={constaterAchat}
                      onChange={(e) => setConstaterAchat(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary border-surface-border"
                    />
                    <label htmlFor="constaterAchatCheck" className="text-xs text-foreground cursor-pointer select-none">
                      <strong className="block text-sm">Constater la facture en comptabilité</strong>
                      <span className="text-foreground-muted text-xs">
                        Génère l'écriture au Journal des Achats (Compte 601 Débit / 401 Crédit Fournisseur)
                      </span>
                    </label>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-foreground-muted block">Total Facture Grossiste :</span>
                    <span className="text-lg font-bold font-mono text-primary">
                      {new Intl.NumberFormat('fr-FR').format(totalAchat)} FCFA
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-5 border-t border-surface-border bg-background/50 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="text-xs text-foreground-muted">
                  <span>{lots.length} lot(s) prêt(s) à être mis en rayon.</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-surface-border text-foreground hover:bg-surface text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || missingSellingPrice}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-success text-white hover:bg-success/90 text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmitting ? 'Mise en stock en cours...' : 'Valider la Réception & Mettre en Stock'}</span>
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
