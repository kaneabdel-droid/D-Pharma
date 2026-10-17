import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import { Users, Building, ShieldCheck, DollarSign, Search, FileText, AlertCircle } from 'lucide-react'
import ClientModal from './ClientModal'
import ReglementClientModal from './ReglementClientModal'
import ReleveClientModal from './ReleveClientModal'
import Link from 'next/link'

export const metadata = {
  title: 'Clients & Créances Tiers Payant | D-PHARMA',
}

export default async function ClientsPage(props: {
  searchParams: Promise<{ type?: string; q?: string }>
}) {
  const searchParams = await props.searchParams
  const selectedType = searchParams.type || 'tous'
  const query = (searchParams.q || '').toLowerCase().trim()

  const supabase = await createClient()
  const tenant = await getTenantContext()

  let dbQuery = supabase
    .from('clients_externes')
    .select('*')
    .eq('gie_id', tenant?.gieId)
    .order('nom', { ascending: true })

  if (selectedType !== 'tous') {
    dbQuery = dbQuery.eq('type_client', selectedType)
  }

  const { data: clientsData, error } = await dbQuery
  const clients = (clientsData || []).filter(c => {
    if (!query) return true
    return (
      c.nom.toLowerCase().includes(query) ||
      (c.telephone && c.telephone.includes(query)) ||
      (c.matricule_assure && c.matricule_assure.toLowerCase().includes(query))
    )
  })

  const totalCreances = (clientsData || []).reduce((sum, c) => sum + Number(c.solde_creance || 0), 0)
  const countMutuelles = (clientsData || []).filter(c => c.type_client === 'mutuelle' || c.type_client === 'assurance').length

  const formatCFA = (val: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(val) + ' FCFA'

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold font-heading text-foreground">
            Clients, Créances & Tiers Payant
          </h2>
          <p className="text-xs text-foreground-muted">
            Gestion des particuliers, entreprises conventionnées, mutuelles IPM et assurances de santé.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <ReglementClientModal clients={clientsData || []} />
          <ClientModal />
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <span className="text-xs text-foreground-muted font-medium">Total Créances Clients (En cours)</span>
          <p className="text-2xl font-bold text-danger mt-1">{formatCFA(totalCreances)}</p>
          <span className="text-[11px] text-foreground-muted">Montants dus par particuliers, entreprises & assurances</span>
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <span className="text-xs text-foreground-muted font-medium">Nombre Total de Clients</span>
          <p className="text-2xl font-bold text-foreground mt-1">{(clientsData || []).length}</p>
          <span className="text-[11px] text-foreground-muted">Fiches tiers enregistrées dans l&apos;officine</span>
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-surface-border shadow-sm">
          <span className="text-xs text-foreground-muted font-medium">Conventions Mutuelles & Assurances</span>
          <p className="text-2xl font-bold text-primary mt-1">{countMutuelles}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Partenariats de prise en charge tiers payant</span>
        </div>
      </div>

      {/* Filtres par catégorie */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'tous', label: `Tous (${(clientsData || []).length})` },
            { id: 'particulier', label: 'Particuliers' },
            { id: 'entreprise', label: 'Entreprises' },
            { id: 'mutuelle', label: 'Mutuelles / IPM' },
            { id: 'assurance', label: 'Assurances' },
          ].map((tab) => {
            const isActive = selectedType === tab.id
            return (
              <Link
                key={tab.id}
                href={`/pharmacie/clients?type=${tab.id}${query ? `&q=${query}` : ''}`}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface text-foreground-muted hover:text-foreground border border-surface-border'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Tableau des clients */}
      <div className="bg-surface border border-surface-border rounded-2xl shadow-sm overflow-hidden">
        {clients.length === 0 ? (
          <div className="p-12 text-center text-foreground-muted">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
            <p className="text-base font-semibold text-foreground">Aucun client ou organisme trouvé</p>
            <p className="text-xs text-foreground-muted mt-1 max-w-sm mx-auto">
              Utilisez le bouton &quot;Nouveau Client / Tiers Payant&quot; pour enregistrer votre premier compte client.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-border/40 text-foreground-muted text-[11px] uppercase tracking-wider border-b border-surface-border">
                <tr>
                  <th className="py-3 px-4">Client / Organisme</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Convention / Réf.</th>
                  <th className="py-3 px-4 text-right">Plafond Crédit</th>
                  <th className="py-3 px-4 text-right">Solde Dû (Créance)</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50">
                {clients.map((c) => {
                  const solde = Number(c.solde_creance || 0)
                  return (
                    <tr key={c.id} className="hover:bg-surface-border/20 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        {c.nom}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                          c.type_client === 'mutuelle' || c.type_client === 'assurance'
                            ? 'bg-purple-500/10 text-purple-600'
                            : c.type_client === 'entreprise'
                            ? 'bg-cyan-500/10 text-cyan-600'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {c.type_client}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-foreground-muted">
                        <div>{c.telephone || '—'}</div>
                        {c.email && <div className="text-[11px] truncate">{c.email}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-foreground-muted">
                        {c.matricule_assure || '—'}
                        {Number(c.taux_couverture) > 0 && (
                          <span className="block text-[10px] text-emerald-600 font-semibold font-sans">
                            Couverture {c.taux_couverture}%
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right text-xs font-mono text-foreground-muted">
                        {Number(c.plafond_credit) > 0 ? formatCFA(Number(c.plafond_credit)) : 'Illimité'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={`font-mono font-bold text-sm ${solde > 0 ? 'text-danger' : 'text-emerald-600'}`}>
                          {formatCFA(solde)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <ReleveClientModal client={c} />
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
