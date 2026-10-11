'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { withRetry } from '@/utils/supabase/retry'
import { redirect } from 'next/navigation'

// Compte de démonstration public pour D-PHARMA.
const DEMO_EMAIL = process.env.DEMO_PHARMA_EMAIL || 'kaneabdou@yahoo.fr'

export async function loginDemo() {
  const admin = createAdminClient()

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

  redirect('/dashboard')
}
