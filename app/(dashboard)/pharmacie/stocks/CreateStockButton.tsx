'use client'

import { useState } from 'react'
import { Plus, X, Pill, Stethoscope, Sparkles, AlertCircle, Camera, CheckCircle2 } from 'lucide-react'
import { addStock, searchMedicamentByCodeOrName } from './actions'
import ScannerCameraModal from '@/components/ScannerCameraModal'
import { parserCodePharma } from '@/lib/pharmacie/code-parser'

export default function CreateStockButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [typeProduit, setTypeProduit] = useState<'medicament' | 'materiel' | 'service'>('medicament')
  const [nom, setNom] = useState('')
  const [codeBarres, setCodeBarres] = useState('')
  const [quantite, setQuantite] = useState('10')
  const [prixVente, setPrixVente] = useState('')
  const [prixAchat, setPrixAchat] = useState('')
  const [lot, setLot] = useState('')
  const [datePeremption, setDatePeremption] = useState(
    new Date(Date.now() + 365 * 2 * 86400000).toISOString().split('T')[0]
  )
  const [scanFeedback, setScanFeedback] = useState<string | null>(null)

  const [scannerOuvert, setScannerOuvert] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setNom('')
    setCodeBarres('')
    setQuantite('10')
    setPrixVente('')
    setPrixAchat('')
    setLot('')
    setDatePeremption(new Date(Date.now() + 365 * 2 * 86400000).toISOString().split('T')[0])
    setScanFeedback(null)
    setError(null)
  }

  // Traitement intelligent du scan (QR Code, DataMatrix, Code-barres)
  const handleCodeScanne = async (codeBrut: string) => {
    const parse = parserCodePharma(codeBrut)
    const codeNet = parse.code_barres || codeBrut.trim()
    setCodeBarres(codeNet)

    const details: string[] = []

    if (parse.nom) {
      setNom(parse.nom)
      details.push(parse.nom)
    }
    if (parse.prix_vente) {
      setPrixVente(parse.prix_vente.toString())
      details.push(`Prix: ${parse.prix_vente} F`)
    }
    if (parse.prix_achat) {
      setPrixAchat(parse.prix_achat.toString())
    }
    if (parse.lot) {
      setLot(parse.lot)
      details.push(`Lot: ${parse.lot}`)
    }
    if (parse.date_peremption) {
      setDatePeremption(parse.date_peremption)
      details.push(`Exp: ${parse.date_peremption}`)
    }

    // Si le nom n'était pas dans le code, chercher si ce médicament existe déjà dans la base
    if (!parse.nom && codeNet) {
      const existant = await searchMedicamentByCodeOrName(codeNet)
      if (existant) {
        if (existant.nom) {
          setNom(existant.nom)
          details.push(existant.nom)
        }
        if (existant.type_produit) setTypeProduit(existant.type_produit as any)
        if (existant.prix_vente && !parse.prix_vente) {
          setPrixVente(existant.prix_vente.toString())
          details.push(`Dernier prix: ${existant.prix_vente} F`)
        }
        if (existant.prix_achat && !parse.prix_achat) {
          setPrixAchat(existant.prix_achat.toString())
        }
      }
    }

    setScanFeedback(
      details.length > 0
        ? `Informations extraites du scan : ${details.join(' • ')}`
        : `Code scanné avec succès : ${codeNet}`
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData()
    formData.set('type_produit', typeProduit)
    formData.set('nom', nom)
    formData.set('code_barres', codeBarres)
    formData.set('quantite', quantite)
    formData.set('prix_vente', prixVente)
    formData.set('prix_achat', prixAchat)
    formData.set('lot', lot)
    formData.set('date_peremption', datePeremption)

    const result = await addStock(formData)

    setIsSubmitting(false)
    if (result.error) {
      setError(result.error)
    } else {
      setIsOpen(false)
      resetForm()
    }
  }

  const champ =
    'w-full border border-surface-border rounded-xl px-3.5 py-2.5 bg-background text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all'

  return (
    <>
      <button
        onClick={() => {
          resetForm()
          setIsOpen(true)
        }}
        className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors shadow-sm cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>Nouveau Produit / Service</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-lg border border-surface-border overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
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
                className="p-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-border cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              {error && (
                <div className="bg-danger/10 text-danger border border-danger/20 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {scanFeedback && (
                <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 p-2.5 rounded-xl text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="line-clamp-2">{scanFeedback}</span>
                </div>
              )}

              {/* Sélecteur de type d'article */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Type de produit ou service
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTypeProduit('medicament')}
                    className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
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
                    className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
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
                    className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
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
                  {typeProduit === 'service'
                    ? 'Nom du service / prestation *'
                    : typeProduit === 'materiel'
                    ? 'Désignation du matériel ou fourniture *'
                    : 'Nom commercial ou DCI du médicament *'}
                </label>
                <input
                  required
                  type="text"
                  name="nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-foreground">
                      Code-barres / Référence (Optionnel)
                    </label>
                    <button
                      type="button"
                      onClick={() => setScannerOuvert(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Scanner par caméra</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      name="code_barres"
                      value={codeBarres}
                      onChange={(e) => setCodeBarres(e.target.value)}
                      className={champ}
                      placeholder="Scanner ou saisir le code CIP / EAN..."
                    />
                    <button
                      type="button"
                      onClick={() => setScannerOuvert(true)}
                      className="p-2.5 rounded-xl border border-surface-border bg-background hover:bg-surface-border/50 text-emerald-600 dark:text-emerald-400 shrink-0 transition cursor-pointer"
                      title="Scanner avec la caméra du smartphone / tablette"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {typeProduit !== 'service' ? (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Quantité en stock *
                    </label>
                    <input
                      required
                      type="number"
                      step="1"
                      min="0"
                      name="quantite"
                      value={quantite}
                      onChange={(e) => setQuantite(e.target.value)}
                      className={champ}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Disponibilité
                    </label>
                    <input
                      disabled
                      type="text"
                      value="Permanente (Service)"
                      className={`${champ} opacity-70 bg-surface`}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Prix de Vente (FCFA) *
                  </label>
                  <input
                    required
                    type="number"
                    step="any"
                    min="1"
                    name="prix_vente"
                    value={prixVente}
                    onChange={(e) => setPrixVente(e.target.value)}
                    placeholder="Ex: 1500"
                    className={`${champ} font-bold text-primary`}
                  />
                </div>
              </div>

              {typeProduit !== 'service' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Prix d&apos;Achat (Optionnel)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      name="prix_achat"
                      value={prixAchat}
                      onChange={(e) => setPrixAchat(e.target.value)}
                      placeholder="Ex: 1000"
                      className={champ}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Date de Péremption *
                    </label>
                    <input
                      required
                      type="date"
                      name="date_peremption"
                      value={datePeremption}
                      onChange={(e) => setDatePeremption(e.target.value)}
                      className={champ}
                    />
                  </div>
                </div>
              )}

              {typeProduit === 'medicament' && (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    N° de Lot Fabricant (Optionnel)
                  </label>
                  <input
                    type="text"
                    name="lot"
                    value={lot}
                    onChange={(e) => setLot(e.target.value)}
                    placeholder="Ex: LOT-2026-X4"
                    className={champ}
                  />
                </div>
              )}

              <div className="pt-3 border-t border-surface-border flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-foreground-muted hover:text-foreground font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-primary-hover disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scanner Caméra pour Entrée de Stock */}
      <ScannerCameraModal
        isOpen={scannerOuvert}
        onClose={() => setScannerOuvert(false)}
        onCodeDetecte={(code) => handleCodeScanne(code)}
        titre="Scanner pour Entrée en Stock"
        sousTitre="Scannez le code QR, DataMatrix ou code-barres de la boîte"
      />
    </>
  )
}
