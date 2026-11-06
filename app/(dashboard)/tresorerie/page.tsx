import Link from 'next/link'
import { getComptes } from './actions'
import { Landmark, Plus, Wallet, ArrowRight, Store, Smartphone, ArrowLeftRight } from 'lucide-react'
import AddCompteModal from './AddCompteModal'
import TransfertCaisseModal from './TransfertCaisseModal'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'
import { uniteMontant } from '@/lib/currency'

export default async function TresoreriePage() {
  const unite = uniteMontant((await getTenantContext())?.devise)
  const { comptes = [], error } = await getComptes()
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  // Séparation des comptes par catégorie
  const caisses = (comptes || []).filter(c => c.type_compte === 'caisse' || c.type === 'caisse')
  const banquesEtMM = (comptes || []).filter(c => c.type_compte !== 'caisse' && c.type !== 'caisse')

  const totalGlobal = comptes?.reduce((acc, c) => acc + (c.solde_courant || 0), 0) || 0
  const totalCaisses = caisses.reduce((acc, c) => acc + (c.solde_courant || 0), 0)
  const totalBanquesMM = banquesEtMM.reduce((acc, c) => acc + (c.solde_courant || 0), 0)

  return (
    <div className="space-y-8">
      {/* En-tête avec actions */}
      <div className="sm:flex sm:items-center sm:justify-between sm:gap-4 flex-wrap gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-bold font-heading text-foreground">
            {dict.tresorerie?.balances?.title || 'Trésorerie & Multi-Caisses'}
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Gestion consolidée des soldes, postes de caisse de vente, comptes bancaires et mobile money.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-2 flex-wrap">
          <TransfertCaisseModal comptes={comptes || []} />
          <AddCompteModal
            dict={dict}
            defaultType="caisse"
            buttonLabel="Nouveau Poste / Caisse"
          />
        </div>
      </div>

      {/* Cartes KPI Globales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/tresorerie/journaux?compteId=tous"
          className="group overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-hover p-5 text-white shadow-md flex items-center justify-between gap-4 hover:shadow-lg transition-all"
          title="Consulter le journal consolidé de tous les comptes"
        >
          <div>
            <dt className="text-xs font-semibold text-white/80 uppercase tracking-wider">Trésorerie Totale Consolidée</dt>
            <dd className="mt-1.5 text-2xl sm:text-3xl font-black tracking-tight font-mono">
              {totalGlobal.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}
              <span className="text-sm font-normal text-white/80 ml-1 font-sans">{unite.trim()}</span>
            </dd>
            <div className="text-[11px] text-white/80 mt-1 font-medium group-hover:underline">
              Tous les journaux réunis →
            </div>
          </div>
          <ArrowRight className="h-6 w-6 text-white/70 group-hover:translate-x-1 transition-transform shrink-0" />
        </Link>

        <div className="rounded-2xl bg-surface border border-surface-border p-5 shadow-xs flex items-center justify-between">
          <div>
            <dt className="text-xs font-semibold text-foreground-muted uppercase tracking-wider flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-emerald-600" />
              <span>Total en Espèces (Caisses)</span>
            </dt>
            <dd className="mt-1.5 text-2xl font-bold tracking-tight text-foreground font-mono">
              {totalCaisses.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}
              <span className="text-sm font-normal text-foreground-muted ml-1 font-sans">{unite.trim()}</span>
            </dd>
            <div className="text-[11px] text-foreground-muted mt-1">
              Réparti sur {caisses.length} poste(s) de vente
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <Wallet className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl bg-surface border border-surface-border p-5 shadow-xs flex items-center justify-between">
          <div>
            <dt className="text-xs font-semibold text-foreground-muted uppercase tracking-wider flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-primary" />
              <span>Banques & Mobile Money</span>
            </dt>
            <dd className="mt-1.5 text-2xl font-bold tracking-tight text-foreground font-mono">
              {totalBanquesMM.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}
              <span className="text-sm font-normal text-foreground-muted ml-1 font-sans">{unite.trim()}</span>
            </dd>
            <div className="text-[11px] text-foreground-muted mt-1">
              {banquesEtMM.length} compte(s) bancaires / digitaux
            </div>
          </div>
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Landmark className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* SECTION 1 : POSTES DE CAISSE ET COMPTOIRS DE VENTE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold font-heading text-foreground">
              Caisses & Postes de Vente Officinaux ({caisses.length})
            </h3>
          </div>
          <span className="text-xs text-foreground-muted">
            Chaque poste physique au comptoir dispose de sa propre caisse isolée
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {caisses.map((caisse, idx) => (
            <div
              key={caisse.id}
              className="bg-surface rounded-2xl p-5 border border-surface-border shadow-xs hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground font-heading">{caisse.nom}</h4>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full mt-0.5">
                        ● En service au POS
                      </span>
                    </div>
                  </div>
                </div>

                <div className="my-3">
                  <div className="text-[10px] uppercase font-bold text-foreground-muted tracking-wider">
                    Solde Espèces Disponible
                  </div>
                  <div className="text-2xl font-black font-mono text-foreground mt-0.5">
                    {(caisse.solde_courant || 0).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}
                    <span className="text-xs font-bold text-foreground-muted ml-1 font-sans">{unite.trim()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-surface-border flex items-center justify-between gap-2 text-xs">
                <Link
                  href={`/tresorerie/journaux?compteId=${caisse.id}`}
                  className="font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <span>Journal de caisse</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <TransfertCaisseModal comptes={comptes} defaultSourceId={caisse.id} />
              </div>
            </div>
          ))}

          {caisses.length === 0 && (
            <div className="col-span-full text-center py-8 text-foreground-muted bg-surface rounded-2xl border border-surface-border">
              Aucune caisse enregistrée. Cliquez sur &quot;Nouveau Poste / Caisse&quot; pour en ajouter.
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2 : COMPTES BANCAIRES & MOBILE MONEY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold font-heading text-foreground">
              Comptes Bancaires & Portefeuilles Numériques ({banquesEtMM.length})
            </h3>
          </div>
          <span className="text-xs text-foreground-muted">
            Encaissements Wave, Orange Money et comptes bancaires d&apos;officine
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banquesEtMM.map((compte) => {
            const isMM = compte.type === 'mobile_money' || compte.type_compte === 'mobile_money'
            const Icon = isMM ? Smartphone : Landmark

            return (
              <Link
                key={compte.id}
                href={`/tresorerie/journaux?compteId=${compte.id}`}
                className="group bg-surface rounded-2xl p-5 border border-surface-border shadow-xs hover:border-primary hover:shadow-md transition-all flex items-center justify-between gap-4 cursor-pointer"
                title="Consulter le journal de ce compte"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`p-3 rounded-xl transition-colors ${isMM
                      ? 'bg-amber-500/10 text-amber-600 group-hover:bg-amber-500/20'
                      : 'bg-primary/10 text-primary group-hover:bg-primary/20'
                    }`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <dt className="truncate text-xs font-bold text-foreground-muted group-hover:text-foreground transition-colors uppercase tracking-wider">
                      {compte.nom}
                    </dt>
                    <dd className="mt-1 text-xl font-bold tracking-tight text-foreground truncate font-mono">
                      {(compte.solde_courant || 0).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}
                      <span className="text-xs font-normal text-foreground-muted font-sans ml-1">{unite.trim()}</span>
                    </dd>
                    <div className="text-[11px] text-foreground-muted mt-0.5 group-hover:text-primary transition-colors flex items-center gap-1">
                      <span>Consulter le journal</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-foreground-muted/60 group-hover:text-primary group-hover:translate-x-1 transition-all">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </Link>
            )
          })}

          {banquesEtMM.length === 0 && (
            <div className="col-span-full text-center py-8 text-foreground-muted bg-surface rounded-2xl border border-surface-border">
              Aucun compte bancaire ou mobile money configuré.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
