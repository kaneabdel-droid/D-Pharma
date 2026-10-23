'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeSwitcher } from '../components/ThemeSwitcher'
import LanguageSelector from '@/components/LanguageSelector'
import { OfflineSyncBar } from '@/components/offline/OfflineSyncBar'
import { hasPermission, moduleForPath, type PermissionMap } from '@/lib/permissions'
import { 
  LayoutDashboard, 
  Landmark, 
  Menu,
  X,
  LogOut,
  PackageOpen,
  LifeBuoy,
  Shield,
  Settings,
  Activity,
  Truck,
  BookOpen,
  UploadCloud,
  Users,
  Building2,
  FileWarning,
  RotateCcw,
  Receipt
} from 'lucide-react'
import { DeviseProvider } from '@/components/DeviseProvider'

export default function ClientLayout({
  children,
  subscriptionTier,
  role,
  permissions,
  gieName,
  devise = 'XOF',
  dict,
  locale,
  menuLayout = 'sidebar',
}: {
  children: React.ReactNode
  subscriptionTier: string
  role: string
  permissions: PermissionMap | null
  gieName: string
  devise?: string
  dict: any
  locale: string
  menuLayout?: 'sidebar' | 'horizontal'
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [menuOuvert, setMenuOuvert] = useState<string | null>(null)
  const navHorizontalRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    // S'assurer que le cookie hors-ligne est actif pour le Service Worker
    document.cookie = 'demba_offline_active=1; path=/; max-age=2592000; SameSite=Lax'

    // Si en ligne, rafraîchir en tâche de fond le shell du dashboard
    if (typeof navigator !== 'undefined' && navigator.onLine && 'caches' in window) {
      caches.open('demba-offline-dpharma-v3').then((cache) => {
        fetch('/dashboard').then((res) => {
          if (res && res.ok) cache.put('/dashboard', res)
        }).catch(() => {})
      }).catch(() => {})
    }
  }, [])

  const navigation = [
    { key: 'dashboard', label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
    { key: 'pos_pharma', label: 'Vente Comptoir (POS)', href: '/pharmacie/pos', icon: Activity },
    { key: 'stock_pharma', label: 'Gestion des Stocks', href: '/pharmacie/stocks', icon: PackageOpen },
    { key: 'perimes_pharma', label: 'Périmés & PV Destruction', href: '/pharmacie/perimes', icon: FileWarning },
    { key: 'retours_pharma', label: 'Retours & Avoirs Grossistes', href: '/pharmacie/retours-grossistes', icon: RotateCcw },
    { key: 'clients_pharma', label: 'Clients & Tiers-Payant', href: '/pharmacie/clients', icon: Users },
    { key: 'fournisseurs_pharma', label: 'Grossistes & Dettes', href: '/pharmacie/fournisseurs', icon: Building2 },
    { key: 'commandes_pharma', label: 'Commandes d’Appro', href: '/pharmacie/commandes', icon: Truck },
    { key: 'tresorerie', label: 'Trésorerie & Caisses', href: '/tresorerie', icon: Landmark },
    { key: 'comptabilite', label: 'Comptabilité (SYSCOHADA)', href: '/comptabilite', icon: BookOpen },
    { key: 'tva_pharma', label: 'Déclaration TVA (DGID)', href: '/comptabilite/tva', icon: Receipt },
    { key: 'import_donnees', label: 'Importer des données', href: '/parametres/import', icon: UploadCloud },
    { key: 'parametres', label: 'Paramètres & Équipe', href: '/parametres', icon: Settings },
    { key: 'abonnement', label: 'Abonnement', href: '/abonnement', icon: Shield },
    { key: 'support', label: 'Assistance & Support', href: '/support', icon: LifeBuoy },
  ]

  // Définition structurée par catégories pour le menu horizontal
  const menuSections = [
    {
      titre: dict.sidebar?.section_pilotage || 'Pilotage',
      items: [
        { key: 'dashboard', label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      titre: dict.sidebar?.section_pharmacie || 'Pharmacie & Tiers',
      items: [
        { key: 'pos_pharma', label: 'Vente Comptoir (POS)', href: '/pharmacie/pos', icon: Activity },
        { key: 'stock_pharma', label: 'Gestion des Stocks', href: '/pharmacie/stocks', icon: PackageOpen },
        { key: 'perimes_pharma', label: 'Périmés & PV Destruction', href: '/pharmacie/perimes', icon: FileWarning },
        { key: 'retours_pharma', label: 'Retours & Avoirs Grossistes', href: '/pharmacie/retours-grossistes', icon: RotateCcw },
        { key: 'clients_pharma', label: 'Clients & Tiers-Payant', href: '/pharmacie/clients', icon: Users },
        { key: 'fournisseurs_pharma', label: 'Grossistes & Dettes', href: '/pharmacie/fournisseurs', icon: Building2 },
        { key: 'commandes_pharma', label: 'Commandes d’Appro', href: '/pharmacie/commandes', icon: Truck },
      ],
    },
    {
      titre: dict.sidebar?.section_finances || 'Finance & Compta',
      items: [
        { key: 'tresorerie', label: 'Trésorerie & Caisses', href: '/tresorerie', icon: Landmark },
        { key: 'comptabilite', label: 'Comptabilité (SYSCOHADA)', href: '/comptabilite', icon: BookOpen },
        { key: 'tva_pharma', label: 'Déclaration TVA (DGID)', href: '/comptabilite/tva', icon: Receipt },
      ],
    },
    {
      titre: dict.sidebar?.section_admin || 'Administration',
      items: [
        { key: 'import_donnees', label: 'Importer des données', href: '/parametres/import', icon: UploadCloud },
        { key: 'parametres', label: 'Paramètres & Équipe', href: '/parametres', icon: Settings },
        { key: 'abonnement', label: 'Abonnement', href: '/abonnement', icon: Shield },
      ],
    },
    {
      titre: dict.sidebar?.section_aide || 'Assistance',
      items: [
        { key: 'support', label: 'Assistance & Support', href: '/support', icon: LifeBuoy },
      ],
    },
  ]

  useEffect(() => {
    setSidebarOpen(false)
    setMenuOuvert(null)
  }, [pathname])

  useEffect(() => {
    function handleClickDehors(event: MouseEvent) {
      if (navHorizontalRef.current && !navHorizontalRef.current.contains(event.target as Node)) {
        setMenuOuvert(null)
      }
    }
    function handleToucheClavier(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOuvert(null)
      }
    }
    document.addEventListener('mousedown', handleClickDehors)
    document.addEventListener('keydown', handleToucheClavier)
    return () => {
      document.removeEventListener('mousedown', handleClickDehors)
      document.removeEventListener('keydown', handleToucheClavier)
    }
  }, [])

  const filteredNavigation = navigation.filter(item => {
    const moduleKey = moduleForPath(item.href)
    if (moduleKey && !hasPermission(role, permissions, moduleKey, 'read')) return false
    return true
  })

  const filteredSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const moduleKey = moduleForPath(item.href)
        if (moduleKey && !hasPermission(role, permissions, moduleKey, 'read')) return false
        return true
      }),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <div>
      {/* Mobile sidebar */}
      <div className={`relative z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-background/80" onClick={() => setSidebarOpen(false)} />
        
        <div className="fixed inset-0 flex">
          <div className="relative mr-16 flex w-full max-w-xs flex-1">
            <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
              <button type="button" className="-m-2.5 p-2.5" onClick={() => setSidebarOpen(false)}>
                <span className="sr-only">{dict.header.close_sidebar}</span>
                <X className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
            
            {/* Sidebar component */}
            <div className="flex grow flex-col gap-y-4 overflow-y-auto bg-[var(--sidebar)] px-4 pb-4">
              <div className="flex h-16 shrink-0 items-center">
                <h1 className="text-2xl font-bold text-primary font-heading tracking-wide">D-PHARMA</h1>
              </div>
              <nav className="flex flex-1 flex-col">
                <div className="space-y-4">
                  {filteredSections.map((section) => (
                    <div key={section.titre} className="space-y-1">
                      <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-foreground-muted/70">
                        {section.titre}
                      </p>
                      <div className="bg-surface/90 border border-surface-border/80 rounded-xl p-1 shadow-xs space-y-0.5">
                        {section.items.map((item) => {
                          const actif = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                          return (
                            <Link
                              key={item.key}
                              href={item.href}
                              onClick={() => setSidebarOpen(false)}
                              className={`
                                group flex items-center gap-x-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all
                                ${actif
                                  ? 'bg-primary text-white shadow-xs font-bold'
                                  : 'text-foreground/80 hover:text-foreground hover:bg-black/5'
                                }
                              `}
                            >
                              <item.icon
                                className={`h-4 w-4 shrink-0 ${actif ? 'text-white' : 'text-primary'}`}
                                aria-hidden="true"
                              />
                              <span className="truncate">{(item as any).label || dict.sidebar?.[item.key] || item.key}</span>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-4 border-t border-surface-border">
                  <a
                    href="/logout"
                    className="group flex items-center gap-x-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground-muted hover:bg-black/5 hover:text-danger transition-colors"
                  >
                    <LogOut className="h-4 w-4 shrink-0 text-foreground-muted group-hover:text-danger" aria-hidden="true" />
                    {dict.sidebar.logout}
                  </a>
                </div>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Navigation */}
      {menuLayout === 'horizontal' ? (
        <header className="sticky top-0 z-40 hidden w-full border-b border-surface-border bg-background lg:block">
          <div className="flex h-16 items-center justify-between px-6 border-b border-surface-border">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-primary font-heading tracking-wide">D-PHARMA</h1>
              <span className="text-surface-border">|</span>
              <span className="text-sm font-semibold text-foreground truncate max-w-xs">{gieName}</span>
            </div>
            <div className="flex items-center gap-4">
              <OfflineSyncBar />
              <LanguageSelector currentLang={locale} />
              <ThemeSwitcher />
              <a
                href="/logout"
                className="flex items-center gap-1.5 text-xs font-semibold text-foreground-muted hover:text-danger transition-colors p-2 rounded-md hover:bg-black/5"
                title={dict.sidebar.logout}
              >
                <LogOut className="h-4 w-4" />
                <span>{dict.sidebar.logout}</span>
              </a>
            </div>
          </div>
          {/* Navigation horizontale par catégories avec dropdowns */}
          <nav ref={navHorizontalRef} className="flex items-center gap-1.5 px-6 py-2 flex-wrap text-xs relative">
            {filteredSections.map((section) => {
              const aUnItemActif = section.items.some((item) => pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)))
              const estOuvert = menuOuvert === section.titre

              return (
                <div
                  key={section.titre}
                  className="relative group"
                  onMouseEnter={() => setMenuOuvert(section.titre)}
                  onMouseLeave={() => setMenuOuvert((actuel) => (actuel === section.titre ? null : actuel))}
                >
                  <button
                    type="button"
                    onClick={() => setMenuOuvert((actuel) => (actuel === section.titre ? null : section.titre))}
                    aria-expanded={estOuvert}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      aUnItemActif || estOuvert
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-foreground-muted hover:text-foreground hover:bg-surface'
                    }`}
                  >
                    <span>{section.titre}</span>
                    <span className={`text-[9px] opacity-70 transition-transform duration-150 ${estOuvert ? 'rotate-180' : ''}`}>▼</span>
                  </button>

                  <div
                    className={`absolute left-0 top-full pt-1 z-50 transition-all duration-150 ${
                      estOuvert ? 'block opacity-100 scale-100 pointer-events-auto' : 'hidden group-hover:block'
                    }`}
                  >
                    <div className="min-w-56 rounded-xl border border-surface-border bg-surface p-1.5 shadow-xl">
                      {section.items.map((item) => {
                        const actif = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                        return (
                          <Link
                            key={item.key}
                            href={item.href}
                            onClick={() => setMenuOuvert(null)}
                            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                              actif
                                ? 'bg-primary text-white'
                                : 'text-foreground-muted hover:text-foreground hover:bg-black/5'
                            }`}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span>{(item as any).label || dict.sidebar?.[item.key] || item.key}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </nav>
        </header>
      ) : (
        /* Static sidebar for desktop */
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-60 lg:flex-col">
          {/* Sidebar component */}
          <div className="flex grow flex-col gap-y-4 overflow-y-auto bg-[var(--sidebar)] border-r border-surface-border px-3.5 pb-4">
            <div className="flex h-16 shrink-0 items-center px-1">
              <h1 className="text-2xl font-bold text-primary font-heading tracking-wide">D-PHARMA</h1>
            </div>
            <nav className="flex flex-1 flex-col">
              <div className="space-y-4">
                {filteredSections.map((section) => (
                  <div key={section.titre} className="space-y-1">
                    <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-foreground-muted/70">
                      {section.titre}
                    </p>
                    <div className="bg-surface/90 border border-surface-border/80 rounded-xl p-1 shadow-xs space-y-0.5">
                      {section.items.map((item) => {
                        const actif = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                        return (
                          <Link
                            key={item.key}
                            href={item.href}
                            className={`
                              group flex items-center gap-x-2.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all
                              ${actif
                                ? 'bg-primary text-white shadow-xs font-bold'
                                : 'text-foreground/80 hover:text-foreground hover:bg-black/5'
                              }
                            `}
                          >
                            <item.icon
                              className={`h-4 w-4 shrink-0 ${actif ? 'text-white' : 'text-primary'}`}
                              aria-hidden="true"
                            />
                            <span className="truncate">{(item as any).label || dict.sidebar?.[item.key] || item.key}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-4 border-t border-surface-border">
                <a
                  href="/logout"
                  className="group flex items-center gap-x-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground-muted hover:bg-black/5 hover:text-danger transition-colors"
                >
                  <LogOut className="h-4 w-4 shrink-0 text-foreground-muted group-hover:text-danger" aria-hidden="true" />
                  {dict.sidebar.logout}
                </a>
              </div>
            </nav>
          </div>
        </div>
      )}

      <div className={menuLayout === 'horizontal' ? 'w-full' : 'lg:pl-60'}>
        <div className={`sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-surface-border bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 ${menuLayout === 'horizontal' ? 'lg:hidden' : ''}`}>
          <button type="button" className="-m-2.5 p-2.5 text-foreground-muted lg:hidden" onClick={() => setSidebarOpen(true)}>
            <span className="sr-only">{dict.header.open_sidebar}</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-surface-border lg:hidden" aria-hidden="true" />

          <div className="flex flex-1 min-w-0 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex min-w-0 items-center gap-x-3 sm:gap-x-4 lg:gap-x-6">
              <OfflineSyncBar />
              <LanguageSelector currentLang={locale} />
              <ThemeSwitcher />
              {/* Profile dropdown or simple user info could go here */}
              <div className="min-w-0 max-w-[6rem] truncate text-sm font-semibold leading-6 text-foreground sm:max-w-[10rem] sm:text-base md:max-w-xs">
                {gieName} <span className="hidden sm:inline">({dict.header.admin})</span>
              </div>
            </div>
          </div>
        </div>

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <DeviseProvider devise={devise}>{children}</DeviseProvider>
          </div>
        </main>
      </div>
    </div>
  )
}
