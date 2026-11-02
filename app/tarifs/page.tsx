import Link from 'next/link'
import { ArrowLeft, CheckCircle2, ShieldCheck, Sparkles, BookOpen, Receipt, XCircle } from 'lucide-react'
import LanguageSelector from '@/components/LanguageSelector'
import { getDictionary, getLocale } from '@/dictionaries'

export const metadata = {
  title: 'Tarifs Officine — D-PHARMA',
}

export default async function TarifsDpharmaPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const lp = dict.landing_pharma || {}

  const standardFeatures = [
    'Point de Vente (POS) tactile & scan code-barres ultra-rapide (< 2 sec)',
    'Gestion complète des stocks, catalogue spécialités & génériques',
    'Contrôle strict des dates de péremption par lots & alertes anti-gaspillage',
    'Commandes d’approvisionnement grossistes (Laborex, Ubipharm, Copharbiotec)',
    'Caisse quotidienne, contrôle des écarts & encaissements Wave, Orange Money, Espèces',
    'Gestion des retours grossistes & suivi des avoirs fournisseurs',
    'Clients en compte, carnets de crédit & prise en charge Tiers-Payant / Assurances',
    'Liaison clinique D-Santé & accords de substitution d’ordonnances en direct',
    'Fonctionnement 100% hors-ligne (PWA) résilient',
  ]

  const premiumFeatures = [
    'Toutes les fonctionnalités incluses dans l’offre Standard',
    'Comptabilité Complète SYSCOHADA (Partie double pure, Journal, Grand Livre, Balance)',
    'Déclaration de TVA automatisée (DGID Sénégal) et états fiscaux préparatoires',
    'Télétransmission dématérialisée des bordereaux Tiers-Payant (IPM, CMU, Assurances)',
    'Compte de résultat & analyse de marge officinale en temps réel',
    'Accès Démo en direct illimité pour tester immédiatement',
    'Support technique prioritaire dédié 7j/7',
  ]

  return (
    <div className="bg-background min-h-screen font-sans text-foreground">
      <main>
        {/* Hero Header */}
        <section className="py-16 lg:py-20 bg-gradient-to-br from-surface to-background relative border-b border-surface-border">
          <div className="absolute top-4 right-4">
            <LanguageSelector currentLang={locale} />
          </div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
            <Link
              href="/"
              className="text-sm font-medium text-foreground-muted hover:text-primary inline-flex items-center gap-2 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />{' '}
              {locale === 'ar' ? 'العودة للرئيسية' : locale === 'en' ? 'Back to home' : "Retour à l'accueil"}
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Grille Tarifaire Transparente
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-heading tracking-tight mb-4">
              Tarification D-PHARMA
            </h1>
            <p className="text-lg text-foreground-muted max-w-2xl mx-auto leading-relaxed">
              Choisissez le niveau adapté à votre officine. Équipez tous vos comptoirs sans surcoût par poste.
            </p>
          </div>
        </section>

        {/* Pricing Cards Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <div className="grid md:grid-cols-2 gap-8 items-stretch">
              
              {/* Plan Standard */}
              <div className="rounded-3xl border border-surface-border p-8 bg-surface shadow-sm relative flex flex-col justify-between">
                <div>
                  <div className="mb-4">
                    <span className="px-3 py-1 rounded-full bg-surface-border text-foreground text-xs font-bold uppercase tracking-wider">
                      Gestion d’Officine
                    </span>
                    <h2 className="text-2xl font-extrabold text-foreground font-heading mt-3">
                      Niveau Standard
                    </h2>
                    <p className="text-xs text-foreground-muted mt-1">
                      Idéal pour informatiser les ventes, le stock, la caisse et les commandes.
                    </p>
                  </div>

                  <div className="my-6 p-5 rounded-2xl bg-surface-hover border border-surface-border">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-foreground tracking-tight">100.000</span>
                      <span className="text-sm font-bold text-foreground-muted">FCFA / an</span>
                    </div>
                    <p className="text-xs text-foreground-muted mt-1">
                      Facturé annuellement • 7 jours d&apos;essai gratuit
                    </p>
                  </div>

                  <div className="space-y-3 mb-8">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted block">
                      Inclus dans Standard :
                    </span>
                    <div className="space-y-2.5">
                      {standardFeatures.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-foreground">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                      <div className="flex items-start gap-2.5 text-xs text-foreground-muted/70 pt-1">
                        <XCircle className="w-4 h-4 text-danger/60 shrink-0 mt-0.5" />
                        <span>Comptabilité SYSCOHADA (Non incluse)</span>
                      </div>
                      <div className="flex items-start gap-2.5 text-xs text-foreground-muted/70">
                        <XCircle className="w-4 h-4 text-danger/60 shrink-0 mt-0.5" />
                        <span>Déclaration TVA DGID (Non incluse)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-surface-border">
                  <Link
                    href="/checkout?plan=standard"
                    className="w-full block py-3.5 px-6 rounded-xl border-2 border-primary text-primary font-bold text-center text-sm hover:bg-primary hover:text-white transition-all shadow-xs"
                  >
                    Choisir Standard (100.000 FCFA / an)
                  </Link>
                </div>
              </div>

              {/* Plan Premium */}
              <div className="rounded-3xl border-2 border-primary p-8 bg-surface shadow-xl relative flex flex-col justify-between overflow-hidden">
                <div className="absolute top-0 right-8 -translate-y-1/2 bg-primary text-white text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-md">
                  Recommandé • Compta & Fiscal
                </div>

                <div>
                  <div className="mb-4">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                      Gestion Intégrale + SYSCOHADA
                    </span>
                    <h2 className="text-2xl font-extrabold text-foreground font-heading mt-3">
                      Niveau Premium
                    </h2>
                    <p className="text-xs text-foreground-muted mt-1">
                      Gestion totale avec comptabilité à partie double et liasse TVA conforme DGID.
                    </p>
                  </div>

                  <div className="my-6 p-5 rounded-2xl bg-primary/5 border border-primary/20">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-primary tracking-tight">120.000</span>
                      <span className="text-sm font-bold text-foreground-muted">FCFA / an</span>
                    </div>
                    <p className="text-xs text-foreground-muted mt-1">
                      Facturé annuellement • Soit seulement 10.000 FCFA / mois
                    </p>
                  </div>

                  <div className="space-y-3 mb-8">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted block">
                      Inclus dans Premium :
                    </span>
                    <div className="space-y-2.5">
                      {premiumFeatures.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-foreground">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span className={idx >= 1 && idx <= 3 ? 'font-bold text-primary' : ''}>
                            {feat}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-surface-border space-y-2.5">
                  <Link
                    href="/checkout?plan=premium"
                    className="w-full block py-3.5 px-6 rounded-xl bg-primary text-white font-bold text-center text-sm hover:bg-primary-hover transition-all shadow-md shadow-primary/20"
                  >
                    Souscrire Premium (120.000 FCFA / an)
                  </Link>
                  <Link
                    href="/decouvrir-dpharma"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-primary/30 text-primary font-bold text-center text-xs hover:bg-primary/10 transition-colors shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>Tester la Démo Premium en direct</span>
                  </Link>
                </div>
              </div>

            </div>

            <div className="mt-12 text-center text-xs text-foreground-muted">
              <ShieldCheck className="w-4 h-4 text-emerald-600 inline mr-1 -mt-0.5" />
              Paiement 100% sécurisé via Wave, Orange Money, Carte Bancaire ou Virement bancaire. 7 jours d&apos;essai sans engagement.
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-foreground text-background py-10 border-t border-surface-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xl font-bold font-heading text-background mb-2 block">D-PHARMA</span>
          <p className="text-background/50 text-xs">
            © {new Date().getFullYear()} {lp.footer?.rights || 'Demba Solution. Tous droits réservés.'}
          </p>
        </div>
      </footer>
    </div>
  )
}
