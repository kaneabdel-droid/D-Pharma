import Link from 'next/link'
import { ArrowLeft, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'
import LanguageSelector from '@/components/LanguageSelector'
import { getDictionary, getLocale } from '@/dictionaries'

export const metadata = {
  title: 'Tarifs Officine — D-PHARMA',
}

export default async function TarifsDpharmaPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const lp = dict.landing_pharma || {}

  const features = [
    'Point de Vente (POS) tactile & scan code-barres ultra-rapide (< 2 sec)',
    'Gestion complète des stocks, catalogue spécialités & génériques',
    'Contrôle strict des dates de péremption par lots & alertes anti-gaspillage',
    'Commandes d’approvisionnement : impression officielle A4 & envoi direct par e-mail aux grossistes/labos',
    'Caisse quotidienne, contrôle des écarts & encaissements Wave, Orange Money, Espèces',
    'Gestion des retours grossistes & suivi des avoirs fournisseurs',
    'Clients en compte, carnets de crédit & prise en charge Tiers-Payant / Assurances',
    'Comptabilité SYSCOHADA intégrée & état de déclaration TVA (DGID)',
    'Fonctionnement 100% hors-ligne (PWA) : continuez à vendre même en cas de coupure internet',
    'Support technique prioritaire, formation et sauvegardes sécurisées dans le Cloud'
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
              <Sparkles className="w-3.5 h-3.5" /> Forfait Unique Tout Inclus
            </div>
            <h1 className="text-4xl md:text-6xl font-bold font-heading tracking-tight mb-4">
              Tarification D-PHARMA
            </h1>
            <p className="text-lg md:text-xl text-foreground-muted max-w-2xl mx-auto leading-relaxed">
              Une formule unique à tarif fixe pour équiper toute votre pharmacie, sans abonnement tiers ni coût supplémentaire.
            </p>
          </div>
        </section>

        {/* Plan Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
            <div className="rounded-3xl border-2 border-primary p-8 sm:p-10 bg-surface/50 shadow-2xl relative flex flex-col justify-between overflow-hidden">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-primary text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md">
                Formule Officine Complète
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground font-heading">
                      Abonnement Annuel Pharmacie
                    </h2>
                    <p className="text-sm text-foreground-muted mt-1">
                      Gestion officinale intégrée, stocks, caisse, tiers-payant & commandes fournisseurs.
                    </p>
                  </div>
                </div>

                <div className="my-6 p-6 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-primary tracking-tight">100.000</span>
                      <span className="text-base font-bold text-foreground-muted">FCFA / an</span>
                    </div>
                    <p className="text-xs text-foreground-muted mt-1">
                      Soit environ 8.300 FCFA / mois • Facturé annuellement • 7 jours d&apos;essai gratuit
                    </p>
                  </div>

                  <div className="text-xs text-primary font-semibold flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 self-start sm:self-auto">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Zéro engagement à l&apos;essai</span>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted block">
                    Fonctionnalités incluses dans l&apos;abonnement :
                  </span>
                  <div className="grid sm:grid-cols-1 gap-3">
                    {features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-sm text-foreground">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-surface-border space-y-3">
                <Link
                  href="/checkout?plan=pharmacie"
                  className="w-full block py-4 px-6 rounded-xl bg-primary text-white font-bold text-center text-base hover:bg-primary-hover transition-all shadow-xl shadow-primary/25 hover:shadow-primary/40 transform hover:-translate-y-0.5"
                >
                  Souscrire à D-PHARMA (100.000 FCFA / an)
                </Link>
                <p className="text-center text-xs text-foreground-muted">
                  Paiement sécurisé par Wave, Orange Money, Carte Bancaire ou Virement bancaire.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-foreground text-background py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-2xl font-bold font-heading text-background mb-4 block">D-PHARMA</span>
          <p className="text-background/50 text-sm">
            © {new Date().getFullYear()} {lp.footer?.rights || 'Demba Solution. Tous droits réservés.'}
          </p>
        </div>
      </footer>
    </div>
  )
}
