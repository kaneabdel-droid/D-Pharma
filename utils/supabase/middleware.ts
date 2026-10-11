import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdminEmail } from '@/lib/admin/auth'

const ADMIN_COOKIE_OPTIONS = {
  name: 'sb-demba-admin',
  domain: '.dembasolution.com',
  sameSite: 'lax' as const,
  secure: true,
}

function createAdminIdentityMiddlewareClient(
  request: NextRequest,
  response: NextResponse
) {
  if (!process.env.ADMIN_IDENTITY_SUPABASE_URL || !process.env.ADMIN_IDENTITY_SUPABASE_ANON_KEY) {
    return { auth: { getUser: async () => ({ data: { user: null }, error: null }) } } as any
  }
  return createServerClient(
    process.env.ADMIN_IDENTITY_SUPABASE_URL,
    process.env.ADMIN_IDENTITY_SUPABASE_ANON_KEY,
    {
      cookieOptions: ADMIN_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tgnqcqfynkvmocxqdxyc.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_SCG2vuL7_fCWqG1C7yJ58Q_LYyCnDkM'

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  // Exclusions directes des endpoints d'API, webhooks et cron
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icon')
  ) {
    return supabaseResponse
  }

  // Connexion admin dédiée
  if (pathname === '/admin/login') {
    return supabaseResponse
  }

  // Récupération sécurisée de la session utilisateur
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user ?? null
  } catch {
    user = null
  }

  // Protection espace admin
  if (pathname.startsWith('/admin')) {
    let adminUser = null
    try {
      const adminClient = createAdminIdentityMiddlewareClient(request, supabaseResponse)
      const { data } = await adminClient.auth.getUser()
      adminUser = data?.user ?? null
    } catch {
      adminUser = null
    }

    if (isAdminEmail(adminUser?.email) || isAdminEmail(user?.email)) {
      return supabaseResponse
    }

    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    url.search = pathname === '/admin' ? '' : `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`
    return NextResponse.redirect(url)
  }

  // Liste exhaustive des routes publiques accessibles sans session
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/update-password') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/decouvrir-dpharma') ||
    pathname.startsWith('/demo') ||
    pathname.startsWith('/decouvrir-siggie') ||
    pathname.startsWith('/guide') ||
    pathname.startsWith('/tarifs') ||
    pathname.startsWith('/recherche-medicament') ||
    pathname.startsWith('/checkout')

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
