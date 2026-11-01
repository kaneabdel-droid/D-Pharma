import Link from 'next/link'
import { BookOpen, FileText, Scale, BarChart3, Receipt, Lock, Sparkles, ArrowRight, CheckCircle2, Shield } from 'lucide-react'
import { getLocale, getDictionary } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'

export default async function ComptabiliteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [locale, tenant] = await Promise.all([
    getLocale(),
    getTenantContext(),
  ])

  const dict = await getDictionary(locale)
  const t = dict.comptabilite || {}
  const tabs = t.tabs || {}

  const currentTier = tenant?.subscriptionTier || 'standard'
  const isPremium = currentTier === 'premium'

  // Si l'officine n'est pas au niveau Premium, accès verrouillé avec paywall d'upgrade
  if (!isPremium) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-4">
        {/* En-tête */}
        <div className="border-b border-surface-border pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold font-heading text-foreground">
                  {t.title || 'Comptabilité SYSCOHADA & Déclaration TVA'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-bold uppercase tracking-wider">
                  Niveau Premium
                </span>
              </div>
              <p className="text-sm text-foreground-muted mt-1">
                Livre-journal en partie double, balance générale, compte de résultat et liasse TVA (DGID).
              </p>
            </div>
          </div>
        </div>

        {/* Écran d'upgrade Premium */}
        <div className="rounded-3xl border-2 border-primary/40 bg-surface p-8 sm:p-10 shadow-xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-8 -translate-y-1/2 bg-primary text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Réservé au Niveau Premium
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground font-heading">
              Débloquez la Comptabilité Officinale & la Fiscalité TVA
            </h2>
            <p className="text-sm text-foreground-muted leading-relaxed">
              Votre pharmacie est actuellement sur le forfait <strong>Standard (100 000 FCFA / an)</strong>. 
              Pour accéder aux écritures comptables SYSCOHADA sans superposition, au Grand Livre, à la Balance des comptes et à la déclaration de TVA conforme DGID, passez au forfait <strong>Premium (120 000 FCFA / an)</strong>.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-primary/5 border border-primary/20">
            <div>
              <span className="text-xs font-semibold text-foreground-muted block mb-1">
                Votre forfait actuel :
              </span>
              <p className="text-base font-bold text-foreground">
                Niveau Standard • 100 000 FCFA / an
              </p>
              <p className="text-xs text-foreground-muted mt-0.5">
                Ventes POS, stock, caisse & commandes
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-primary block mb-1">
                Mise à niveau vers Premium :
              </span>
              <p className="text-xl font-black text-primary">
                120 000 FCFA / an
              </p>
              <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                Différence à régler : seulement 20 000 FCFA
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted block">
              Fonctionnalités débloquées avec le Niveau Premium :
            </span>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2.5 text-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Livre-Journal conforme SYSCOHADA (Débit / Crédit strict)</span>
              </div>
              <div className="flex items-start gap-2.5 text-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Déclaration TVA officielle prête pour la DGID Sénégal</span>
              </div>
              <div className="flex items-start gap-2.5 text-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Plan comptable pharmaceutique & Grand Livre en temps réel</span>
              </div>
              <div className="flex items-start gap-2.5 text-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Balance générale & Compte de résultat de l&apos;officine</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-surface-border flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/checkout?plan=premium&upgrade=true"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-hover transition-all shadow-md shadow-primary/20"
            >
              <span>Passer au Niveau Premium (120 000 FCFA / an)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/abonnement"
              className="w-full sm:w-auto inline-flex items-center justify-center py-3 px-5 rounded-xl border border-surface-border text-foreground-muted hover:text-foreground text-xs font-semibold transition-colors"
            >
              Gérer mon abonnement
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-surface-border pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold font-heading text-foreground">
                  {t.title || 'Comptabilité Officinale'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
                  Premium Actif
                </span>
              </div>
              <p className="text-sm text-foreground-muted">
                {t.subtitle || 'Plan comptable SYSCOHADA pharmaceutique, écritures en partie double, balance générale et compte de résultat.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex flex-wrap gap-2 border-b border-surface-border pb-4" aria-label="Tabs Comptabilité">
        <Link
          href="/comptabilite"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 border border-surface-border transition-colors hover:border-primary/40"
        >
          <FileText className="w-4 h-4 text-primary" />
          <span>{tabs.journal || 'Journal des Écritures'}</span>
        </Link>
        <Link
          href="/comptabilite/plan-comptable"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 border border-surface-border transition-colors hover:border-primary/40"
        >
          <BookOpen className="w-4 h-4 text-secondary" />
          <span>{tabs.plan || 'Plan Comptable SYSCOHADA'}</span>
        </Link>
        <Link
          href="/comptabilite/balance"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 border border-surface-border transition-colors hover:border-primary/40"
        >
          <Scale className="w-4 h-4 text-emerald-500" />
          <span>{tabs.balance || 'Grand Livre & Balance'}</span>
        </Link>
        <Link
          href="/comptabilite/resultat"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 border border-surface-border transition-colors hover:border-primary/40"
        >
          <BarChart3 className="w-4 h-4 text-amber-500" />
          <span>{tabs.resultat || 'Compte de Résultat Officinal'}</span>
        </Link>
        <Link
          href="/comptabilite/tva"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 border border-surface-border transition-colors hover:border-primary/40"
        >
          <Receipt className="w-4 h-4 text-primary" />
          <span>{tabs.tva || 'Déclaration de TVA (DGID)'}</span>
        </Link>
      </nav>

      {children}
    </div>
  )
}
