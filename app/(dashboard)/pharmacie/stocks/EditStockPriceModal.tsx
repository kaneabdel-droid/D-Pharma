'use client'

import { useState } from 'react'
import {
  Pencil, X, Check, AlertCircle, ShieldCheck, Tag, Trash2,
  Camera, Pill, Stethoscope, Sparkles, AlertTriangle
} from 'lucide-react'
import { updateArticleComplet, deleteArticleStock } from './actions'
import ScannerCameraModal from '@/components/ScannerCameraModal'
import { parserCodePharma } from '@/lib/pharmacie/code-parser'

type StockItem = {
  id: string
  quantite: number
  prix_vente: number
  prix_achat?: number
  date_peremption: string
  lot?: string | null
  medicaments: {
    id?: string
    nom: string
    code_barres?: string | null
    type_produit?: string | null
  }
}

export default function EditStockPriceModal({ stock }: { stock: StockItem }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmSuppression, setConfirmSuppression] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Champs modifiables
  const [nom, setNom] = useState(stock.medicaments.nom)
  const [codeBarres, setCodeBarres] = useState(stock.medicaments.code_barres || '')
  const [typeProduit, setTypeProduit] = useState<'medicament' | 'materiel' | 'service'>(
    (stock.medicaments.type_produit as any) || 'medicament'
  )
  const [quantite, setQuantite] = useState(stock.quantite.toString())
  const [prixVente, setPrixVente] = useState(stock.prix_vente.toString())
  const [prixAchat, setPrixAchat] = useState((stock.prix_achat || 0).toString())
  const [lot, setLot] = useState(stock.lot || '')
  const [datePeremption, setDatePeremption] = useState(
    stock.date_peremption ? stock.date_peremption.split('T')[0] : ''
  )

  const [scannerOuvert, setScannerOuvert] = useState(false)

  const handleOpen = () => {
    setNom(stock.medicaments.nom)
    setCodeBarres(stock.medicaments.code_barres || '')
    setTypeProduit((stock.medicaments.type_produit as any) || 'medicament')
    setQuantite(stock.quantite.toString())
    setPrixVente(stock.prix_vente.toString())
    setPrixAchat((stock.prix_achat || 0).toString())
    setLot(stock.lot || '')
    setDatePeremption(stock.date_peremption ? stock.date_peremption.split('T')[0] : '')
    setError(null)
    setWarning(null)
    setSuccess(false)
    setConfirmSuppression(false)
    setIsOpen(true)
  }

  const handleCodeScanneModif = (codeBrut: string) => {
    const parse = parserCodePharma(codeBrut)
    setCodeBarres(parse.code_barres || codeBrut.trim())
    if (parse.nom) setNom(parse.nom)
    if (parse.prix_vente) setPrixVente(parse.prix_vente.toString())
    if (parse.prix_achat) setPrixAchat(parse.prix_achat.toString())
    if (parse.lot) setLot(parse.lot)
    if (parse.date_peremption) setDatePeremption(parse.date_peremption)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setWarning(null)

    const formData = new FormData()
    formData.set('stock_id', stock.id)
    formData.set('medicament_id', stock.medicaments.id || '')
    formData.set('nom', nom)
    formData.set('code_barres', codeBarres)
    formData.set('type_produit', typeProduit)
    formData.set('quantite', quantite)
    formData.set('prix_vente', prixVente)
    formData.set('prix_achat', prixAchat)
    formData.set('lot', lot)
    formData.set('date_peremption', datePeremption)

    const result = await updateArticleComplet(formData)

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

  const handleSupprimer = async () => {
    setIsDeleting(true)
    setError(null)
    setWarning(null)

    const result = await deleteArticleStock(stock.id, stock.medicaments.id)
    setIsDeleting(false)

    if (result.error) {
      setError(result.error)
    } else if (result.warning) {
      setWarning(result.warning)
      setTimeout(() => {
        setIsOpen(false)
      }, 2500)
    } else {
      setIsOpen(false)
    }
  }

  const champ =
    'w-full border border-surface-border rounded-xl px-3.5 py-2.5 bg-background text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all'

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={handleOpen}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-surface hover:bg-surface-border/50 text-foreground border border-surface-border transition-colors shadow-xs cursor-pointer"
          title="Modifier l'article ou corriger une erreur de saisie"
        >
          <Pencil className="w-3.5 h-3.5 text-primary" />
          <span>Modifier</span>
        </button>

        <button
          onClick={() => {
            handleOpen()
            setConfirmSuppression(true)
          }}
          className="p-1 rounded-lg text-danger/80 hover:text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 transition-colors cursor-pointer"
          title="Supprimer cet article"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-xl border border-surface-border overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* EN-TÊTE MODAL */}
            <div className="flex justify-between items-center p-5 border-b border-surface-border bg-background/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-heading text-foreground">
                    Modifier l&apos;Article & Stock
                  </h3>
                  <p className="text-xs text-foreground-muted font-medium">
                    Correction des erreurs de saisie, prix et codes-barres
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

            {/* CONFIRMATION DE SUPPRESSION */}
            {confirmSuppression ? (
              <div className="p-6 space-y-4">
                <div className="p-4 rounded-2xl bg-danger/10 border border-danger/30 text-danger flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5 text-danger" />
                  <div>
                    <h4 className="font-bold text-sm text-danger">Supprimer cet article du stock ?</h4>
                    <p className="text-xs text-foreground mt-1 leading-relaxed">
                      Vous êtes sur le point de supprimer <strong className="text-danger font-semibold">{stock.medicaments.nom}</strong> ({stock.quantite} en stock).
                      Cette action est destinée à corriger une erreur d&apos;enregistrement.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="bg-danger/10 text-danger border border-danger/20 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {warning && (
                  <div className="bg-warning/10 text-warning border border-warning/20 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{warning}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-surface-border flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setConfirmSuppression(false)}
                    disabled={isDeleting}
                    className="px-4 py-2 text-foreground-muted hover:text-foreground font-semibold text-xs rounded-xl hover:bg-background transition-colors"
                  >
                    Retour à la modification
                  </button>
                  <button
                    type="button"
                    onClick={handleSupprimer}
                    disabled={isDeleting}
                    className="bg-danger text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-danger/90 disabled:opacity-50 transition-all shadow-sm flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isDeleting ? 'Suppression en cours...' : 'Oui, supprimer définitivement'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
                {error && (
                  <div className="bg-danger/10 text-danger border border-danger/20 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* SÉLECTEUR DE TYPE DE PRODUIT */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Type de produit ou service
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTypeProduit('medicament')}
                      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all ${typeProduit === 'medicament'
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
                      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all ${typeProduit === 'materiel'
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-background border-surface-border text-foreground hover:bg-surface-border/50'
                        }`}
                    >
                      <Stethoscope className="w-4 h-4" />
                      <span>Matériel</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTypeProduit('service')}
                      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all ${typeProduit === 'service'
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-background border-surface-border text-foreground hover:bg-surface-border/50'
                        }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Service</span>
                    </button>
                  </div>
                </div>

                {/* NOM DE L'ARTICLE */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Désignation / Nom de l&apos;article *
                  </label>
                  <input
                    required
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className={champ}
                    placeholder="Ex: Paracétamol 500mg, Amoxicilline 1g..."
                  />
                </div>

                {/* CODE-BARRES AVEC SCAN CAMÉRA */}
                {typeProduit !== 'service' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-foreground">
                        Code-barres / Référence (CIP / EAN)
                      </label>
                      <button
                        type="button"
                        onClick={() => setScannerOuvert(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Scanner avec caméra</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={codeBarres}
                        onChange={(e) => setCodeBarres(e.target.value)}
                        className={champ}
                        placeholder="Scanner ou saisir le code CIP / EAN..."
                      />
                      <button
                        type="button"
                        onClick={() => setScannerOuvert(true)}
                        className="p-2.5 rounded-xl border border-surface-border bg-background hover:bg-surface-border/50 text-emerald-600 dark:text-emerald-400 shrink-0 transition"
                        title="Scanner avec la caméra du smartphone"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* QUANTITÉ & PRIX DE VENTE */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Quantité en stock {typeProduit === 'service' ? '(Illimitée)' : '*'}
                    </label>
                    <input
                      required
                      type="number"
                      step="1"
                      min="0"
                      disabled={typeProduit === 'service'}
                      value={typeProduit === 'service' ? 9999 : quantite}
                      onChange={(e) => setQuantite(e.target.value)}
                      className={champ}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Prix de Vente (FCFA) *
                    </label>
                    <input
                      required
                      type="number"
                      step="any"
                      min="1"
                      value={prixVente}
                      onChange={(e) => setPrixVente(e.target.value)}
                      className={`${champ} font-bold text-primary`}
                    />
                  </div>
                </div>

                {/* PRIX D'ACHAT & DATE DE PÉREMPTION */}
                {typeProduit !== 'service' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Prix d&apos;Achat Unitaire (FCFA)
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={prixAchat}
                        onChange={(e) => setPrixAchat(e.target.value)}
                        className={champ}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Date de Péremption
                      </label>
                      <input
                        type="date"
                        value={datePeremption}
                        onChange={(e) => setDatePeremption(e.target.value)}
                        className={champ}
                      />
                    </div>
                  </div>
                )}

                {/* N° DE LOT */}
                {typeProduit === 'medicament' && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      N° de Lot Fabricant
                    </label>
                    <input
                      type="text"
                      value={lot}
                      onChange={(e) => setLot(e.target.value)}
                      placeholder="Ex: LOT-2026-X4"
                      className={champ}
                    />
                  </div>
                )}

                {/* PIED DU FORMULAIRE */}
                <div className="pt-3 border-t border-surface-border flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setConfirmSuppression(true)}
                    className="text-danger hover:text-danger/80 text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-danger/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer cet article</span>
                  </button>

                  <div className="flex items-center gap-2">
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
                          <span>Modifications enregistrées !</span>
                        </>
                      ) : isSubmitting ? (
                        <span>Enregistrement...</span>
                      ) : (
                        <span>Enregistrer les modifications</span>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* SCANNER CAMÉRA DEPUIS LA MODAL DE MODIFICATION */}
      <ScannerCameraModal
        isOpen={scannerOuvert}
        onClose={() => setScannerOuvert(false)}
        onCodeDetecte={(code) => handleCodeScanneModif(code)}
        titre="Scanner le Code de l'Article"
        sousTitre="Visez le code pour mettre à jour la référence"
      />
    </>
  )
}
