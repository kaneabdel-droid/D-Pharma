'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Receipt,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Building2,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Loader2
} from 'lucide-react'
import { validerDeclarationTVA } from './actions'

interface CalculTVA {
  periodeMois: number
  periodeAnnee: number
  dateDebut: string
  dateFin: string
  caMedicamentsExonere: number
  caTaxableTTC: number
  caTaxableHT: number
  tvaCollecteeBrute: number
  achatsMedicamentsExonere: number
  achatsTaxablesHT: number
  tvaDeductibleAchats: number
  tvaRegularisablePVPérimes: number
  totalTVADeductible: number
  creditTVAPeriodePrecedente: number
  totalDeductionsCumulees: number
  tvaNetteDue: number
  creditTVAAreporter: number
  existante: any | null
}

const MOIS_LOCALES: Record<string, string[]> = {
  fr: [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],
  ar: [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ]
}

export default function DeclarationTVAClient({
  calculInitial,
  pharmaNom,
  historique,
  dict = {},
  locale = 'fr',
}: {
  calculInitial: CalculTVA
  pharmaNom: string
  historique: any[]
  dict?: any
  locale?: string
}) {
  const router = useRouter()
  const [calcul, setCalcul] = useState<CalculTVA>(calculInitial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const tDict = dict.comptabilite?.tva || {}
  const nomsMois = MOIS_LOCALES[locale] || MOIS_LOCALES.fr

  const formatCFA = (val: number) =>
    new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(val) + ' FCFA'

  const changerPeriode = (mois: number, annee: number) => {
    router.push(`/comptabilite/tva?mois=${mois}&annee=${annee}`)
  }

  const handleValider = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    formData.set('periode_mois', String(calcul.periodeMois))
    formData.set('periode_annee', String(calcul.periodeAnnee))
    formData.set('ca_medicaments_exonere', String(calcul.caMedicamentsExonere))
    formData.set('ca_taxable_ht', String(calcul.caTaxableHT))
    formData.set('tva_collectee_brute', String(calcul.tvaCollecteeBrute))
    formData.set('achats_medicaments_exonere', String(calcul.achatsMedicamentsExonere))
    formData.set('achats_taxables_ht', String(calcul.achatsTaxablesHT))
    formData.set('tva_deductible_achats', String(calcul.tvaDeductibleAchats))
    formData.set('tva_regularisable_pv_perimes', String(calcul.tvaRegularisablePVPérimes))
    formData.set('total_tva_deductible', String(calcul.totalTVADeductible))
    formData.set('credit_tva_periode_precedente', String(calcul.creditTVAPeriodePrecedente))
    formData.set('tva_nette_due', String(calcul.tvaNetteDue))
    formData.set('credit_tva_a_reporter', String(calcul.creditTVAAreporter))

    const res = await validerDeclarationTVA(formData)
    setLoading(false)

    if (res.error) {
      setError(res.error)
    } else {
      setSuccess(true)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {/* Sélecteur de période */}
      <div className="bg-surface rounded-2xl p-4 border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <div>
            <span className="text-xs text-foreground-muted font-bold uppercase">
              {tDict.period_label || "Période d'imposition"}
            </span>
            <p className="text-base font-bold text-foreground">
              {nomsMois[calcul.periodeMois - 1]} {calcul.periodeAnnee}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={calcul.periodeMois}
            onChange={(e) => changerPeriode(Number(e.target.value), calcul.periodeAnnee)}
            className="px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {nomsMois.map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={calcul.periodeAnnee}
            onChange={(e) => changerPeriode(calcul.periodeMois, Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 rounded-xl border border-surface-border bg-surface hover:bg-background text-foreground text-xs font-bold flex items-center gap-1.5 transition-colors print:hidden cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{tDict.print || 'Imprimer Déclaration'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Déclaration validée avec succès et écriture de liquidation comptabilisée !</span>
        </div>
      )}

      {/* BORDEREAU FISCAL DE DÉCLARATION */}
      <div id="declaration-tva-print" className="bg-surface rounded-3xl border border-surface-border p-6 sm:p-8 space-y-6 shadow-sm print:p-0 print:border-none">
        {/* En-tête fiscal */}
        <div className="border-b border-surface-border pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              RÉPUBLIQUE DU SÉNÉGAL • DIRECTION GÉNÉRALE DES IMPÔTS ET DES DOMAINES (DGID)
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-foreground mt-0.5">
              Déclaration Périodique de TVA — Secteur Officinal
            </h2>
            <p className="text-xs text-foreground-muted">
              Régime réel normal • Spécificités pharmaceutiques (Médicaments exonérés & Cosmétiques taxables 18%)
            </p>
          </div>

          <div className="text-right">
            <span className="text-sm font-bold text-foreground">{pharmaNom}</span>
            <span className="block text-xs text-foreground-muted font-mono">
              Mois : {String(calcul.periodeMois).padStart(2, '0')} / {calcul.periodeAnnee}
            </span>
          </div>
        </div>

        {/* CADRE A : CHIFFRE D'AFFAIRES & TVA COLLECTÉE */}
        <div className="border border-surface-border rounded-2xl overflow-hidden">
          <div className="p-3.5 bg-background border-b border-surface-border flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
              Cadre A : Chiffre d'Affaires Réalisé & TVA Collectée (18%)
            </h3>
            <span className="text-xs font-mono font-bold text-primary">Compte 4431</span>
          </div>

          <div className="p-4 space-y-3 text-xs divide-y divide-surface-border/50">
            <div className="flex justify-between items-center pt-2">
              <div>
                <span className="font-medium text-foreground">1. Ventes de Médicaments (Spécialités enregistrées DPM)</span>
                <span className="block text-[11px] text-emerald-600 font-semibold">Exonération totale de TVA (Taux 0%)</span>
              </div>
              <span className="font-mono font-bold text-foreground text-sm">
                {formatCFA(calcul.caMedicamentsExonere)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <div>
                <span className="font-medium text-foreground">2. Ventes de Cosmétiques, Parapharmacie & Matériel (TTC)</span>
                <span className="block text-[11px] text-foreground-muted">Soumis au taux de TVA standard de 18%</span>
              </div>
              <span className="font-mono font-bold text-foreground text-sm">
                {formatCFA(calcul.caTaxableTTC)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-foreground-muted">Base Imposable Hors Taxe (HT 18%) :</span>
              <span className="font-mono font-bold text-foreground">
                {formatCFA(calcul.caTaxableHT)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-3 bg-primary/5 p-3 rounded-xl font-bold">
              <span className="text-primary text-xs uppercase tracking-wider">
                TOTAL TVA COLLECTÉE BRUTE (A) :
              </span>
              <span className="font-mono text-base text-primary">
                {formatCFA(calcul.tvaCollecteeBrute)}
              </span>
            </div>
          </div>
        </div>

        {/* CADRE B : ACHATS & DÉDUCTIONS AUTORISÉES */}
        <div className="border border-surface-border rounded-2xl overflow-hidden">
          <div className="p-3.5 bg-background border-b border-surface-border flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
              Cadre B : Achats & TVA Déductible Autorisée
            </h3>
            <span className="text-xs font-mono font-bold text-emerald-600">Compte 4452</span>
          </div>

          <div className="p-4 space-y-3 text-xs divide-y divide-surface-border/50">
            <div className="flex justify-between items-center pt-2">
              <div>
                <span className="font-medium text-foreground">1. Achats de Médicaments chez les Grossistes (Laborex, COPHASE...)</span>
                <span className="block text-[11px] text-foreground-muted">Facturés hors TVA (Exonération à l'importation)</span>
              </div>
              <span className="font-mono font-bold text-foreground text-sm">
                {formatCFA(calcul.achatsMedicamentsExonere)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <div>
                <span className="font-medium text-foreground">2. TVA Déductible sur Achats de Cosmétiques & Parapharmacie</span>
                <span className="block text-[11px] text-foreground-muted">TVA 18% supportée sur factures fournisseurs conformes</span>
              </div>
              <span className="font-mono font-bold text-foreground text-sm">
                {formatCFA(calcul.tvaDeductibleAchats)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 bg-emerald-500/5 p-2 rounded-xl">
              <div>
                <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  3. Régularisation TVA sur Produits Périmés (PV Huissier / Hygiène)
                </span>
                <span className="block text-[11px] text-emerald-600">
                  Maintien du droit à déduction autorisé sur destructions officielles visées
                </span>
              </div>
              <span className="font-mono font-black text-emerald-600 text-sm">
                +{formatCFA(calcul.tvaRegularisablePVPérimes)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-foreground-muted">Report du Crédit de TVA de la période antérieure :</span>
              <span className="font-mono font-bold text-foreground">
                {formatCFA(calcul.creditTVAPeriodePrecedente)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-3 bg-emerald-500/10 p-3 rounded-xl font-bold">
              <span className="text-emerald-700 dark:text-emerald-300 text-xs uppercase tracking-wider">
                TOTAL DÉDUCTIONS AUTORISÉES (B) :
              </span>
              <span className="font-mono text-base text-emerald-600">
                {formatCFA(calcul.totalDeductionsCumulees)}
              </span>
            </div>
          </div>
        </div>

        {/* CADRE C : LIQUIDATION DE LA TAXE */}
        <div className="border-2 border-surface-border rounded-2xl p-5 bg-background/50 space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
            Cadre C : Liquidation de la Taxe & Solde Net (A - B)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border ${
              calcul.tvaNetteDue > 0
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                : 'bg-surface border-surface-border text-foreground-muted opacity-60'
            }`}>
              <span className="text-[11px] font-bold uppercase tracking-wider block">
                TVA Nette Due au Trésor Public (à Décaisser)
              </span>
              <p className="text-2xl font-black font-mono mt-1">
                {formatCFA(calcul.tvaNetteDue)}
              </p>
              <span className="text-[10px]">
                À télédéclarer et acquitter avant le 15 du mois suivant
              </span>
            </div>

            <div className={`p-4 rounded-xl border ${
              calcul.creditTVAAreporter > 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-surface border-surface-border text-foreground-muted opacity-60'
            }`}>
              <span className="text-[11px] font-bold uppercase tracking-wider block">
                Crédit de TVA Déductible à Reporter
              </span>
              <p className="text-2xl font-black font-mono mt-1">
                {formatCFA(calcul.creditTVAAreporter)}
              </p>
              <span className="text-[10px]">
                Reportable automatiquement sur la déclaration du mois suivant
              </span>
            </div>
          </div>
        </div>

        {/* Formulaire de validation / télédéclaration */}
        <form onSubmit={handleValider} className="pt-4 border-t border-surface-border space-y-4 print:hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-80">
              <label className="block text-[11px] font-bold text-foreground-muted uppercase mb-1">
                Réf. Télédéclaration DGID / Quittance (optionnel)
              </label>
              <input
                type="text"
                name="reference_teledeclaration"
                defaultValue={calcul.existante?.reference_teledeclaration || ''}
                placeholder="Ex: QUITT-2026-90412"
                className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex gap-2 self-end sm:self-auto">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Valider & Générer l'Écriture Comptable</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Historique des déclarations passées */}
      {historique && historique.length > 0 && (
        <div className="bg-surface rounded-2xl border border-surface-border p-5 space-y-4 print:hidden">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            Historique des Déclarations de TVA Enregistrées
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-background text-foreground-muted uppercase font-bold border-b border-surface-border">
                <tr>
                  <th className="py-2.5 px-3">Période</th>
                  <th className="py-2.5 px-3 text-right">CA Exonéré</th>
                  <th className="py-2.5 px-3 text-right">CA Taxable</th>
                  <th className="py-2.5 px-3 text-right">TVA Collectée</th>
                  <th className="py-2.5 px-3 text-right">TVA Déductible</th>
                  <th className="py-2.5 px-3 text-right">TVA Nette Due</th>
                  <th className="py-2.5 px-3 text-right">Crédit TVA</th>
                  <th className="py-2.5 px-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {historique.map((h) => (
                  <tr key={h.id} className="hover:bg-background/40">
                    <td className="py-2.5 px-3 font-bold text-foreground">
                      {nomsMois[h.periode_mois - 1]} {h.periode_annee}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-foreground-muted">
                      {formatCFA(h.ca_medicaments_exonere || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-foreground-muted">
                      {formatCFA(h.ca_taxable_ht || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">
                      {formatCFA(h.tva_collectee_brute || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                      {formatCFA(h.total_tva_deductible || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-danger">
                      {h.tva_nette_due > 0 ? formatCFA(h.tva_nette_due) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                      {h.credit_tva_a_reporter > 0 ? formatCFA(h.credit_tva_a_reporter) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                        Validée
                      </span>
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
