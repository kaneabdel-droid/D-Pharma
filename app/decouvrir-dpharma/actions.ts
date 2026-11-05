'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { withRetry } from '@/utils/supabase/retry'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

// Compte de démonstration public pour D-PHARMA.
const DEMO_EMAIL = process.env.DEMO_PHARMA_EMAIL || 'kaneabdou@yahoo.fr'

export async function loginDemo() {
  const admin = createAdminClient()

  // S'assurer que le GIE de la démo est configuré en Premium actif sans restriction
  try {
    await admin
      .from('gies')
      .update({
        subscription_tier: 'premium',
        abonnement_statut: 'actif',
        compte_verrouille: false,
      })
      .ilike('nom', '%Centrale de Dakar%')
  } catch (e) {
    console.warn('Update demo gie error:', e)
  }

  const { data, error } = await withRetry(() =>
    admin.auth.admin.generateLink({ type: 'magiclink', email: DEMO_EMAIL })
  ).catch((e) => ({ data: null, error: e }))

  if (error || !data?.properties?.hashed_token) {
    console.error('Erreur génération lien démo:', error)
    redirect('/decouvrir-dpharma?demo_error=1')
  }

  const supabase = await createClient()
  const { error: verifyError } = await withRetry(() =>
    supabase.auth.verifyOtp({
      token_hash: data.properties.hashed_token,
      type: 'magiclink',
    })
  ).catch((e) => ({ error: e }))

  if (verifyError) {
    console.error('Erreur connexion démo:', verifyError)
    redirect('/decouvrir-dpharma?demo_error=1')
  }

  try {
    const cookieStore = await cookies()
    cookieStore.set('dpharma_demo_session', '1', {
      path: '/',
      maxAge: 86400 * 7,
      sameSite: 'lax',
    })
  } catch (err) {
    console.warn('Cookie demo non bloquant:', err)
  }

  redirect('/dashboard')
}
