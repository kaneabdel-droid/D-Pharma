import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/proxy'

// Next.js 16 : convention native proxy (remplace l'ancien middleware.ts)
export async function proxy(request: NextRequest) {
  try {
    return await updateSession(request)
  } catch (error) {
    console.error('Proxy fallback:', error)
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    // Tout sauf les fichiers statiques, images et polices
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
