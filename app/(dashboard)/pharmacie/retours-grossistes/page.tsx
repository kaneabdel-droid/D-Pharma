import { getRetoursGrossistes, getFournisseursGrossistes } from './actions'
import NouveauRetourModal from './NouveauRetourModal'
import EnregistrerAvoirModal from './EnregistrerAvoirModal'
import { RotateCcw, Truck, Receipt, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { getDictionary, getLocale } from '@/dictionaries'

export const dynamic = 'force-dynamic'

export default async function RetoursGrossistesPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const rDict = dict.pharmacie?.retours || {}

  const [{ retours }, { fournisseurs }] = await Promise.all([
    getRetoursGrossistes(),
    getFournisseursGrossistes(),
  ])

  const formatCFA = (val: number) =>
    new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(val) + ' FCFA'

  const totalAvoirsObtenus = (retours || [])
    .filter((r) => r.statut === 'avoir_recu')
    .reduce((s, r) => s + (Number(r.montant_avoir_ttc) || Number(r.montant_avoir_ht) || 0), 0)

  const enAttenteAvoir = (retours || [])
    .filter((r) => r.statut !== 'avoir_recu' && r.statut !== 'refuse')

  const totalEnAttente = enAttenteAvoir.reduce((s, r) => s + (Number(r.valeur_estimee_ht) || 0), 0)

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-heading text-foreground">
              {rDict.title || 'Retours & Avoirs chez les Grossistes'}
            </h1>
            <p className="text-xs sm:text-sm text-foreground-muted">
              {rDict.subtitle || "Suivi des colis de retours (périmés avec convention de reprise, erreurs, casses) et lettrage comptable des notes d'avoir."}
            </p>
          </div>
        </div>

        <NouveauRetourModal fournisseurs={fournisseurs || []} />
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground-muted font-bold uppercase tracking-wider">
              {rDict.kpi_avoirs || 'Avoirs Encaissés / Déduits'}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-1">{formatCFA(totalAvoirsObtenus)}</p>
          <span className="text-[11px] text-foreground-muted">{rDict.kpi_avoirs_sub || 'Déduit des dettes fournisseurs (401)'}</span>
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground-muted font-bold uppercase tracking-wider">
              {rDict.kpi_en_attente || "Retours en Attente d'Avoir"}
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 mt-1">{formatCFA(totalEnAttente)}</p>
          <span className="text-[11px] text-foreground-muted">{enAttenteAvoir.length} {rDict.kpi_en_attente_sub || 'dossier(s) en cours chez les grossistes'}</span>
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground-muted font-bold uppercase tracking-wider">Total Bons de Retour</span>
            <Truck className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground mt-1">{(retours || []).length}</p>
          <span className="text-[11px] text-foreground-muted">Expéditions répertoriées</span>
        </div>
      </div>

      {/* Liste des retours */}
      <div className="bg-surface border border-surface-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-surface-border flex items-center justify-between">
          <h3 className="font-bold font-heading text-sm text-foreground">
            Historique des Retours Expédiés & Notes d'Avoirs
          </h3>
          <span className="text-xs text-foreground-muted">Laborex, COPHASE, Sodipharm, Duopharm...</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-background text-foreground-muted text-xs uppercase font-bold border-b border-surface-border">
              <tr>
                <th className="py-3 px-4">N° Bon Retour</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Grossiste-Répartiteur</th>
                <th className="py-3 px-4">Motif</th>
                <th className="py-3 px-4 text-right">Valeur Estimée</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Avoir Grossiste</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {retours && retours.length > 0 ? (
                retours.map((ret) => {
                  const estAvoirRecu = ret.statut === 'avoir_recu'

                  return (
                    <tr key={ret.id} className="hover:bg-background/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-primary">
                        {ret.numero_bon_retour}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-foreground">
                        {new Date(ret.date_retour).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-bold text-foreground">
                        {ret.fournisseurs_labo?.nom || 'Grossiste'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-foreground-muted capitalize">
                        {ret.motif.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs font-semibold text-foreground">
                        {formatCFA(ret.valeur_estimee_ht || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                            estAvoirRecu
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          }`}
                        >
                          {estAvoirRecu ? 'Avoir Reçu' : 'En Attente'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs">
                        {estAvoirRecu ? (
                          <div>
                            <span className="font-bold text-emerald-600">
                              {formatCFA(ret.montant_avoir_ttc || ret.montant_avoir_ht || 0)}
                            </span>
                            <span className="block text-[10px] text-foreground-muted">
                              Réf: {ret.numero_avoir_grossiste}
                            </span>
                          </div>
                        ) : (
                          <span className="text-foreground-muted">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {!estAvoirRecu ? (
                          <EnregistrerAvoirModal retour={ret} />
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-semibold flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Lettré
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-foreground-muted text-xs">
                    <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Aucun retour grossiste enregistré pour le moment.
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
