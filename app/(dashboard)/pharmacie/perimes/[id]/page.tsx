import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPVDetails } from '../actions'
import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import PrintSectionButton from '@/components/PrintSectionButton'
import { ArrowLeft, Printer, ShieldCheck, FileWarning, Scale, Building2 } from 'lucide-react'

export default async function PVDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [{ pv }, tenant] = await Promise.all([
    getPVDetails(id),
    getTenantContext(),
  ])

  if (!pv) notFound()

  const supabase = await createClient()
  const { data: pharma } = await supabase
    .from('gies')
    .select('nom, adresse, telephone, email, identification')
    .eq('id', tenant?.gieId)
    .single()

  const formatCFA = (val: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(val) + ' FCFA'

  const lignes = pv.lignes_destruction_perimes || []
  const totalHT = Number(pv.valeur_achat_ht_totale) || 0
  const totalTVA = Number(pv.tva_recuperable_totale) || 0
  const totalTTC = Number(pv.valeur_ttc_totale) || 0

  const totalMedicamentsHT = lignes
    .filter((l: any) => l.type_produit === 'medicament')
    .reduce((s: number, l: any) => s + Number(l.montant_ht), 0)

  const totalCosmetiquesHT = lignes
    .filter((l: any) => l.type_produit !== 'medicament')
    .reduce((s: number, l: any) => s + Number(l.montant_ht), 0)

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Barre de retour et d'actions (masquée à l'impression) */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/pharmacie/perimes"
          className="text-xs font-semibold text-foreground-muted hover:text-foreground flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au registre des périmés</span>
        </Link>

        <div className="flex items-center gap-2">
          <PrintSectionButton sectionId="pv-officiel-print" label="Imprimer le Procès-Verbal Officiel" />
        </div>
      </div>

      {/* DOCUMENT OFFICIEL DU PROCÈS-VERBAL */}
      <div
        id="pv-officiel-print"
        className="bg-white text-zinc-900 border border-zinc-200 rounded-3xl p-8 sm:p-12 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0 print:m-0"
      >
        {/* En-tête officiel République & Ministère */}
        <div className="border-b-2 border-zinc-900 pb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
            <div>
              <p className="font-bold uppercase tracking-wider text-[11px] text-zinc-700">RÉPUBLIQUE DU SÉNÉGAL</p>
              <p className="text-[10px] text-zinc-600">Ministère de la Santé et de l'Action Sociale</p>
              <p className="text-[10px] text-zinc-600">Direction de la Pharmacie et du Médicament (DPM)</p>
              <p className="text-[10px] text-zinc-600">Ordre National des Pharmaciens</p>
            </div>

            <div className="text-right sm:text-right">
              <h2 className="text-base font-black uppercase text-zinc-900">
                {pharma?.nom || 'PHARMACIE DE GARDE'}
              </h2>
              <p className="text-xs text-zinc-600">{pharma?.adresse || 'Dakar, Sénégal'}</p>
              <p className="text-xs text-zinc-600">Tél: {pharma?.telephone || '+221 33 000 00 00'}</p>
              {pharma?.identification && (
                <p className="text-[11px] font-mono text-zinc-500">NINEA / Agrément : {pharma.identification}</p>
              )}
            </div>
          </div>

          <div className="mt-8 text-center space-y-1">
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-zinc-900 border-y-2 border-zinc-900 py-2">
              PROCÈS-VERBAL DE DESTRUCTION DE PRODUITS PÉRIMÉS & AVARIÉS
            </h1>
            <p className="text-xs font-mono font-bold text-zinc-700">
              RÉFÉRENCE OFFICIELLE : {pv.numero_pv}
            </p>
          </div>
        </div>

        {/* Constatation & Visas Légaux */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
          <div className="space-y-1.5">
            <p className="font-bold text-zinc-800 uppercase tracking-wider text-[11px]">1. Identité de l'Opération</p>
            <p><span className="text-zinc-500">Date de l'opération :</span> <strong>{new Date(pv.date_destruction).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></p>
            <p><span className="text-zinc-500">Lieu de destruction :</span> <strong>Officine & Centre de Traitement Agréé</strong></p>
            <p><span className="text-zinc-500">Motif de destruction :</span> <strong className="capitalize">{pv.motif.replace(/_/g, ' ')}</strong></p>
          </div>

          <div className="space-y-1.5">
            <p className="font-bold text-zinc-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              2. Visa de l'Autorité Publique de Contrôle
            </p>
            <p><span className="text-zinc-500">Autorité compétente :</span> <strong className="capitalize">{pv.autorite_type.replace(/_/g, ' ')}</strong></p>
            <p><span className="text-zinc-500">Officier / Inspecteur :</span> <strong>{pv.nom_officier_autorite || 'Officier assermenté'}</strong></p>
            <p><span className="text-zinc-500">N° Visa / Acte Légal :</span> <strong className="font-mono text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">{pv.numero_visa_acte || 'VISÉ PAR L\'AUTORITÉ'}</strong></p>
          </div>
        </div>

        {/* Mention Légale de Régularisation Fiscale CGI */}
        <div className="p-3 bg-zinc-100/70 border-l-4 border-zinc-800 text-[11px] text-zinc-700 leading-relaxed">
          <strong>Visa Fiscal & Régularisation TVA (Articles du Code Général des Impôts) :</strong> Conformément à la législation fiscale en vigueur régissant les commerces pharmaceutiques, les pertes et destructions de marchandises périmées régulièrement constatées par acte d'huissier ou par procès-verbal du Service Régional de l'Hygiène ouvrent droit au maintien de la déduction de TVA ou au remboursement/régularisation de la taxe grevant les articles non exonérés (parapharmacie et cosmétiques).
        </div>

        {/* Tableau exhaustif des articles détruits */}
        <div className="space-y-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-800">
            3. Inventaire Détaillé des Produits Pharmaceutiques & Cosmétiques Détruits
          </h3>

          <table className="w-full text-left text-xs border border-zinc-300">
            <thead className="bg-zinc-100 font-bold uppercase text-[10px] text-zinc-700 border-b border-zinc-300">
              <tr>
                <th className="p-2 border-r border-zinc-300">N°</th>
                <th className="p-2 border-r border-zinc-300">Désignation Spécialité / Produit</th>
                <th className="p-2 border-r border-zinc-300">N° Lot</th>
                <th className="p-2 border-r border-zinc-300">Péremption</th>
                <th className="p-2 border-r border-zinc-300">Régime Fiscal</th>
                <th className="p-2 text-right border-r border-zinc-300">Qté</th>
                <th className="p-2 text-right border-r border-zinc-300">P.A. HT</th>
                <th className="p-2 text-right border-r border-zinc-300">Total HT</th>
                <th className="p-2 text-right border-r border-zinc-300">TVA (18%)</th>
                <th className="p-2 text-right">Total TTC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {lignes.map((ligne: any, idx: number) => (
                <tr key={ligne.id || idx}>
                  <td className="p-2 border-r border-zinc-200 text-center text-zinc-500">{idx + 1}</td>
                  <td className="p-2 border-r border-zinc-200 font-bold">{ligne.designation}</td>
                  <td className="p-2 border-r border-zinc-200 font-mono text-[11px]">{ligne.lot || 'N/C'}</td>
                  <td className="p-2 border-r border-zinc-200 text-zinc-600">{ligne.date_peremption || 'Périmé'}</td>
                  <td className="p-2 border-r border-zinc-200 text-[10px] font-semibold">
                    {ligne.type_produit === 'medicament' ? (
                      <span className="text-zinc-600">Médicament (Exonéré)</span>
                    ) : (
                      <span className="text-zinc-900 font-bold">Cosmétique (18%)</span>
                    )}
                  </td>
                  <td className="p-2 text-right border-r border-zinc-200 font-bold">{ligne.quantite}</td>
                  <td className="p-2 text-right border-r border-zinc-200 font-mono text-[11px]">{formatCFA(ligne.prix_achat_ht)}</td>
                  <td className="p-2 text-right border-r border-zinc-200 font-mono font-bold">{formatCFA(ligne.montant_ht)}</td>
                  <td className="p-2 text-right border-r border-zinc-200 font-mono text-zinc-600">
                    {ligne.montant_tva > 0 ? formatCFA(ligne.montant_tva) : '—'}
                  </td>
                  <td className="p-2 text-right font-mono font-bold">{formatCFA(ligne.montant_ttc)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-zinc-100 font-bold text-xs uppercase border-t-2 border-zinc-400">
              <tr>
                <td colSpan={5} className="p-2.5 text-right">TOTAUX GÉNÉRAUX DE LA DESTRUCTION :</td>
                <td className="p-2.5 text-right font-bold">
                  {lignes.reduce((s: number, l: any) => s + Number(l.quantite), 0)}
                </td>
                <td className="p-2.5"></td>
                <td className="p-2.5 text-right font-mono font-black">{formatCFA(totalHT)}</td>
                <td className="p-2.5 text-right font-mono font-black text-emerald-800">{formatCFA(totalTVA)}</td>
                <td className="p-2.5 text-right font-mono font-black">{formatCFA(totalTTC)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Ventilation comptable & fiscale */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-zinc-300 space-y-2 bg-zinc-50">
            <h4 className="font-bold uppercase tracking-wider text-[11px] text-zinc-800">
              Ventilation par Catégorie de Produits
            </h4>
            <div className="flex justify-between">
              <span className="text-zinc-600">Pertes Médicaments essentiels (Exonérés de TVA) :</span>
              <span className="font-bold font-mono">{formatCFA(totalMedicamentsHT)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">Pertes Parapharmacie & Cosmétiques (Soumis TVA 18%) :</span>
              <span className="font-bold font-mono">{formatCFA(totalCosmetiquesHT)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-zinc-200 font-bold">
              <span>Total Perte brute HT (Compte 6581) :</span>
              <span className="font-mono">{formatCFA(totalHT)}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-zinc-300 space-y-2 bg-zinc-50">
            <h4 className="font-bold uppercase tracking-wider text-[11px] text-zinc-800">
              Conséquence Fiscale TVA (DGID)
            </h4>
            <div className="flex justify-between">
              <span className="text-zinc-600">Taux de TVA normal applicable :</span>
              <span className="font-bold font-mono">18 %</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">TVA 18% admise en déduction grâce au visa :</span>
              <span className="font-bold font-mono text-emerald-800">+{formatCFA(totalTVA)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-zinc-200 font-bold">
              <span>Statut de conformité du PV :</span>
              <span className="text-emerald-700 font-bold uppercase">Régularisé & Visé</span>
            </div>
          </div>
        </div>

        {pv.notes && (
          <div className="text-xs text-zinc-600 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
            <strong>Circonstances / Procédure :</strong> {pv.notes}
          </div>
        )}

        {/* Cadre de signatures et cachets officiels */}
        <div className="pt-8 border-t-2 border-zinc-900 grid grid-cols-2 gap-8 text-xs">
          <div className="space-y-16">
            <div>
              <p className="font-bold uppercase text-zinc-800">Pour l'Officine :</p>
              <p className="text-zinc-600">Le Pharmacien Titulaire Responsable</p>
            </div>
            <div className="border-t border-dashed border-zinc-400 pt-2 text-[11px] text-zinc-500">
              (Signature et Cachet officiel de l'Officine)
            </div>
          </div>

          <div className="space-y-16 text-right">
            <div>
              <p className="font-bold uppercase text-zinc-800">Pour l'Autorité de Contrôle :</p>
              <p className="text-zinc-600">{pv.nom_officier_autorite || 'L\'Huissier de Justice / Inspecteur d\'Hygiène'}</p>
            </div>
            <div className="border-t border-dashed border-zinc-400 pt-2 text-[11px] text-zinc-500">
              (Signature, Sceau et Visa officiel)
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
