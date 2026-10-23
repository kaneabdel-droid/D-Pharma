'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Trash2, AlertTriangle, ShieldCheck, FileWarning, Loader2, Sparkles } from 'lucide-react'
import { creerPVDestruction } from './actions'

export interface LotItem {
  id: string
  lot: string | null
  quantite: number
  date_peremption: string
  prix_vente?: number | null
  prix_achat?: number | null
  medicaments?: any
}

interface LigneDestruction {
  stock_id?: string
  medicament_id?: string
  designation: string
  lot: string
  date_peremption: string
  quantite: number
  type_produit: 'medicament' | 'cosmetique' | 'parapharmacie' | 'materiel'
  prix_achat_ht: number
}

export default function NouveauPVModal({ lotsPerimes }: { lotsPerimes: LotItem[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [autoriteType, setAutoriteType] = useState('service_hygiene')
  const [lignes, setLignes] = useState<LigneDestruction[]>([])

  const formatCFA = (val: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(val) + ' FCFA'

  const ajouterLotPreselectionne = (lot: LotItem) => {
    const med = Array.isArray(lot.medicaments) ? lot.medicaments[0] : lot.medicaments
    const isCosmetic = med?.categorie_tva === 'cosmetique_taxable'
    const isPara = med?.categorie_tva === 'parapharmacie_taxable'
    const typeProduit = isCosmetic ? 'cosmetique' : isPara ? 'parapharmacie' : 'medicament'
    const pa = Number(lot.prix_achat || med?.prix_achat || 1000)

    const nouvelleLigne: LigneDestruction = {
      stock_id: lot.id,
      medicament_id: med?.id,
      designation: med?.nom || 'Article périmé',
      lot: lot.lot || 'N/C',
      date_peremption: lot.date_peremption,
      quantite: Number(lot.quantite),
      type_produit: typeProduit,
      prix_achat_ht: pa,
    }

    setLignes((prev) => [...prev, nouvelleLigne])
  }

  const ajouterLigneManuelle = () => {
    setLignes((prev) => [
      ...prev,
      {
        designation: '',
        lot: '',
        date_peremption: new Date().toISOString().split('T')[0],
        quantite: 1,
        type_produit: 'medicament',
        prix_achat_ht: 0,
      },
    ])
  }

  const supprimerLigne = (index: number) => {
    setLignes((prev) => prev.filter((_, i) => i !== index))
  }

  const updateLigne = (index: number, champ: keyof LigneDestruction, val: any) => {
    setLignes((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [champ]: val } : l))
    )
  }

  const totalHT = lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prix_achat_ht) || 0), 0)
  const totalTVA = lignes.reduce((s, l) => {
    const isTaxable = l.type_produit === 'cosmetique' || l.type_produit === 'parapharmacie' || l.type_produit === 'materiel'
    if (!isTaxable) return s
    const ht = (Number(l.quantite) || 0) * (Number(l.prix_achat_ht) || 0)
    return s + Math.round(ht * 0.18)
  }, 0)
  const totalTTC = totalHT + totalTVA

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (lignes.length === 0) {
      setError('Veuillez ajouter au moins un lot de produit à détruire.')
      return
    }

    setLoading(true)
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('lignes', JSON.stringify(lignes))

    const res = await creerPVDestruction(formData)
    setLoading(false)

    if (res.error) {
      setError(res.error)
    } else {
      setOpen(false)
      setLignes([])
      router.refresh()
      if (res.id) {
        router.push(`/pharmacie/perimes/${res.id}`)
      }
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setOpen(true)
          if (lignes.length === 0 && lotsPerimes.length > 0) {
            // Pré-charger le premier lot périmé
            ajouterLotPreselectionne(lotsPerimes[0])
          }
        }}
        className="btn-primary text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-sm"
      >
        <Plus className="w-4 h-4" />
        <span>Établir un PV de Destruction</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-surface-border p-6 max-w-3xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-surface-border">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
                  <FileWarning className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold font-heading text-lg text-foreground">
                    Nouveau Procès-Verbal de Destruction
                  </h3>
                  <p className="text-xs text-foreground-muted">
                    Conforme aux règles de l'Ordre, du Service d'Hygiène et de la DGID (TVA déductible)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-foreground-muted hover:text-foreground text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-5">
              {/* Cadre Officier / Visa officiel */}
              <div className="p-4 rounded-xl bg-background border border-surface-border space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  1. Autorité de Constatation & Visa Légal
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-foreground-muted uppercase mb-1">
                      Type d'autorité *
                    </label>
                    <select
                      name="autorite_type"
                      value={autoriteType}
                      onChange={(e) => setAutoriteType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-surface-border bg-surface text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="service_hygiene">Service Régional de l'Hygiène</option>
                      <option value="huissier_justice">Huissier de Justice (Me...)</option>
                      <option value="commission_sanitaire">Commission Sanitaire / DPM</option>
                      <option value="interne_officine">Commission Interne Officine</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-foreground-muted uppercase mb-1">
                      Nom de l'officier / inspecteur
                    </label>
                    <input
                      type="text"
                      name="nom_officier_autorite"
                      placeholder="Ex: Me Amadou Sow ou Dr. Diop"
                      className="w-full px-3 py-2 rounded-xl border border-surface-border bg-surface text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-foreground-muted uppercase mb-1">
                      N° Acte / Visa d'Hygiène *
                    </label>
                    <input
                      type="text"
                      name="numero_visa_acte"
                      required
                      placeholder="Ex: Réf. PV-HYG-2026/04"
                      className="w-full px-3 py-2 rounded-xl border border-surface-border bg-surface text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-foreground-muted uppercase mb-1">
                      Date de destruction *
                    </label>
                    <input
                      type="date"
                      name="date_destruction"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-surface-border bg-surface text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-foreground-muted uppercase mb-1">
                      Motif officiel de destruction *
                    </label>
                    <select
                      name="motif"
                      defaultValue="peremption"
                      className="w-full px-3 py-2 rounded-xl border border-surface-border bg-surface text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="peremption">Péremption des principes actifs</option>
                      <option value="avarie">Avarie / Dégradation physique</option>
                      <option value="rupture_chaine_froid">Rupture de chaîne du froid (Thermosensible)</option>
                      <option value="rappel_lot">Rappel de lot ministériel / Fabricant</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Raccourci lots périmés en stock */}
              {lotsPerimes.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Lots expirés détectés en rayon ({lotsPerimes.length}) :
                    </span>
                    <span className="text-[10px] text-amber-600 font-medium">Cliquez pour ajouter au PV</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {lotsPerimes.map((lot) => (
                      <button
                        key={lot.id}
                        type="button"
                        onClick={() => ajouterLotPreselectionne(lot)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-surface border border-amber-500/30 text-foreground hover:bg-amber-500/20 transition-colors flex items-center gap-1.5"
                      >
                        <span className="font-semibold">{lot.medicaments?.nom}</span>
                        <span className="font-mono text-[10px] text-foreground-muted">Lot {lot.lot}</span>
                        <span className="text-[10px] text-danger font-bold">({lot.quantite} btes)</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tableau des articles à détruire */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    2. Produits & Lots Retirés ({lignes.length})
                  </h4>
                  <button
                    type="button"
                    onClick={ajouterLigneManuelle}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter une ligne manuelle
                  </button>
                </div>

                <div className="border border-surface-border rounded-xl overflow-hidden divide-y divide-surface-border">
                  {lignes.map((ligne, idx) => (
                    <div key={idx} className="p-3 bg-surface hover:bg-background/50 space-y-2">
                      <div className="grid grid-cols-12 gap-2 items-center text-xs">
                        <div className="col-span-12 sm:col-span-4">
                          <label className="block text-[10px] text-foreground-muted font-bold uppercase mb-0.5">
                            Désignation du produit
                          </label>
                          <input
                            type="text"
                            required
                            value={ligne.designation}
                            onChange={(e) => updateLigne(idx, 'designation', e.target.value)}
                            placeholder="Nom du médicament / produit"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-surface-border bg-background text-xs font-semibold"
                          />
                        </div>

                        <div className="col-span-6 sm:col-span-2">
                          <label className="block text-[10px] text-foreground-muted font-bold uppercase mb-0.5">
                            N° Lot
                          </label>
                          <input
                            type="text"
                            required
                            value={ligne.lot}
                            onChange={(e) => updateLigne(idx, 'lot', e.target.value)}
                            placeholder="Lot"
                            className="w-full px-2 py-1.5 rounded-lg border border-surface-border bg-background text-xs font-mono"
                          />
                        </div>

                        <div className="col-span-6 sm:col-span-2">
                          <label className="block text-[10px] text-foreground-muted font-bold uppercase mb-0.5">
                            Catégorie TVA
                          </label>
                          <select
                            value={ligne.type_produit}
                            onChange={(e) => updateLigne(idx, 'type_produit', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-surface-border bg-background text-xs font-semibold"
                          >
                            <option value="medicament">Médicament (Exonéré 0%)</option>
                            <option value="cosmetique">Cosmétique (TVA 18%)</option>
                            <option value="parapharmacie">Parapharmacie (TVA 18%)</option>
                            <option value="materiel">Matériel (TVA 18%)</option>
                          </select>
                        </div>

                        <div className="col-span-4 sm:col-span-1">
                          <label className="block text-[10px] text-foreground-muted font-bold uppercase mb-0.5">
                            Qté
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={ligne.quantite}
                            onChange={(e) => updateLigne(idx, 'quantite', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-surface-border bg-background text-xs font-bold"
                          />
                        </div>

                        <div className="col-span-6 sm:col-span-2">
                          <label className="block text-[10px] text-foreground-muted font-bold uppercase mb-0.5">
                            P.A. HT unitaire
                          </label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={ligne.prix_achat_ht}
                            onChange={(e) => updateLigne(idx, 'prix_achat_ht', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-surface-border bg-background text-xs font-mono text-right"
                          />
                        </div>

                        <div className="col-span-2 sm:col-span-1 text-right pt-4">
                          <button
                            type="button"
                            onClick={() => supprimerLigne(idx)}
                            className="p-1.5 text-danger hover:bg-danger/10 rounded-lg"
                            title="Supprimer la ligne"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-foreground-muted pt-1 border-t border-surface-border/50 font-mono">
                        <span>
                          Sous-total HT : <strong className="text-foreground">{formatCFA(ligne.quantite * ligne.prix_achat_ht)}</strong>
                        </span>
                        <span>
                          {ligne.type_produit === 'medicament' ? (
                            <span className="text-emerald-600 font-semibold">Exonéré de TVA (0%)</span>
                          ) : (
                            <span className="text-amber-600 font-semibold">
                              TVA 18% régularisable : +{formatCFA(Math.round(ligne.quantite * ligne.prix_achat_ht * 0.18))}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Récapitulatif comptable & fiscal */}
              <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-foreground-muted">Total Valeur Marchande Perdue (Charge HT - Compte 6581) :</span>
                  <span className="font-bold font-mono text-danger text-sm">{formatCFA(totalHT)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-foreground-muted">TVA déductible admise sur cosmétiques (Visa officiel - Compte 4452) :</span>
                  <span className="font-bold font-mono text-emerald-600 text-sm">+{formatCFA(totalTVA)}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-surface-border font-bold text-foreground">
                  <span>Impact total de sortie de stock :</span>
                  <span className="font-mono text-base text-primary">{formatCFA(totalTTC)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground-muted uppercase mb-1">
                  Observations / Circonstances de destruction
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Ex: Incinération effectuée en présence du représentant du Service Régional de l'Hygiène conformément au protocole sanitaire..."
                  className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-xl border border-surface-border text-foreground text-xs font-semibold hover:bg-background"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Valider le PV & Enregistrer l'Écriture</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
