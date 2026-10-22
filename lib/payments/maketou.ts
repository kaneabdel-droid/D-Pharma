import { maketouApiKey, maketouApiUrl } from './config'

type InitiateMaketouParams = {
  productId: string
  reference: string
  phoneLocal: string
  countryCode?: string
  customerEmail: string
  customerName?: string
  returnUrl: string
  montantAttendu?: number
}

export type InitiateMaketouResult =
  | { ok: true; providerTransactionId: string; checkoutUrl: string }
  | { ok: false; error: string }

function splitName(full: string | undefined, fallbackEmail: string): { first: string; last: string } {
  const v = (full ?? '').trim()
  if (!v) {
    const local = fallbackEmail.split('@')[0] || 'Client'
    return { first: local, last: '-' }
  }
  const parts = v.split(/\s+/)
  return { first: parts[0]!, last: parts.slice(1).join(' ') || '-' }
}

function formatPhoneE164(phone: string | undefined, countryCode = 'SN'): string | undefined {
  if (!phone) return undefined
  let cleaned = phone.replace(/[^\d+]/g, '')
  if (!cleaned) return undefined
  if (cleaned.startsWith('+')) {
    return cleaned.length >= 8 ? cleaned : undefined
  }
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2)
    return cleaned.length >= 8 ? cleaned : undefined
  }
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1)
  }
  const indicatifs: Record<string, string> = {
    SN: '221',
    CI: '225',
    ML: '223',
    BJ: '229',
    BF: '226',
    TG: '228',
    NE: '227',
    GN: '224',
    MR: '222',
  }
  const prefix = indicatifs[countryCode] || '221'
  if (cleaned.startsWith(prefix)) {
    return `+${cleaned}`
  }
  return `+${prefix}${cleaned}`
}

export async function initiateMaketouPayment(params: InitiateMaketouParams): Promise<InitiateMaketouResult> {
  if (!maketouApiKey) {
    return { ok: false, error: 'Maketou non configuré (MAKETOU_API_KEY manquant)' }
  }

  const { first, last } = splitName(params.customerName, params.customerEmail)
  const e164Phone = formatPhoneE164(params.phoneLocal, params.countryCode)

  const body: Record<string, any> = {
    productDocumentId: params.productId,
    email: params.customerEmail || 'client@dembasolution.com',
    firstName: first,
    lastName: last,
    redirectURL: params.returnUrl,
    meta: { paymentId: params.reference },
  }

  if (e164Phone) {
    body.phone = e164Phone
  }

  let res: Response
  try {
    res = await fetch(`${maketouApiUrl}/api/v1/stores/cart/checkout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${maketouApiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
  } catch (err) {
    return { ok: false, error: `Erreur réseau Maketou : ${(err as Error).message}` }
  }

  let parsed: any = null
  try {
    parsed = await res.json()
  } catch {
    return { ok: false, error: `Maketou a répondu ${res.status} (réponse non-JSON)` }
  }

  const providerTransactionId = parsed?.cart?.id
  const checkoutUrl = parsed?.redirectUrl

  if (!res.ok || !providerTransactionId || !checkoutUrl) {
    let errorMessage = `Maketou a répondu ${res.status}`
    if (typeof parsed?.message === 'string') {
      errorMessage = parsed.message
    } else if (Array.isArray(parsed?.message)) {
      const details = parsed.message
        .map((m: any) => {
          if (typeof m === 'string') return m
          if (m?.constraints) return Object.values(m.constraints).join(', ')
          return m?.property ? `Erreur sur le champ ${m.property}` : null
        })
        .filter(Boolean)
        .join(' ; ')
      if (details) errorMessage = `Erreur de validation : ${details}`
    } else if (parsed?.error && typeof parsed.error === 'string') {
      errorMessage = parsed.error
    }
    return { ok: false, error: errorMessage }
  }

  return { ok: true, providerTransactionId, checkoutUrl }
}

export async function fetchMaketouCart(cartId: string): Promise<{ status: string } | null> {
  if (!maketouApiKey) return null
  let res: Response
  try {
    res = await fetch(`${maketouApiUrl}/api/v1/stores/cart/${encodeURIComponent(cartId)}`, {
      headers: { Authorization: `Bearer ${maketouApiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    return null
  }
  if (!res.ok) return null
  const json = (await res.json().catch(() => null)) as any
  if (!json?.status) return null
  return { status: json.status }
}

export function mapMaketouStatus(raw: string): 'completed' | 'failed' | 'pending' {
  const s = raw.toLowerCase()
  if (s === 'completed') return 'completed'
  if (s === 'payment_failed' || s === 'abandoned') return 'failed'
  return 'pending' // waiting_payment
}
