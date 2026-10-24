// Clés de la plateforme SIGGIE elle-même (mono-marchand) — pas de gestion
// multi-marchand ("BYOK"), donc pas de chiffrement par-tenant : ces variables
// sont lues directement depuis l'environnement du serveur.

export const bictorysApiKey = process.env.BICTORYS_API_KEY
export const bictorysWebhookSecret = process.env.BICTORYS_WEBHOOK_SECRET

// MONEROO_API_KEY : nom utilisé par D-QUINCA / D-INTRANTS / D-SCHOLAR, accepté aussi ici
// pour qu'une même configuration Vercel fonctionne d'un produit à l'autre.
export const monerooSecretKey = process.env.MONEROO_SECRET_KEY || process.env.MONEROO_API_KEY
export const monerooWebhookSecret = process.env.MONEROO_WEBHOOK_SECRET

export const chariowApiKey = process.env.CHARIOW_API_KEY
export const chariowWebhookSecret = process.env.CHARIOW_WEBHOOK_SECRET
export const chariowApiUrl = process.env.CHARIOW_API_URL || 'https://api.chariow.com/v1'

export const hasBictorysKeys = Boolean(bictorysApiKey && bictorysWebhookSecret)
export const hasMonerooKeys = Boolean(monerooSecretKey && monerooWebhookSecret)
export const hasChariowKeys = Boolean(chariowApiKey && chariowWebhookSecret)

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

// Clé Maketou de production Demba Solution (vérifiée et active)
export const DEMBA_MAKETOU_KEY = 'msk_585f798965a35bda5adfe4afbdc96689ee3df5f0a2407e8634968e4f863296d7'

function sanitizeKey(val?: string): string {
  if (!val) return ''
  return val.trim().replace(/^["'`]|["'`]$/g, '').replace(/^Bearer\s+/i, '').trim()
}

const cleanedMaketouKey = sanitizeKey(process.env.MAKETOU_API_KEY)
// Si la variable sur Vercel est absente, mal formée ou ne commence pas par msk_, on utilise la clé de production active
export const maketouApiKey = cleanedMaketouKey && cleanedMaketouKey.startsWith('msk_')
  ? cleanedMaketouKey
  : DEMBA_MAKETOU_KEY

export const maketouApiUrl = (process.env.MAKETOU_API_URL || 'https://api.maketou.net').trim().replace(/\/+$/, '')
export const hasMaketouKeys = Boolean(maketouApiKey)

