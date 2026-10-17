'use client'

import { useState } from 'react'
import { FileText, X, Printer, Scale } from 'lucide-react'
import { getReleveFournisseur } from './actions'

type Fournisseur = {
  id: string
  nom: string
  contact_telephone?: string
  contact_email?: string
  adresse?: string
  code_fournisseur?: string
  solde_dette: number
}

export default function ReleveFournisseurModal({ fournisseur }: { fournisseur: Fournisseur }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mouvements, setMouvements] = useState<any[]>([])

  const handleOpen = async () => {
    setIsOpen(true)
    setLoading(true)
    const res = await getReleveFournisseur(fournisseur.id)
    setLoading(false)
    if (res?.mouvements) {
      setMouvements(res.mouvements)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-border text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-all bg-surface"
        title="Voir et imprimer le relevé de compte fournisseur"
      >
        <FileText className="w-3.5 h-3.5 text-primary" />
        <span>Relevé</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white">
          <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-2xl border border-surface-border overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:w-full print:max-w-none">
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-surface-border bg-background/50 print:bg-transparent">
              <div>
                <h3 className="text-lg font-bold font-heading text-foreground">
                  Relevé de Compte Grossiste / Fournisseur
                </h3>
                <p className="text-xs text-foreground-muted">
                  Grossiste : <strong className="text-foreground">{fournisseur.nom}</strong> {fournisseur.code_fournisseur ? `(${fournisseur.code_fournisseur})` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer</span>
                </button>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="p-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-border"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Fiche synthétique */}
            <div className="p-5 bg-surface-border/20 border-b border-surface-border grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-foreground-muted block text-[11px]">Téléphone :</span>
                <span className="font-semibold text-foreground">{fournisseur.contact_telephone || '—'}</span>
              </div>
              <div>
                <span className="text-foreground-muted block text-[11px]">E-mail :</span>
                <span className="font-semibold text-foreground">{fournisseur.contact_email || '—'}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-foreground-muted block text-[11px]">Dette Due Actuelle :</span>
                <span className="text-base font-extrabold text-danger">
                  {Number(fournisseur.solde_dette || 0).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>

            {/* Tableau des mouvements */}
            <div className="p-5 max-h-[420px] overflow-y-auto print:max-h-none">
              {loading ? (
                <div className="py-12 text-center text-xs text-foreground-muted">
                  Chargement de l'historique comptable...
                </div>
              ) : mouvements.length === 0 ? (
                <div className="py-12 text-center text-foreground-muted">
                  <Scale className="w-10 h-10 mx-auto mb-2 opacity-30 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Aucun mouvement de dette enregistré</p>
                  <p className="text-xs text-foreground-muted mt-1">
                    Les factures d'achat, livraisons et règlements enregistrés apparaîtront ici.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-border/40 text-foreground-muted uppercase tracking-wider text-[10px] border-b border-surface-border">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Réf / Pièce</th>
                      <th className="py-2.5 px-3">Libellé</th>
                      <th className="py-2.5 px-3 text-right">Crédit (Facture)</th>
                      <th className="py-2.5 px-3 text-right">Débit (Règlement)</th>
                      <th className="py-2.5 px-3 text-right">Solde Dû</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/50">
                    {mouvements.map((m) => (
                      <tr key={m.id} className="hover:bg-surface-border/20">
                        <td className="py-2.5 px-3 font-mono text-foreground font-medium whitespace-nowrap">
                          {m.date_mouvement}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-foreground-muted whitespace-nowrap">
                          {m.numero_piece || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-foreground font-medium">
                          {m.libelle}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-danger">
                          {Number(m.credit) > 0 ? `${Number(m.credit).toLocaleString('fr-FR')} F` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-600">
                          {Number(m.debit) > 0 ? `${Number(m.debit).toLocaleString('fr-FR')} F` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-foreground">
                          {Number(m.solde_resultant).toLocaleString('fr-FR')} F
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-surface-border bg-background/50 flex justify-end print:hidden">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-foreground-muted hover:text-foreground font-semibold text-xs rounded-xl"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
