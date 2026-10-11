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
  const p = dict.landing?.pricing || {}

  return (
    <div className="bg-background min-h-screen font-sans text-foreground">
      <main>
        <section className="py-16 lg:py-20 bg-gradient-to-br from-surface to-background relative">
          <div className="absolute top-4 right-4">
            <LanguageSelector currentLang={locale} />
          </div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
            <Link href="/" className="text-sm font-medium text-foreground-muted hover:text-primary flex items-center justify-center gap-2 mb-6">
              <ArrowLeft className="w-4 h-4" /> Retour à l&apos;accueil
            </Link>
            <h1 className="text-4xl md:text-6xl font-bold font-heading tracking-tight mb-6">
              Tarifs <span className="text-primary">D-PHARMA</span>
            </h1>
            <p className="text-lg md:text-xl text-foreground-muted leading-relaxed">
              Des forfaits transparents et adaptés à la taille de votre officine. Essai gratuit de 7 jours, sans engagement.
            </p>
          </div>
        </section>

        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Pharmacie */}
              <div className="rounded-3xl border-2 border-primary p-8 bg-primary/5 flex flex-col relative shadow-2xl">
                <div className="absolute top-0 right-6 -translate-y-1/2 bg-primary text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Officines & Pharmacies
                </div>
                <h3 className="text-2xl font-bold mb-2 text-primary">Pharmacie</h3>
                <div className="mb-8">
                  <span className="text-4xl font-extrabold text-primary">75.000</span>
                  <span className="text-foreground-muted font-medium"> {p.per_year || 'FCFA / an'}</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary" /> <span>Point de Vente (POS) & scan code-barres ultra rapide</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary" /> <span>Gestion des stocks & alertes de péremption par lots</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary" /> <span>Suivi de la caisse quotidienne, reçus & trésorerie</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary" /> <span>Commandes directes vers les laboratoires & grossistes</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary" /> <span>Multi-vendeurs, rôles caissier/gérant & support dédié</span></li>
                </ul>
                <Link href="/checkout?plan=pharmacie" className="w-full rounded-xl bg-primary text-white px-4 py-3 font-bold text-center hover:bg-primary-hover transition-colors shadow-lg shadow-primary/25">
                  Souscrire Pharmacie
                </Link>
              </div>

              {/* Fournisseur / Laboratoire */}
              <div className="rounded-3xl border border-surface-border p-8 bg-surface flex flex-col hover:shadow-xl transition-shadow">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground-muted mb-2">
                  Laboratoires & Grossistes
                </div>
                <h3 className="text-2xl font-bold mb-2">Fournisseur / Labo</h3>
                <div className="mb-8">
                  <span className="text-4xl font-extrabold">50.000</span>
                  <span className="text-foreground-muted font-medium"> {p.per_year || 'FCFA / an'}</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success" /> <span>Publication du catalogue de médicaments & molécules</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success" /> <span>Réception & traitement des bons de commande officines</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success" /> <span>Suivi des expéditions & accusés de réception</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success" /> <span>Historique des livraisons & statistiques de vente</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success" /> <span>Support technique & accompagnement à l&apos;intégration</span></li>
                </ul>
                <Link href="/checkout?plan=fournisseur" className="w-full rounded-xl bg-background border-2 border-primary text-primary px-4 py-3 font-bold text-center hover:bg-primary hover:text-white transition-colors">
                  Souscrire Fournisseur / Labo
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-foreground text-background py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-2xl font-bold font-heading text-background mb-4 block">D-PHARMA</span>
          <p className="text-background/50 text-sm">© {new Date().getFullYear()} Demba Solution. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  )
}
