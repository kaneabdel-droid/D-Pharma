import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request)
  } catch (e) {
    console.error('Middleware crash:', e)
    // Au lieu de renvoyer une erreur 500 brute qui peut faire crasher Vercel Edge (MIDDLEWARE_INVOCATION_FAILED),
    // on laisse passer la requête (les pages/API vérifieront de toute façon les droits si nécessaire).
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
