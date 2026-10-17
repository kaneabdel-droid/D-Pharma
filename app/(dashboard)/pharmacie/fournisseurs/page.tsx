import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import { Truck, DollarSign, Search, FileText } from 'lucide-react'
import FournisseurModal from './FournisseurModal'
import ReglementFournisseurModal from './ReglementFournisseurModal'
import ReleveFournisseurModal from './ReleveFournisseurModal'

import { getLocale, getDictionary } from '@/dictionaries'

export const metadata = {
  title: 'Grossistes & Dettes Fournisseurs | D-PHARMA',
}

export default async function FournisseursPage(props: {
  searchParams: Promise<{ q?: string }>
}) {
  const searchParams = await props.searchParams
  const query = (searchParams.q || '').toLowerCase().trim()

  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const t = dict.fournisseurs || {}
  const tbl = t.table || {}

  const supabase = await createClient()
  const tenant = await getTenantContext()

  const { data: fournisseursData, error } = await supabase
    .from('fournisseurs_labo')
    .select('*')
    .eq('gie_id', tenant?.gieId)
    .order('nom', { ascending: true })

  const fournisseurs = (fournisseursData || []).filter(f => {
    if (!query) return true
    return (
      f.nom.toLowerCase().includes(query) ||
      (f.code_fournisseur && f.code_fournisseur.toLowerCase().includes(query)) ||
      (f.contact_telephone && f.contact_telephone.includes(query))
    )
  })

  const totalDettes = (fournisseursData || []).reduce((sum, f) => sum + Number(f.solde_dette || 0), 0)

  const formatCFA = (val: number) =>
    new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : locale === 'en' ? 'en-US' : 'fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(val) + ' FCFA'

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold font-heading text-foreground">
            {t.title || 'Grossistes Répartiteurs & Dettes Fournisseurs'}
          </h2>
          <p className="text-xs text-foreground-muted">
            {t.subtitle || 'Gestion des centrales d\'achat, grossistes (Laborex, Copharm, Ubipharm...) et suivi des règlements.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <ReglementFournisseurModal fournisseurs={fournisseursData || []} />
          <FournisseurModal />
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <span className="text-xs text-foreground-muted font-medium">{t.total_dettes || 'Total Dettes Grossistes (À payer)'}</span>
          <p className="text-2xl font-bold text-danger mt-1">{formatCFA(totalDettes)}</p>
          <span className="text-[11px] text-foreground-muted">Factures et commandes en attente</span>
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <span className="text-xs text-foreground-muted font-medium">{t.active_suppliers || 'Nombre de Grossistes Partenaires'}</span>
          <p className="text-2xl font-bold text-foreground mt-1">{(fournisseursData || []).length}</p>
          <span className="text-[11px] text-foreground-muted">Comptes fournisseurs actifs</span>
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <span className="text-xs text-foreground-muted font-medium">Compte SYSCOHADA Associé</span>
          <p className="text-2xl font-bold text-primary mt-1">401</p>
          <span className="text-[11px] text-foreground-muted">Fournisseurs d&apos;exploitation</span>
        </div>
      </div>

      {/* Tableau des fournisseurs */}
      <div className="bg-surface border border-surface-border rounded-2xl shadow-sm overflow-hidden">
        {fournisseurs.length === 0 ? (
          <div className="p-12 text-center text-foreground-muted">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
            <p className="text-base font-semibold text-foreground">{tbl.empty || 'Aucun grossiste ou laboratoire trouvé'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-border/40 text-foreground-muted text-[11px] uppercase tracking-wider border-b border-surface-border">
                <tr>
                  <th className="py-3 px-4">{tbl.nom || 'Fournisseur / Grossiste'}</th>
                  <th className="py-3 px-4">Code Réf.</th>
                  <th className="py-3 px-4">{tbl.contact || 'Téléphone'}</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">Adresse</th>
                  <th className="py-3 px-4 text-right">{tbl.solde_dette || 'Dette Due'}</th>
                  <th className="py-3 px-4 text-center">{tbl.actions || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50">
                {fournisseurs.map((f) => {
                  const dette = Number(f.solde_dette || 0)
                  return (
                    <tr key={f.id} className="hover:bg-surface-border/20 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        {f.nom}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-foreground-muted">
                        {f.code_fournisseur || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-foreground">
                        {f.contact_telephone || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-foreground-muted">
                        {f.contact_email || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-foreground-muted">
                        {f.adresse || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={`font-mono font-bold text-sm ${dette > 0 ? 'text-danger' : 'text-emerald-600'}`}>
                          {formatCFA(dette)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <ReleveFournisseurModal fournisseur={f} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
