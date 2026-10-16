import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import LanguageSelector from '@/components/LanguageSelector'
import { getDictionary, getLocale } from '@/dictionaries'

export const metadata = {
  title: 'Tarifs — D-PHARMA',
}

export default async function TarifsDpharmaPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const lp = dict.landing_pharma || {}
  const ps = lp.pricing_section || {}

  return (
    <div className="bg-background min-h-screen font-sans text-foreground">
      <main>
        <section className="py-16 lg:py-20 bg-gradient-to-br from-surface to-background relative">
          <div className="absolute top-4 right-4">
            <LanguageSelector currentLang={locale} />
          </div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
            <Link href="/" className="text-sm font-medium text-foreground-muted hover:text-primary flex items-center justify-center gap-2 mb-6">
              <ArrowLeft className="w-4 h-4" /> {locale === 'ar' ? 'العودة للرئيسية' : locale === 'en' ? 'Back to home' : "Retour à l'accueil"}
            </Link>
            <h1 className="text-4xl md:text-6xl font-bold font-heading tracking-tight mb-6">
              {ps.title || 'Tarifs D-PHARMA'}
            </h1>
            <p className="text-lg md:text-xl text-foreground-muted leading-relaxed">
              {ps.desc || 'Un forfait annuel selon votre statut'}
            </p>
          </div>
        </section>

        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Pharmacie */}
              <div className="rounded-3xl border-2 border-primary p-8 bg-primary/5 flex flex-col relative shadow-2xl">
                <div className="absolute top-0 right-6 -translate-y-1/2 bg-primary text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  {ps.pharma_badge || 'Officines & Pharmacies'}
                </div>
                <h3 className="text-2xl font-bold mb-2 text-primary">
                  {ps.pharma_title || 'Pharmacie'}
                </h3>
                <div className="mb-8">
                  <span className="text-4xl font-extrabold text-primary">{ps.pharma_price || '75.000'}</span>
                  <span className="text-foreground-muted font-medium"> {ps.pharma_unit || 'FCFA / an'}</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> <span>{ps.pharma_f1 || 'Point de Vente (POS) & scan code-barres ultra rapide'}</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> <span>{ps.pharma_f2 || 'Gestion des stocks & alertes de péremption par lots'}</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> <span>{ps.pharma_f3 || 'Suivi de la caisse quotidienne, reçus & trésorerie'}</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> <span>{ps.pharma_f4 || 'Commandes directes vers les laboratoires & grossistes'}</span></li>
                </ul>
                <Link href="/checkout?plan=pharmacie" className="w-full rounded-xl bg-primary text-white px-4 py-3 font-bold text-center hover:bg-primary-hover transition-colors shadow-lg shadow-primary/25">
                  {ps.pharma_btn || 'Souscrire Pharmacie'}
                </Link>
              </div>

              {/* Fournisseur / Laboratoire */}
              <div className="rounded-3xl border border-surface-border p-8 bg-surface flex flex-col hover:shadow-xl transition-shadow">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground-muted mb-2">
                  {ps.supplier_badge || 'Laboratoires & Grossistes'}
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  {ps.supplier_title || 'Fournisseur / Labo'}
                </h3>
                <div className="mb-8">
                  <span className="text-4xl font-extrabold">{ps.supplier_price || '50.000'}</span>
                  <span className="text-foreground-muted font-medium"> {ps.supplier_unit || 'FCFA / an'}</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> <span>{ps.supplier_f1 || 'Publication du catalogue de médicaments & molécules'}</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> <span>{ps.supplier_f2 || 'Réception & traitement des bons de commande officines'}</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> <span>{ps.supplier_f3 || 'Suivi des expéditions & accusés de réception'}</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> <span>{ps.supplier_f4 || 'Support technique & accompagnement à l’intégration'}</span></li>
                </ul>
                <Link href="/checkout?plan=fournisseur" className="w-full rounded-xl bg-background border-2 border-primary text-primary px-4 py-3 font-bold text-center hover:bg-primary hover:text-white transition-colors">
                  {ps.supplier_btn || 'Souscrire Fournisseur / Labo'}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-foreground text-background py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-2xl font-bold font-heading text-background mb-4 block">D-PHARMA</span>
          <p className="text-background/50 text-sm">© {new Date().getFullYear()} {lp.footer?.rights || 'Demba Solution. Tous droits réservés.'}</p>
        </div>
      </footer>
    </div>
  )
}
