import Link from 'next/link'
import {
  ArrowRight, ArrowLeft, Activity, PackageOpen, Truck, Landmark,
  Receipt, Wallet, CheckCircle2, Clock, BookOpen, Sparkles
} from 'lucide-react'
import LanguageSelector from '@/components/LanguageSelector'
import { getDictionary, getLocale } from '@/dictionaries'
import { loginDemo } from './actions'

export const metadata = {
  title: 'Découvrir D-PHARMA — Présentation et Démo en direct',
}

export default async function DecouvrirDpharmaPage({
  searchParams,
}: {
  searchParams?: Promise<{ demo_error?: string }>
}) {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const d = dict.decouvrir || {}
  const params = await searchParams
  const demoError = params?.demo_error === '1'

  const modulesPharmacie = [
    { icon: Activity, label: 'Point de Vente (POS) avec scanner code-barres' },
    { icon: PackageOpen, label: 'Catalogue Médicaments & Gestion des Stocks' },
    { icon: Clock, label: 'Contrôle automatique des dates de péremption' },
    { icon: Wallet, label: 'Caisse & Journal des encaissements' },
    { icon: Truck, label: 'Bons de commande labos avec impression PDF et envoi par email' },
  ]

  const plans = [
    {
      id: 'standard',
      nom: 'Niveau Standard',
      badge: 'Gestion d’Officine',
      prix: '100 000 FCFA / an',
      resume: 'Idéal pour informatiser les ventes, le stock, la caisse et les commandes.',
      inclus: modulesPharmacie,
      color: 'border-surface-border',
      populaire: false,
    },
    {
      id: 'premium',
      nom: 'Niveau Premium',
      badge: 'Recommandé • Compta & Fiscal',
      prix: '120 000 FCFA / an',
      resume: 'Gestion totale avec comptabilité à partie double SYSCOHADA et liasse TVA conforme DGID.',
      inclus: [
        ...modulesPharmacie,
        { icon: Landmark, label: 'Comptabilité générale SYSCOHADA informatisée' },
        { icon: Receipt, label: 'Déclaration TVA DGID & états financiers officiels' },
      ],
      color: 'border-primary',
      populaire: true,
    },
  ]

  return (
    <div className="bg-background min-h-screen font-sans text-foreground">
      {/* Header */}
      <header className="border-b border-surface-border bg-surface/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-foreground-muted hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Retour à l&apos;accueil
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSelector currentLang={locale} />
            <Link href="/guide" className="text-sm font-medium text-foreground-muted hover:text-primary">
              Guide d&apos;utilisation
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
            >
              Connexion
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="py-16 lg:py-24 bg-gradient-to-br from-surface to-background text-center">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5" /> Logiciel Officinal Moderne
            </div>
            <h1 className="text-4xl md:text-6xl font-bold font-heading tracking-tight mb-6">
              Comment fonctionne <span className="text-primary">D-PHARMA</span> ?
            </h1>
            <p className="text-lg md:text-xl text-foreground-muted leading-relaxed max-w-2xl mx-auto">
              Du Point de Vente au comptoir jusqu&apos;à la gestion rigoureuse des dates de péremption et des commandes labos : découvrez une solution conçue spécialement pour les officines de pharmacie.
            </p>
          </div>
        </section>

        {/* Démo en direct */}
        <section className="py-12 bg-primary/5 border-y border-surface-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold font-heading mb-3">
              Essayez D-PHARMA en direct
            </h2>
            <p className="text-foreground-muted mb-6">
              Accédez en un clic à l&apos;officine de démonstration pour tester la vente par scan, l&apos;inventaire et la caisse en conditions réelles, sans créer de compte.
            </p>
            {demoError && (
              <p className="mb-6 text-sm bg-danger/10 text-danger p-3 rounded-md max-w-md mx-auto">
                Impossible d&apos;accéder à la démo pour le moment. Réessayez dans un instant.
              </p>
            )}
            <form action={loginDemo}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-bold text-white shadow-lg hover:bg-primary-hover transition-all transform hover:-translate-y-0.5"
              >
                Tester la démo maintenant <ArrowRight className="w-5 h-5" />
              </button>
            </form>
            <p className="mt-3 text-xs text-foreground-muted">
              Espace partagé pour tester librement. Aucun mot de passe requis.
            </p>
          </div>
        </section>

        {/* Guide d'utilisation callout */}
        <section className="border-b border-surface-border bg-surface">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl py-10 flex flex-col items-center gap-5 text-center md:flex-row md:justify-between md:text-start">
            <div className="flex items-center gap-4">
              <span className="hidden sm:flex w-12 h-12 shrink-0 rounded-full bg-primary text-white items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-bold">Consultez notre Guide d&apos;utilisation</h3>
                <p className="text-sm text-foreground-muted">
                  Un manuel étape par étape pour configurer votre officine, biper les médicaments et gérer vos stocks.
                </p>
              </div>
            </div>
            <Link
              href="/guide"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-surface-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
            >
              Lire le guide <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Parcours en 3 étapes */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
            <h2 className="text-3xl font-bold font-heading text-center mb-12">
              Votre mise en route en 3 étapes simples
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-surface rounded-2xl p-6 border border-surface-border">
                <span className="w-10 h-10 rounded-full bg-primary text-white font-bold flex items-center justify-center mb-4">1</span>
                <h3 className="text-lg font-bold mb-2">Créer un compte</h3>
                <p className="text-sm text-foreground-muted">
                  Renseignez le nom de votre pharmacie, votre email et mot de passe. Vous bénéficiez immédiatement de <strong>7 jours d&apos;essai gratuit</strong>.
                </p>
              </div>
              <div className="bg-surface rounded-2xl p-6 border border-surface-border">
                <span className="w-10 h-10 rounded-full bg-primary text-white font-bold flex items-center justify-center mb-4">2</span>
                <h3 className="text-lg font-bold mb-2">Saisir ou scanner</h3>
                <p className="text-sm text-foreground-muted">
                  Ajoutez vos médicaments ou importez votre catalogue, scannez les codes-barres avec votre douchette et encaissez dès le premier jour.
                </p>
              </div>
              <div className="bg-surface rounded-2xl p-6 border border-surface-border">
                <span className="w-10 h-10 rounded-full bg-primary text-white font-bold flex items-center justify-center mb-4">3</span>
                <h3 className="text-lg font-bold mb-2">S&apos;abonner en ligne</h3>
                <p className="text-sm text-foreground-muted">
                  Avant la fin de votre essai, réglez facilement par Wave, Orange Money, carte bancaire ou virement pour continuer sans interruption.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Modules par forfait */}
        <section className="py-20 bg-surface border-t border-surface-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold font-heading mb-3">Deux formules claires et transparentes</h2>
              <p className="text-foreground-muted max-w-xl mx-auto">
                Choisissez entre l&apos;informatisation standard de votre officine et la gestion intégrale avec comptabilité SYSCOHADA.
              </p>
            </div>

            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 items-stretch">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-3xl bg-background border-2 ${p.color} p-8 flex flex-col justify-between shadow-lg relative`}
                >
                  <div className="absolute top-0 right-6 transform -translate-y-1/2">
                    <span className={`${p.populaire ? 'bg-primary text-white shadow-md' : 'bg-surface-border text-foreground'} text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider`}>
                      {p.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className={`text-2xl font-bold mb-1 ${p.populaire ? 'text-primary' : 'text-foreground'}`}>{p.nom}</h3>
                    <p className={`text-2xl font-extrabold mb-3 ${p.populaire ? 'text-primary' : 'text-foreground'}`}>{p.prix}</p>
                    <p className="text-sm text-foreground-muted mb-6">{p.resume}</p>
                    <ul className="space-y-3 mb-8">
                      {p.inclus.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                          <span>{item.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link
                    href={`/checkout?plan=${p.id}`}
                    className={`w-full text-center py-3.5 px-4 rounded-xl font-bold text-base transition-colors shadow-md ${
                      p.populaire ? 'bg-primary text-white hover:bg-primary-hover' : 'border-2 border-primary text-primary hover:bg-primary hover:text-white'
                    }`}
                  >
                    Démarrer avec {p.nom}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-2xl font-bold font-heading text-background mb-4 block">D-PHARMA</span>
          <p className="text-background/70 mb-4 max-w-md mx-auto">
            La solution logicielle complète pour la gestion d&apos;officines de pharmacie.
          </p>
          <p className="text-background/50 text-sm">© {new Date().getFullYear()} Demba Solution. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  )
}
