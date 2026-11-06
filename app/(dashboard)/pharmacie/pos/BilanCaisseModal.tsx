'use client'

import { useState } from 'react'
import { FileText, Printer, CheckCircle2, AlertCircle, X, DollarSign, Calculator, Store, Calendar, ArrowUpRight } from 'lucide-react'

export type VenteCaisse = {
  id: string
  numero_ticket: string
  montant_total: number
  moyen_paiement: string
  date_vente: string
  statut: string
  compte_tresorerie_id?: string
  part_patient?: number
  part_credit?: number
}

export default function BilanCaisseModal({
  activeCaisse,
  recentVentes = [],
  locale = 'fr'
}: {
  activeCaisse: { id: string, nom: string, solde?: number }
  recentVentes: VenteCaisse[]
  locale?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [fondDeCaisse, setFondDeCaisse] = useState<number>(50000)
  const [montantRecompte, setMontantRecompte] = useState<string>('')
  const [isPrinting, setIsPrinting] = useState(false)

  // Filtrer les ventes du jour associées à cette caisse
  const aujourdhuiStr = new Date().toISOString().split('T')[0]
  
  const ventesDuPoste = recentVentes.filter(v => {
    const isThisCaisse = v.compte_tresorerie_id === activeCaisse.id
    const dateVente = v.date_vente ? v.date_vente.split('T')[0] : ''
    const isToday = dateVente === aujourdhuiStr
    const isValid = v.statut !== 'annulee'
    return isThisCaisse && isToday && isValid
  })

  // Calculs d'encaissements
  const totalEspeces = ventesDuPoste
    .filter(v => v.moyen_paiement === 'especes')
    .reduce((sum, v) => sum + Number(v.part_patient ?? v.montant_total), 0)

  const totalMobileMoney = ventesDuPoste
    .filter(v => v.moyen_paiement === 'mobile_money')
    .reduce((sum, v) => sum + Number(v.part_patient ?? v.montant_total), 0)

  const totalCarte = ventesDuPoste
    .filter(v => v.moyen_paiement === 'carte')
    .reduce((sum, v) => sum + Number(v.part_patient ?? v.montant_total), 0)

  const totalCredit = ventesDuPoste
    .reduce((sum, v) => sum + Number(v.part_credit || 0), 0)

  const totalGlobalEncaisser = totalEspeces + totalMobileMoney + totalCarte
  const totalTheoriqueEspeces = fondDeCaisse + totalEspeces

  const reelNum = montantRecompte !== '' ? parseFloat(montantRecompte) : null
  const ecartCaisse = reelNum !== null ? reelNum - totalTheoriqueEspeces : null

  const handlePrintTicketZ = () => {
    window.print()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-surface border border-surface-border text-foreground hover:border-primary hover:text-primary transition-all shadow-2xs"
        title="Consulter le récapitulatif de caisse et éditer le Ticket Z du poste"
      >
        <FileText className="w-3.5 h-3.5 text-primary" />
        <span className="hidden sm:inline">Clôture / Bilan du Poste</span>
        <span className="sm:hidden">Ticket Z</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-surface border border-surface-border w-full max-w-2xl rounded-2xl p-5 shadow-2xl relative max-h-[92vh] flex flex-col">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-black/5"
            >
              <X className="w-4 h-4" />
            </button>

            {/* En-tête modal */}
            <div className="flex items-center gap-3 pb-3 border-b border-surface-border">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold font-heading text-foreground">
                    Pointage & Clôture de Caisse (Ticket Z)
                  </h3>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
                    {activeCaisse.nom}
                  </span>
                </div>
                <p className="text-xs text-foreground-muted flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Session du {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </p>
              </div>
            </div>

            {/* Contenu avec défilement */}
            <div className="overflow-y-auto py-4 space-y-4 flex-1 pr-1">
              {/* Cartes d'encaissement du poste */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-background p-3 rounded-xl border border-surface-border">
                  <span className="text-[10px] font-bold uppercase text-foreground-muted block">Espèces encaissées</span>
                  <span className="text-base font-black font-mono text-emerald-600 mt-1 block">
                    {totalEspeces.toLocaleString('fr-FR')} <span className="text-[10px] font-bold">F</span>
                  </span>
                </div>
                <div className="bg-background p-3 rounded-xl border border-surface-border">
                  <span className="text-[10px] font-bold uppercase text-foreground-muted block">Mobile Money</span>
                  <span className="text-base font-black font-mono text-primary mt-1 block">
                    {totalMobileMoney.toLocaleString('fr-FR')} <span className="text-[10px] font-bold">F</span>
                  </span>
                </div>
                <div className="bg-background p-3 rounded-xl border border-surface-border">
                  <span className="text-[10px] font-bold uppercase text-foreground-muted block">Prise en charge / Crédit</span>
                  <span className="text-base font-black font-mono text-amber-600 mt-1 block">
                    {totalCredit.toLocaleString('fr-FR')} <span className="text-[10px] font-bold">F</span>
                  </span>
                </div>
                <div className="bg-background p-3 rounded-xl border border-surface-border">
                  <span className="text-[10px] font-bold uppercase text-foreground-muted block">Tickets émis</span>
                  <span className="text-base font-black font-mono text-foreground mt-1 block">
                    {ventesDuPoste.length} <span className="text-[10px] font-bold text-foreground-muted">tickets</span>
                  </span>
                </div>
              </div>

              {/* Rapprochement & Contrôle du tiroir-caisse */}
              <div className="bg-background p-4 rounded-xl border border-surface-border space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                  <Calculator className="w-4 h-4 text-primary" />
                  <span>Contrôle physique du tiroir-caisse (Espèces)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Fond de caisse d&apos;ouverture (FCFA)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={fondDeCaisse}
                      onChange={(e) => setFondDeCaisse(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border border-surface-border bg-surface text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Espèces physiques recomptées (FCFA)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Saisissez le total recompté..."
                      value={montantRecompte}
                      onChange={(e) => setMontantRecompte(e.target.value)}
                      className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border border-surface-border bg-surface text-foreground"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface border border-surface-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-foreground-muted block">Espèces théoriques attendues dans le tiroir :</span>
                    <span className="font-mono font-black text-sm text-foreground">
                      {totalTheoriqueEspeces.toLocaleString('fr-FR')} FCFA
                    </span>
                    <span className="text-[10px] text-foreground-muted ml-1">
                      (Fond {fondDeCaisse.toLocaleString('fr-FR')} + Encaissé {totalEspeces.toLocaleString('fr-FR')})
                    </span>
                  </div>

                  {reelNum !== null && ecartCaisse !== null && (
                    <div className="text-right">
                      <span className="text-foreground-muted block">Écart de caisse :</span>
                      <span className={`font-mono font-black text-sm ${
                        ecartCaisse === 0 
                          ? 'text-emerald-600' 
                          : ecartCaisse > 0 
                          ? 'text-primary' 
                          : 'text-danger'
                      }`}>
                        {ecartCaisse > 0 ? `+${ecartCaisse.toLocaleString('fr-FR')}` : ecartCaisse.toLocaleString('fr-FR')} FCFA
                        {ecartCaisse === 0 && ' (Parfait ✓)'}
                        {ecartCaisse > 0 && ' (Excédent)'}
                        {ecartCaisse < 0 && ' (Manquant)'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Liste des dernières ventes de cette caisse */}
              <div>
                <h4 className="text-xs font-bold text-foreground mb-2 flex items-center justify-between">
                  <span>Derniers tickets enregistrés sur ce poste aujourd&apos;hui ({ventesDuPoste.length})</span>
                  <span className="text-[11px] text-foreground-muted font-normal">
                    Total encaissé : {totalGlobalEncaisser.toLocaleString('fr-FR')} FCFA
                  </span>
                </h4>

                <div className="max-h-40 overflow-y-auto border border-surface-border rounded-xl divide-y divide-surface-border">
                  {ventesDuPoste.length === 0 ? (
                    <div className="p-4 text-center text-xs text-foreground-muted">
                      Aucune vente effectuée sur ce poste aujourd&apos;hui.
                    </div>
                  ) : (
                    ventesDuPoste.map((v) => (
                      <div key={v.id} className="p-2.5 bg-background flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground">{v.numero_ticket}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-surface-border text-foreground-muted uppercase">
                            {v.moyen_paiement}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-foreground">
                          {Number(v.montant_total).toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Pied du modal avec impression Ticket Z */}
            <div className="pt-3 border-t border-surface-border flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-2 rounded-xl border border-surface-border text-xs font-semibold text-foreground hover:bg-surface-hover"
              >
                Fermer
              </button>

              <button
                type="button"
                onClick={handlePrintTicketZ}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-md flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer Ticket Z du Poste</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

