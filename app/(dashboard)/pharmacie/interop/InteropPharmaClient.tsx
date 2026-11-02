'use client'

import { useState } from 'react'
import { EchangePharmaSante, BordereauPharmaIpm, creerBordereauPharmaIpm } from './actions'
import { DemandeSubstitutionPharmaModal } from './DemandeSubstitutionPharmaModal'
import { SignalerRuptureModal } from './SignalerRuptureModal'
import { TransmettreEmailPharmaIpmModal } from './TransmettreEmailPharmaIpmModal'
import {
  Network, Pill, AlertTriangle, TrendingUp, FileCheck2,
  Building2, CheckCircle2, Clock, XCircle, Send, ArrowUpRight,
  ShieldCheck, Loader2, Plus, ShoppingCart, Mail
} from 'lucide-react'

export function InteropPharmaClient({
  echanges,
  bordereaux,
}: {
  echanges: EchangePharmaSante[]
  bordereaux: BordereauPharmaIpm[]
}) {
  const [activeTab, setActiveTab] = useState<'substitutions' | 'signaux' | 'ipm'>('substitutions')
  const [isSubModalOpen, setIsSubModalOpen] = useState(false)
  const [isRuptureModalOpen, setIsRuptureModalOpen] = useState(false)
  const [isBordereauModalOpen, setIsBordereauModalOpen] = useState(false)
  const [selectedBordereauEmail, setSelectedBordereauEmail] = useState<BordereauPharmaIpm | null>(null)

  // Bordereau form state
  const [loadingBord, setLoadingBord] = useState(false)
  const [orgNom, setOrgNom] = useState('IPM Sonatel & Entreprises')
  const [montantReclame, setMontantReclame] = useState('1420000')
  const [nbFactures, setNbFactures] = useState('38')

  const substitutions = echanges.filter((e) => e.type_echange === 'substitution')
  const signaux = echanges.filter((e) => e.type_echange === 'signal_epidemique' || e.type_echange === 'alerte_rupture')

  const formatCFA = (montant: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(montant) + ' FCFA'

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
        <DemandeSubstitutionPharmaModal onClose={() => setIsSubModalOpen(false)} />
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
      <div className="flex border-b border-surface-border gap-2">
        {[
          { id: 'substitutions', label: 'Demandes de Substitution', count: substitutions.length },
          { id: 'signaux', label: 'Signaux Médecins & Grossistes', count: signaux.length },
          { id: 'ipm', label: 'Télétransmission IPM / Assurances', count: bordereaux.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
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

