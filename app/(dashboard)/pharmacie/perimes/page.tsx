import Link from 'next/link'
import { getPVDestructions, getLotsPerimesDisponibles } from './actions'
import NouveauPVModal from './NouveauPVModal'
import { FileWarning, ShieldCheck, AlertTriangle, Scale, Printer, CheckCircle2, Building2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PerimesPage() {
  const [{ destructions }, { lots }] = await Promise.all([
    getPVDestructions(),
    getLotsPerimesDisponibles(),
  ])

  const formatCFA = (val: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(val) + ' FCFA'

  const totalPertesHT = (destructions || []).reduce((s, p) => s + (Number(p.valeur_achat_ht_totale) || 0), 0)
  const totalTVARecup = (destructions || []).reduce((s, p) => s + (Number(p.tva_recuperable_totale) || 0), 0)
  const totalLotsEnRayon = (lots || []).reduce((s, l) => s + (Number(l.quantite) || 0), 0)

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
            <FileWarning className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-heading text-foreground">
              Gestion des Produits Périmés & PV de Destruction
            </h1>
            <p className="text-xs sm:text-sm text-foreground-muted">
              Traçabilité légale, visa Huissier / Service d'Hygiène, régularisation TVA et écritures comptables SYSCOHADA.
            </p>
          </div>
        </div>

        <NouveauPVModal lotsPerimes={lots || []} />
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground-muted font-bold uppercase tracking-wider">Pertes Cumulées (HT)</span>
            <AlertTriangle className="w-4 h-4 text-danger" />
          </div>
          <p className="text-2xl font-black text-danger mt-1">{formatCFA(totalPertesHT)}</p>
          <span className="text-[11px] text-foreground-muted">Imputé au compte 6581 (Charge)</span>
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground-muted font-bold uppercase tracking-wider">TVA Déductible Validée</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-1">{formatCFA(totalTVARecup)}</p>
          <span className="text-[11px] text-foreground-muted">TVA 18% cosmétiques (PV officiel)</span>
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground-muted font-bold uppercase tracking-wider">PV Officiels Établis</span>
            <Scale className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground mt-1">{(destructions || []).length}</p>
          <span className="text-[11px] text-foreground-muted">Actes visés par autorité publique</span>
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground-muted font-bold uppercase tracking-wider">Périmés en Rayon</span>
            <FileWarning className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 mt-1">{totalLotsEnRayon} bte{totalLotsEnRayon > 1 ? 's' : ''}</p>
          <span className="text-[11px] text-foreground-muted">{(lots || []).length} lot(s) à retirer immédiatement</span>
        </div>
      </div>

      {/* Alerte si des lots sont actuellement périmés en stock */}
      {lots && lots.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-amber-800 dark:text-amber-200">
                Alerte Sanitaire : {lots.length} lot(s) expiré(s) détecté(s) en stock ({totalLotsEnRayon} unités)
              </h4>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                Conformément au Code de la Santé Publique, ces spécialités doivent être immédiatement retirées du comptoir et détruites sous contrôle d'huissier ou d'hygiène.
              </p>
            </div>
          </div>
          <NouveauPVModal lotsPerimes={lots} />
        </div>
      )}

      {/* Liste des PV de destruction */}
      <div className="bg-surface border border-surface-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-surface-border flex items-center justify-between">
          <h3 className="font-bold font-heading text-sm text-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Registre Légal des Procès-Verbaux de Destruction
          </h3>
          <span className="text-xs text-foreground-muted">
            Conforme inspection DPM & DGID
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-background text-foreground-muted text-xs uppercase font-bold border-b border-surface-border">
              <tr>
                <th className="py-3 px-4">N° PV</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Autorité Présente / Visée</th>
                <th className="py-3 px-4">Visa Légal</th>
                <th className="py-3 px-4 text-right">Perte HT (6581)</th>
                <th className="py-3 px-4 text-right text-emerald-600">TVA Admise (18%)</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {destructions && destructions.length > 0 ? (
                destructions.map((pv) => (
                  <tr key={pv.id} className="hover:bg-background/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-primary">
                      {pv.numero_pv}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-foreground">
                      {new Date(pv.date_destruction).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-foreground">
                      <span className="capitalize">{pv.autorite_type.replace(/_/g, ' ')}</span>
                      {pv.nom_officier_autorite && (
                        <span className="block text-[11px] text-foreground-muted font-normal">
                          {pv.nom_officier_autorite}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs">
                      {pv.numero_visa_acte ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold">
                          {pv.numero_visa_acte}
                        </span>
                      ) : (
                        <span className="text-foreground-muted">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-danger text-xs">
                      {formatCFA(pv.valeur_achat_ht_totale || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 text-xs">
                      {pv.tva_recuperable_totale > 0 ? formatCFA(pv.tva_recuperable_totale) : '0 FCFA (Exonéré)'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        href={`/pharmacie/perimes/${pv.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-border text-foreground hover:border-primary hover:text-primary transition-colors text-xs font-semibold"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Imprimer le PV</span>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-foreground-muted text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-50" />
                    Aucun procès-verbal de destruction enregistré. Tous vos stocks sont à jour.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
