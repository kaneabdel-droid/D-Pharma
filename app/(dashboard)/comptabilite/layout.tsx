import Link from 'next/link'
import { BookOpen, FileText, Scale, BarChart3, Receipt } from 'lucide-react'
import { getLocale, getDictionary } from '@/dictionaries'

export default async function ComptabiliteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const isRtl = locale === 'ar'

  const t = dict.comptabilite || {}
  const tabs = t.tabs || {}

  return (
    <div className="space-y-6">
      <div className="border-b border-surface-border pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-heading text-foreground">
              {t.title || 'Comptabilité Officinale'}
            </h1>
            <p className="text-sm text-foreground-muted">
              {t.subtitle || 'Plan comptable SYSCOHADA pharmaceutique, écritures en partie double, balance générale et compte de résultat.'}
            </p>
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
          <span>Déclaration de TVA (DGID)</span>
        </Link>
      </nav>

      {children}
    </div>
  )
}
