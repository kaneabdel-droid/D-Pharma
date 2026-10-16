import Link from 'next/link'
import {
  Activity, ArrowRight, PackageOpen, Truck, Wallet,
  CheckCircle2, Search, Clock, BookOpen, Sparkles, Phone, Mail
} from 'lucide-react'
import LanguageSelector from '@/components/LanguageSelector'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ message?: string }>
}) {
  const params = await searchParams
  const message = params?.message
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const lp = dict.landing_pharma || {}

  const features = [
    {
      icon: Activity,
      title: lp.features_section?.pos_title || 'Point de Vente (POS) Rapide',
      desc: lp.features_section?.pos_desc || 'Bipez les boîtes au scanner code-barres, encaissez en quelques secondes par espèces, Wave, Orange Money ou carte avec calcul automatique du rendu de monnaie.',
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      icon: PackageOpen,
      title: lp.features_section?.stock_title || 'Stocks & Lots Rigoureux',
      desc: lp.features_section?.stock_desc || 'Suivez vos niveaux de stock en temps réel. Historique des entrées/sorties, gestion des numéros de lot et seuils d’alerte anti-rupture.',
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
    },
    {
      icon: Clock,
      title: lp.features_section?.expiry_title || 'Contrôle des Péremptions',
      desc: lp.features_section?.expiry_desc || 'Alertes visuelles immédiates pour les médicaments périmés ou proches de la date limite. Évitez les pertes et garantissez la sécurité sanitaire.',
      color: 'text-amber-600',
      bg: 'bg-amber-100',
    },
    {
      icon: Truck,
      title: lp.features_section?.orders_title || 'Commandes Labos & Répartiteurs',
      desc: lp.features_section?.orders_desc || 'Créez vos bons de commande pour vos grossistes en quelques clics. Pointez les réceptions et alimentez directement vos stocks.',
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      icon: Wallet,
      title: lp.features_section?.treasury_title || 'Caisse & Trésorerie Officinale',
      desc: lp.features_section?.treasury_desc || 'Clôture de caisse quotidienne, journal des recettes et décaissements, imputation comptable des dépenses de fonctionnement.',
      color: 'text-cyan-600',
      bg: 'bg-cyan-100',
    },
    {
      icon: Search,
      title: lp.features_section?.search_title || 'Recherche Publique Médicaments',
      desc: lp.features_section?.search_desc || 'Portail dédié aux patients pour vérifier la disponibilité d’un traitement sans affichage des prix, dans le respect strict de la déontologie.',
      color: 'text-rose-600',
      bg: 'bg-rose-100',
    },
  ]

  return (
    <div className="bg-background min-h-screen font-sans text-foreground">
      {message && (
        <div className="bg-primary text-white text-center py-2.5 px-4 font-medium text-sm">
          {message}
        </div>
      )}

      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-surface-border bg-surface/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Activity className="w-6 h-6 animate-pulse-slow" />
              </span>
              <span className="text-xl sm:text-2xl font-bold font-heading text-primary tracking-wide">
                D-PHARMA
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-foreground-muted">
              <a href="#fonctionnalites" className="hover:text-primary transition-colors">
                {lp.nav?.features || 'Fonctionnalités'}
              </a>
              <Link href="/guide" className="hover:text-primary transition-colors">
                {lp.nav?.guide || "Guide d'utilisation"}
              </Link>
              <Link href="/tarifs" className="hover:text-primary transition-colors">
                {lp.nav?.pricing || 'Tarifs'}
              </Link>
              <Link href="/recherche-medicament" className="hover:text-primary transition-colors">
                {lp.nav?.patients || 'Espace Patients'}
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <LanguageSelector currentLang={locale} />
              <Link
                href="/decouvrir-dpharma"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors"
              >
                <Sparkles className="w-4 h-4" /> {lp.nav?.demo || 'Démo en direct'}
              </Link>
              <Link
                href="/login"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover transition-colors"
              >
                {lp.nav?.login || 'Connexion'}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 sm:py-24 lg:py-32 bg-gradient-to-br from-surface to-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-semibold uppercase tracking-wider mb-6">
              <Sparkles className="w-4 h-4" /> {lp.hero?.badge || 'Solution Officine & Pharmacie'}
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold font-heading tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
              {lp.hero?.title || 'Gérez votre officine avec précision et simplicité'}
            </h1>
            <p className="mt-6 text-lg sm:text-2xl text-foreground-muted max-w-2xl mx-auto leading-relaxed">
              {lp.hero?.desc || 'Vente rapide au comptoir par lecteur de code-barres, alertes péremption automatiques, réapprovisionnement labos et suivi de caisse en temps réel.'}
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/decouvrir-dpharma"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-base font-bold text-white shadow-lg hover:bg-primary-hover transition-all transform hover:-translate-y-0.5"
              >
                {lp.hero?.demo_btn || 'Tester la démo en direct'} <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/tarifs"
                className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface px-6 py-3.5 text-base font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
              >
                {lp.hero?.pricing_btn || 'Voir nos forfaits'}
              </Link>
              <Link
                href="/recherche-medicament"
                className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-6 py-3.5 text-base font-semibold text-primary hover:bg-primary/10 transition-colors"
              >
                <Search className="w-4 h-4" /> {lp.hero?.patients_btn || 'Espace Patients'}
              </Link>
            </div>

            {/* Quick trust metrics */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto pt-8 border-t border-surface-border text-center">
              <div>
                <p className="text-3xl font-extrabold text-primary font-heading">{lp.hero?.m1_val || '< 2 sec'}</p>
                <p className="text-xs text-foreground-muted mt-1">{lp.hero?.m1_lbl || 'Scan & encaissement ticket'}</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-primary font-heading">{lp.hero?.m2_val || '100%'}</p>
                <p className="text-xs text-foreground-muted mt-1">{lp.hero?.m2_lbl || 'Contrôle des péremptions'}</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-primary font-heading">{lp.hero?.m3_val || '7 jours'}</p>
                <p className="text-xs text-foreground-muted mt-1">{lp.hero?.m3_lbl || 'Essai gratuit sans carte'}</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-primary font-heading">{lp.hero?.m4_val || 'Multi-mode'}</p>
                <p className="text-xs text-foreground-muted mt-1">{lp.hero?.m4_lbl || 'Espèces, Wave, Orange Money'}</p>
              </div>
            </div>
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse-slow"></div>
        </section>

        {/* Fonctionnalités */}
        <section id="fonctionnalites" className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold font-heading mb-4">
                {lp.features_section?.title || 'Tout ce dont votre pharmacie a besoin au quotidien'}
              </h2>
              <p className="text-lg text-foreground-muted">
                {lp.features_section?.desc || 'Un système pensé pour libérer le pharmacien et ses collaborateurs des tâches fastidieuses afin de se concentrer sur le conseil aux patients.'}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="p-8 rounded-2xl bg-surface border border-surface-border hover:border-primary/40 hover:shadow-lg transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className={`w-14 h-14 ${f.bg} rounded-xl flex items-center justify-center mb-6`}>
                      <f.icon className={`w-7 h-7 ${f.color}`} />
                    </div>
                    <h3 className="text-xl font-bold font-heading mb-3 text-foreground">{f.title}</h3>
                    <p className="text-foreground-muted text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bannière Démo en direct */}
        <section className="py-16 bg-primary/5 border-y border-surface-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="w-12 h-12 rounded-full bg-primary/10 text-primary inline-flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </span>
            <h2 className="text-3xl font-bold font-heading mb-3">
              {lp.demo_banner?.title || "Découvrez l'interface en direct"}
            </h2>
            <p className="text-foreground-muted mb-8 max-w-xl mx-auto">
              {lp.demo_banner?.desc || 'Testez immédiatement notre Point de Vente, ajoutez des produits au panier, simulez un encaissement et consultez le catalogue sans aucune installation.'}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/decouvrir-dpharma"
                className="rounded-xl bg-primary px-8 py-3.5 text-base font-bold text-white shadow-md hover:bg-primary-hover transition-colors inline-flex items-center gap-2"
              >
                {lp.demo_banner?.demo_btn || 'Accéder à la démo en 1 clic'} <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/guide"
                className="rounded-xl border border-surface-border bg-surface px-6 py-3.5 text-base font-semibold text-foreground hover:border-primary hover:text-primary transition-colors inline-flex items-center gap-2"
              >
                <BookOpen className="w-5 h-5" /> {lp.demo_banner?.guide_btn || 'Lire le guide pas-à-pas'}
              </Link>
            </div>
          </div>
        </section>

        {/* Tarifs rapides */}
        <section className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold font-heading mb-4">
                {lp.pricing_section?.title || 'Des tarifs clairs, adaptés à vos besoins'}
              </h2>
              <p className="text-foreground-muted text-lg">
                {lp.pricing_section?.desc || "Tous les forfaits incluent 7 jours d'essai gratuit. Aucun frais caché."}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="rounded-2xl border-2 border-primary bg-primary/5 p-8 flex flex-col justify-between relative shadow-xl">
                <div className="absolute top-0 right-6 -translate-y-1/2 bg-primary text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  {lp.pricing_section?.pharma_badge || 'Officines & Pharmacies'}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary mb-1">
                    {lp.pricing_section?.pharma_title || 'Pharmacie'}
                  </h3>
                  <p className="text-3xl font-extrabold text-primary my-4">
                    {lp.pricing_section?.pharma_price || '75.000'} <span className="text-sm font-normal text-foreground-muted">{lp.pricing_section?.pharma_unit || 'FCFA / an'}</span>
                  </p>
                  <p className="text-xs text-foreground-muted mb-6">
                    {lp.pricing_section?.pharma_desc || "Tout le système pour informatiser et gérer l'officine."}
                  </p>
                  <ul className="space-y-3 mb-8 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> {lp.pricing_section?.pharma_f1 || 'Vente POS & scan rapide code-barres'}</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> {lp.pricing_section?.pharma_f2 || 'Suivi des stocks & alertes de péremption'}</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> {lp.pricing_section?.pharma_f3 || 'Caisse quotidienne & contrôle des écarts'}</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> {lp.pricing_section?.pharma_f4 || 'Commandes directes fournisseurs & labos'}</li>
                  </ul>
                </div>
                <Link href="/checkout?plan=pharmacie" className="w-full text-center py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover transition-colors shadow-md">
                  {lp.pricing_section?.pharma_btn || 'Souscrire Pharmacie'}
                </Link>
              </div>

              <div className="rounded-2xl border border-surface-border bg-surface p-8 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-1">
                    {lp.pricing_section?.supplier_title || 'Fournisseur / Labo'}
                  </h3>
                  <p className="text-3xl font-extrabold text-foreground my-4">
                    {lp.pricing_section?.supplier_price || '50.000'} <span className="text-sm font-normal text-foreground-muted">{lp.pricing_section?.supplier_unit || 'FCFA / an'}</span>
                  </p>
                  <p className="text-xs text-foreground-muted mb-6">
                    {lp.pricing_section?.supplier_desc || 'Pour les grossistes, répartiteurs et laboratoires.'}
                  </p>
                  <ul className="space-y-3 mb-8 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> {lp.pricing_section?.supplier_f1 || 'Catalogue médicaments & molécules'}</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> {lp.pricing_section?.supplier_f2 || 'Réception des commandes officines'}</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> {lp.pricing_section?.supplier_f3 || 'Suivi livraisons & accusés de réception'}</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> {lp.pricing_section?.supplier_f4 || 'Support technique & accompagnement'}</li>
                  </ul>
                </div>
                <Link href="/checkout?plan=fournisseur" className="w-full text-center py-2.5 rounded-lg border border-primary text-primary font-semibold hover:bg-primary hover:text-white transition-colors">
                  {lp.pricing_section?.supplier_btn || 'Souscrire Fournisseur / Labo'}
                </Link>
              </div>
            </div>

            <div className="text-center mt-12">
              <Link href="/tarifs" className="text-primary font-semibold hover:underline inline-flex items-center gap-1 text-sm">
                {lp.pricing_section?.details_link || 'Consulter les détails des tarifs'} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Contact / Assistance */}
        <section className="py-20 bg-surface border-t border-surface-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold font-heading mb-4">
              {lp.contact_section?.title || "Une question ou besoin d'aide pour démarrer ?"}
            </h2>
            <p className="text-foreground-muted mb-8 max-w-lg mx-auto">
              {lp.contact_section?.desc || "Notre équipe d'assistance est à votre service pour vous accompagner dans la prise en main de D-PHARMA."}
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <a
                href="tel:+221708484298"
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-background border border-surface-border hover:border-primary transition-colors font-medium"
              >
                <Phone className="w-4 h-4 text-primary" /> +221 70 848 42 98
              </a>
              <a
                href="mailto:support@dembasolution.com"
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-background border border-surface-border hover:border-primary transition-colors font-medium"
              >
                <Mail className="w-4 h-4 text-primary" /> support@dembasolution.com
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                <Activity className="w-5 h-5 text-white" />
              </span>
              <span className="text-xl font-bold font-heading text-background">
                D-PHARMA
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-background/70">
              <Link href="/guide" className="hover:text-background transition-colors">
                {lp.nav?.guide || "Guide d'utilisation"}
              </Link>
              <Link href="/tarifs" className="hover:text-background transition-colors">
                {lp.nav?.pricing || 'Tarifs'}
              </Link>
              <Link href="/decouvrir-dpharma" className="hover:text-background transition-colors">
                {lp.nav?.demo || 'Démo en direct'}
              </Link>
              <Link href="/recherche-medicament" className="hover:text-background transition-colors">
                {lp.nav?.patients || 'Espace Patients'}
              </Link>
              <Link href="/admin" className="hover:text-background transition-colors">
                Administration
              </Link>
            </div>
          </div>
          <div className="pt-8 text-center text-xs text-background/50">
            © {new Date().getFullYear()} {lp.footer?.rights || 'Demba Solution. D-PHARMA — Tous droits réservés.'}
          </div>
        </div>
      </footer>
    </div>
  )
}
