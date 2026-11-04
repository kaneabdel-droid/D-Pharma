'use client'

import { useState } from 'react'
import {
  EchangePharmaSante,
  BordereauPharmaIpm,
  creerBordereauPharmaIpm,
  rechercherOrdonnanceSante,
  type OrdonnanceTrouvee,
} from './actions'
import { DemandeSubstitutionPharmaModal } from './DemandeSubstitutionPharmaModal'
import { SignalerRuptureModal } from './SignalerRuptureModal'
import { TransmettreEmailPharmaIpmModal } from './TransmettreEmailPharmaIpmModal'
import { EnvoyerMedecinWhatsAppModal } from './EnvoyerMedecinWhatsAppModal'
import {
  Network, Pill, AlertTriangle, TrendingUp, FileCheck2,
  Building2, CheckCircle2, Clock, XCircle, Send, ArrowUpRight,
  ShieldCheck, Loader2, Plus, ShoppingCart, Mail, QrCode, Search,
  Check, AlertCircle, ShoppingBag, ArrowRight
} from 'lucide-react'

export function InteropPharmaClient({
  echanges,
  bordereaux,
}: {
  echanges: EchangePharmaSante[]
  bordereaux: BordereauPharmaIpm[]
}) {
  const [activeTab, setActiveTab] = useState<'substitutions' | 'signaux' | 'ipm' | 'recherche_ordonnance'>('recherche_ordonnance')
  const [isSubModalOpen, setIsSubModalOpen] = useState(false)
  const [subModalData, setSubModalData] = useState<{
    initialMedicament?: string
    initialOrdonnance?: string
    initialPatient?: string
    initialIpp?: string
    initialMedecin?: string
    initialStructure?: string
  } | null>(null)
  const [isRuptureModalOpen, setIsRuptureModalOpen] = useState(false)
  const [isBordereauModalOpen, setIsBordereauModalOpen] = useState(false)
  const [selectedBordereauEmail, setSelectedBordereauEmail] = useState<BordereauPharmaIpm | null>(null)
  const [selectedOrdonnanceWhatsApp, setSelectedOrdonnanceWhatsApp] = useState<OrdonnanceTrouvee | null>(null)

  // État recherche d'ordonnance D-Santé
  const [codeOrdonnance, setCodeOrdonnance] = useState('ORD-2610-0012')
  const [isSearchingOrd, setIsSearchingOrd] = useState(false)
  const [ordonnanceTrouvee, setOrdonnanceTrouvee] = useState<OrdonnanceTrouvee | null>(null)
  const [searchOrdError, setSearchOrdError] = useState<string | null>(null)
  const [transfertPosMessage, setTransfertPosMessage] = useState<string | null>(null)

  // Bordereau form state
  const [loadingBord, setLoadingBord] = useState(false)
  const [orgNom, setOrgNom] = useState('IPM Sonatel & Entreprises')
  const [montantReclame, setMontantReclame] = useState('1420000')
  const [nbFactures, setNbFactures] = useState('38')

  const substitutions = echanges.filter((e) => e.type_echange === 'substitution')
  const signaux = echanges.filter((e) => e.type_echange === 'signal_epidemique' || e.type_echange === 'alerte_rupture')

  const formatCFA = (montant: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(montant) + ' FCFA'

  const handleRechercheOrdonnance = async (codeToSearch?: string) => {
    const targetCode = codeToSearch || codeOrdonnance
    if (!targetCode.trim()) return

    setIsSearchingOrd(true)
    setSearchOrdError(null)
    setTransfertPosMessage(null)

    const res = await rechercherOrdonnanceSante(targetCode)
    setIsSearchingOrd(false)

    if (res.error) {
      setSearchOrdError(res.error)
      setOrdonnanceTrouvee(null)
    } else if (res.ordonnance) {
      setOrdonnanceTrouvee(res.ordonnance)
    }
  }

  const handleSimulerScanQr = () => {
    const demoCodes = ['ORD-2610-0012', 'ORD-2610-0091', 'ORD-CHU-0441']
    const picked = demoCodes[Math.floor(Math.random() * demoCodes.length)]
    setCodeOrdonnance(picked)
    handleRechercheOrdonnance(picked)
  }

  const handleTransfererAuPos = (medicamentNom: string) => {
    setTransfertPosMessage(`✓ ${medicamentNom} ajouté avec succès à la file d'attente du POS comptoir !`)
    setTimeout(() => setTransfertPosMessage(null), 4000)
  }

  const handleCreerBordereau = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingBord(true)
    const formData = new FormData()
    formData.append('organisme_nom', orgNom)
    formData.append('montant_total', montantReclame)
    formData.append('nombre_factures', nbFactures)
    formData.append('periode_debut', '2026-10-01')
    formData.append('periode_fin', '2026-10-31')

    await creerBordereauPharmaIpm(formData)
    setLoadingBord(false)
    setIsBordereauModalOpen(false)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Modals */}
      {isSubModalOpen && (
        <DemandeSubstitutionPharmaModal
          onClose={() => {
            setIsSubModalOpen(false)
            setSubModalData(null)
          }}
          initialMedicament={subModalData?.initialMedicament}
          initialOrdonnance={subModalData?.initialOrdonnance}
          initialPatient={subModalData?.initialPatient}
          initialIpp={subModalData?.initialIpp}
          initialMedecin={subModalData?.initialMedecin}
          initialStructure={subModalData?.initialStructure}
        />
      )}
      {selectedOrdonnanceWhatsApp && (
        <EnvoyerMedecinWhatsAppModal
          ordonnance={selectedOrdonnanceWhatsApp}
          onClose={() => setSelectedOrdonnanceWhatsApp(null)}
        />
      )}
      {isRuptureModalOpen && (
        <SignalerRuptureModal onClose={() => setIsRuptureModalOpen(false)} />
      )}
      {selectedBordereauEmail && (
        <TransmettreEmailPharmaIpmModal
          bordereau={selectedBordereauEmail}
          onClose={() => setSelectedBordereauEmail(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
              DEMBA HEALTH EXCHANGE
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Liaison D-Santé (Cliniques) & Télétransmission IPM
          </h2>
          <p className="text-xs sm:text-sm text-foreground-muted">
            Accord de substitution en direct avec les médecins, signaux d'épidémies et télétransmission des créances d’assurances.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsRuptureModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-danger/30 text-danger hover:bg-danger/10 text-xs font-bold transition-colors cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Signaler Rupture Grossiste</span>
          </button>

          <button
            onClick={() => setIsSubModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white hover:bg-primary-hover text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            <Pill className="w-3.5 h-3.5" />
            <span>Demander Substitution</span>
          </button>

          <button
            onClick={() => setIsBordereauModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Télétransmettre IPM</span>
          </button>
        </div>
      </div>

      {/* Modal Bordereau IPM Pharma */}
      {isBordereauModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-teal-600" />
              Télétransmission Bordereau Tiers-Payant
            </h3>
            <form onSubmit={handleCreerBordereau} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground-muted block">Organisme :</label>
                <input
                  type="text"
                  value={orgNom}
                  onChange={(e) => setOrgNom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground-muted block">Factures :</label>
                  <input
                    type="number"
                    value={nbFactures}
                    onChange={(e) => setNbFactures(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground-muted block">Montant Total :</label>
                  <input
                    type="number"
                    value={montantReclame}
                    onChange={(e) => setMontantReclame(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground font-mono font-bold"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setIsBordereauModalOpen(false)}
                  className="py-2 px-3 rounded-xl border border-surface-border text-foreground-muted"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loadingBord}
                  className="py-2 px-4 rounded-xl bg-teal-600 text-white font-bold cursor-pointer"
                >
                  {loadingBord ? 'Envoi...' : 'Télétransmettre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-3xl p-5 border border-surface-border shadow-xs space-y-1">
          <div className="flex items-center justify-between text-foreground-muted text-xs">
            <span className="font-semibold">Substitutions en Cours</span>
            <Pill className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{substitutions.length}</p>
          <p className="text-[11px] text-primary font-medium">Accords traités avec les médecins</p>
        </div>

        <div className="bg-surface rounded-3xl p-5 border border-surface-border shadow-xs space-y-1">
          <div className="flex items-center justify-between text-foreground-muted text-xs">
            <span className="font-semibold">Signaux Cliniques Reçus</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{signaux.length}</p>
          <p className="text-[11px] text-amber-600 font-medium">Demandes prévisionnelles de médecins D-Santé</p>
        </div>

        <div className="bg-surface rounded-3xl p-5 border border-surface-border shadow-xs space-y-1">
          <div className="flex items-center justify-between text-foreground-muted text-xs">
            <span className="font-semibold">Bordereaux IPM Officine</span>
            <FileCheck2 className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-foreground">{bordereaux.length}</p>
          <p className="text-[11px] text-teal-600 font-medium">
            {formatCFA(bordereaux.reduce((acc, b) => acc + Number(b.montant_total_reclame || 0), 0))} réclamés
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-border gap-2 overflow-x-auto">
        {[
          { id: 'recherche_ordonnance', label: 'Scanner Ordonnance D-Santé', count: ordonnanceTrouvee ? 'Trouvée' : 'Scanner' },
          { id: 'substitutions', label: 'Demandes de Substitution', count: substitutions.length },
          { id: 'signaux', label: 'Signaux Médecins & Grossistes', count: signaux.length },
          { id: 'ipm', label: 'Télétransmission IPM / Assurances', count: bordereaux.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-foreground-muted hover:text-foreground'
            }`}
          >
            <span>{tab.label}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-surface-border text-[10px] text-foreground font-mono">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Contenu Tab : Recherche & Scan d'Ordonnance D-Santé */}
      {activeTab === 'recherche_ordonnance' && (
        <div className="space-y-6">
          {/* Barre de Recherche et Simulation Scan */}
          <div className="bg-surface rounded-3xl p-6 border border-surface-border shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                Interconnexion Prescriptions D-Santé en Temps Réel
              </h3>
              <p className="text-xs text-foreground-muted mt-1">
                Saisissez ou scannez le QR code de l’ordonnance délivrée par un médecin ou un hôpital D-Santé.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-foreground-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ex : ORD-2610-0012, ORD-2610-0091..."
                  value={codeOrdonnance}
                  onChange={(e) => setCodeOrdonnance(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRechercheOrdonnance()
                  }}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-surface-border bg-background text-foreground text-sm font-mono focus:ring-2 focus:ring-primary/20 outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRechercheOrdonnance()}
                  disabled={isSearchingOrd}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSearchingOrd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Vérifier Ordonnance</span>
                </button>

                <button
                  type="button"
                  onClick={handleSimulerScanQr}
                  className="px-4 py-2.5 rounded-xl bg-surface-border hover:bg-surface-border/80 text-foreground text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Simuler un scan de QR Code patient"
                >
                  <QrCode className="w-4 h-4 text-primary" />
                  <span>Scan QR Code</span>
                </button>
              </div>
            </div>

            {searchOrdError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{searchOrdError}</span>
              </div>
            )}

            {transfertPosMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{transfertPosMessage}</span>
              </div>
            )}
          </div>

          {/* Fiche Ordonnance D-Santé Croisée avec le Stock Officine */}
          {ordonnanceTrouvee && (
            <div className="bg-surface rounded-3xl p-6 border border-primary/30 shadow-md space-y-6">
              {/* Entête Fiche Prescription */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-surface-border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-primary text-primary-foreground font-mono font-bold text-xs">
                      {ordonnanceTrouvee.numero}
                    </span>
                    <span className="text-xs text-foreground-muted font-medium">
                      Émise le {ordonnanceTrouvee.date}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-foreground">
                    {ordonnanceTrouvee.structureNom}
                  </h4>
                  <div className="flex flex-wrap items-center gap-3 pt-0.5">
                    <p className="text-xs text-foreground-muted flex items-center gap-1">
                      <span>Prescripteur :</span>
                      <strong className="text-foreground">{ordonnanceTrouvee.medecinNom}</strong>
                    </p>

                    <button
                      type="button"
                      onClick={() => setSelectedOrdonnanceWhatsApp(ordonnanceTrouvee)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition cursor-pointer"
                      title="Envoyer un message au médecin prescripteur via WhatsApp"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                      </svg>
                      <span>Envoyer au Médecin (WhatsApp)</span>
                    </button>
                  </div>
                </div>

                {/* Patient & Prise en Charge IPM */}
                <div className="bg-background rounded-2xl p-4 border border-surface-border text-xs space-y-1 min-w-[240px]">
                  <span className="text-foreground-muted font-semibold block uppercase text-[10px] tracking-wider">
                    Bénéficiaire / Patient
                  </span>
                  <p className="font-bold text-sm text-foreground">{ordonnanceTrouvee.patientNom}</p>
                  <p className="text-foreground-muted font-mono text-[11px]">IPP : {ordonnanceTrouvee.patientIpp}</p>
                  {ordonnanceTrouvee.organismeAssurance && (
                    <div className="pt-1 mt-1 border-t border-surface-border flex items-center justify-between text-teal-600 font-bold">
                      <span>{ordonnanceTrouvee.organismeAssurance}</span>
                      <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-[10px]">
                        Taux {ordonnanceTrouvee.tauxCouverture}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Lignes de Prescription Médicale & Disponibilité en Rayon */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                    Médicaments prescrits & État des Stocks Officine
                  </h5>
                  <span className="text-[11px] text-foreground-muted">
                    {ordonnanceTrouvee.items.length} médicament(s) prescrit(s)
                  </span>
                </div>

                <div className="divide-y divide-surface-border rounded-2xl border border-surface-border overflow-hidden bg-background">
                  {ordonnanceTrouvee.items.map((item, idx) => (
                    <div key={idx} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-surface-hover/30 transition">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">
                            {item.medicament}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-surface-border text-foreground font-mono text-xs font-bold">
                            Qté : {item.quantite}
                          </span>
                        </div>
                        <p className="text-xs text-foreground-muted">
                          Posologie : <strong className="text-foreground">{item.posologie}</strong>
                        </p>
                      </div>

                      {/* Statut Stock et Actions */}
                      <div className="flex flex-wrap items-center gap-3">
                        {item.disponibleEnStock ? (
                          <div className="flex items-center gap-3">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>En Stock ({item.stockActuel} boîtes)</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => handleTransfererAuPos(item.medicament)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Ajouter au POS</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 border border-red-500/20 text-xs font-bold flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Rupture Officine (Stock 0)</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                setSubModalData({
                                  initialMedicament: item.medicament,
                                  initialOrdonnance: ordonnanceTrouvee.numero,
                                  initialPatient: ordonnanceTrouvee.patientNom,
                                  initialIpp: ordonnanceTrouvee.patientIpp,
                                  initialMedecin: ordonnanceTrouvee.medecinNom,
                                  initialStructure: ordonnanceTrouvee.structureNom,
                                })
                                setIsSubModalOpen(true)
                              }}
                              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                            >
                              <Pill className="w-3.5 h-3.5" />
                              <span>Proposer Substitut</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contenu Tab 1 : Substitutions */}
      {activeTab === 'substitutions' && (
        <div className="space-y-4">
          {substitutions.map((sub) => {
            const isEnAttente = sub.statut === 'en_attente'
            const isApprouve = sub.statut === 'approuve'

            return (
              <div
                key={sub.id}
                className="bg-surface rounded-3xl p-5 border border-surface-border shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-surface-border/60 pb-3">
                  <div>
                    <span className="font-bold text-foreground block text-sm">
                      Patient : {sub.patient_nom} {sub.patient_ipp ? `(${sub.patient_ipp})` : ''}
                    </span>
                    <span className="text-[11px] text-foreground-muted">
                      Ordonnance : {sub.numero_ordonnance || 'N/A'}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      isEnAttente
                        ? 'bg-amber-500/10 text-amber-600'
                        : isApprouve
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-danger/10 text-danger'
                    }`}
                  >
                    {isEnAttente ? 'En attente accord médecin' : isApprouve ? 'Accord Médecin Reçu' : 'Refusé'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-danger/5 border border-danger/20">
                    <span className="text-[10px] font-bold text-danger uppercase block mb-0.5">
                      Prescrit (Rupture) :
                    </span>
                    <span className="font-bold text-foreground">{sub.medicament_prescrit}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-0.5">
                      Générique Proposé en Rayon :
                    </span>
                    <span className="font-bold text-emerald-600">{sub.medicament_propose}</span>
                  </div>
                </div>

                {sub.reponse_medecin && (
                  <div className="p-3 rounded-2xl bg-background border border-surface-border text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-foreground">
                        {sub.valide_par_medecin_nom || 'Médecin'} :
                      </span>{' '}
                      <span className="text-foreground-muted">{sub.reponse_medecin}</span>
                    </div>
                  </div>
                )}

                {isEnAttente && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-border/50 text-xs">
                    <span className="text-[11px] text-foreground-muted">
                      Pas encore de réponse ? Notifiez le médecin en direct :
                    </span>
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `Bonjour Docteur,\n` +
                        `Officine Pharmacie : Demande d'accord de substitution DCI pour ${sub.patient_nom || 'le patient'}${sub.numero_ordonnance ? ` (Ordonnance : ${sub.numero_ordonnance})` : ''}.\n\n` +
                        `• Médicament prescrit (indisponible) : ${sub.medicament_prescrit}\n` +
                        `• Substitut en stock proposé : ${sub.medicament_propose}\n` +
                        `${sub.posologie_ajustee ? `• Posologie suggérée : ${sub.posologie_ajustee}\n` : ''}` +
                        `${sub.motif ? `• Motif : ${sub.motif}\n` : ''}\n` +
                        `Merci de bien vouloir nous confirmer votre accord.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
                      title="Envoyer la demande d'accord au médecin via WhatsApp"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                      </svg>
                      <span>Envoyer au Médecin via WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Contenu Tab 2 : Signaux & Alertes */}
      {activeTab === 'signaux' && (
        <div className="space-y-4">
          {signaux.map((sig) => (
            <div
              key={sig.id}
              className="bg-surface rounded-3xl p-5 border border-surface-border shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-surface-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-foreground text-sm block">
                      {sig.type_echange === 'signal_epidemique'
                        ? 'Signal Prédictif Émis par Médecin D-Santé'
                        : 'Alerte Rupture Grossiste'}
                    </span>
                    {sig.valide_par_medecin_nom && (
                      <span className="text-[11px] text-foreground-muted">
                        Émetteur : {sig.valide_par_medecin_nom}
                      </span>
                    )}
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold uppercase">
                  Urgence : {sig.niveau_urgence}
                </span>
              </div>

              <div className="text-xs space-y-1">
                <span className="font-bold text-foreground block">
                  Produits ciblés : {sig.medicament_prescrit}
                </span>
                <p className="text-foreground-muted">{sig.motif}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contenu Tab 3 : Télétransmission IPM */}
      {activeTab === 'ipm' && (
        <div className="bg-surface rounded-3xl border border-surface-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-background text-foreground-muted uppercase tracking-wider font-bold border-b border-surface-border text-[11px]">
                <tr>
                  <th className="py-3 px-4">N° Bordereau</th>
                  <th className="py-3 px-4">Organisme Assureur</th>
                  <th className="py-3 px-4">Période</th>
                  <th className="py-3 px-4 text-center">Factures</th>
                  <th className="py-3 px-4 text-right">Montant Réclamé</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {bordereaux.map((b) => (
                  <tr key={b.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-primary">
                      {b.numero_bordereau}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      {b.organisme_nom}
                    </td>
                    <td className="py-3.5 px-4 text-foreground-muted font-mono">
                      {b.periode_debut} au {b.periode_fin}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold">
                      {b.nombre_factures}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                      {formatCFA(b.montant_total_reclame)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" />
                        Télétransmis
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedBordereauEmail(b)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-surface-border text-foreground hover:bg-surface hover:text-teal-600 font-semibold text-xs transition-colors"
                        title="Transmettre par email à l'IPM"
                      >
                        <Mail className="w-3.5 h-3.5 text-teal-600" />
                        <span>Envoyer par mail</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

