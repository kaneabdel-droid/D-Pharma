'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { initiateBictorysPayment } from '@/lib/payments/bictorys'
import { initiateMonerooPayment } from '@/lib/payments/moneroo'
import { initiateChariowPayment } from '@/lib/payments/chariow'
import { initiateMaketouPayment } from '@/lib/payments/maketou'
import { siteUrl } from '@/lib/payments/config'
import { montantUsd } from '@/lib/payments/dollars'

export type MoyenPaiement = 'mobile_money' | 'wave' | 'orange' | 'carte' | 'virement' | 'chariow' | 'maketou'

type InitiateResult =
  | { ok: true; checkoutUrl: string }
  | { ok: true; virement: true; paymentId: string }
  | { ok: false; error: string }

export async function initiateSubscriptionPayment(
  planId: string,
  isUpgrade: boolean,
  moyenPaiement: MoyenPaiement,
  phoneLocal?: string
): Promise<InitiateResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'Non authentifié' }
  }

  if (moyenPaiement === 'chariow' && isUpgrade) {
    // Chariow facture le prix d'un produit préconfiguré dans sa boutique, jamais un
    // montant libre — inutilisable pour un montant de proratisation arbitraire.
    return { ok: false, error: "Chariow n'est disponible que pour un forfait à prix plein" }
  }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id, gies(subscription_tier, devise, pays)')
    .eq('id', user.id)
    .single()

  if (!userData?.gie_id) {
    return { ok: false, error: 'Pharmacie introuvable' }
  }

  const gie = Array.isArray(userData.gies) ? userData.gies[0] : userData.gies
  const currentTier = gie?.subscription_tier || 'standard'
  // Pharmacie d'un autre pays (devise « sans unité ») : abonnement payé par carte, en dollars US.
  const enDollars = gie?.devise === 'AUCUNE'
  if (enDollars && moyenPaiement !== 'carte') {
    return { ok: false, error: 'Depuis votre pays, l’abonnement se paie par carte bancaire en dollars US' }
  }

  // Ne jamais faire confiance au prix envoyé par le client : on relit les tarifs en base.
  const { data: tarifs } = await supabase
    .from('tarif_abonnement')
    .select('niveau, prix_annuel')
    .in('niveau', [planId, currentTier])

  const selectedTarif = tarifs?.find((t) => t.niveau === planId)
  const currentTarif = tarifs?.find((t) => t.niveau === currentTier)

  if (!selectedTarif) {
    return { ok: false, error: 'Forfait inconnu' }
  }

  let montant = selectedTarif.prix_annuel
  if (isUpgrade && currentTarif) {
    montant = selectedTarif.prix_annuel - currentTarif.prix_annuel
    if (montant <= 0) montant = selectedTarif.prix_annuel
  }
  const devise = enDollars ? 'USD' : 'XOF'
  if (enDollars) montant = montantUsd(montant)

  const isMobile = moyenPaiement === 'mobile_money' || moyenPaiement === 'wave' || moyenPaiement === 'orange' || moyenPaiement === 'maketou' || moyenPaiement === 'chariow'
  const isCarte = moyenPaiement === 'carte'
  const isVirement = moyenPaiement === 'virement'

  const providerInitial = isCarte ? 'moneroo' : isVirement ? 'virement' : 'maketou'
  const dbMoyenPaiement = isCarte ? 'carte' : isVirement ? 'virement' : 'wave'

  // Anti double paiement (1/2) : un forfait déjà réglé ne se paie pas une seconde fois
  if (planId === currentTier) {
    const { count } = await supabase
      .from('abonnement_paiements')
      .select('id', { count: 'exact', head: true })
      .eq('gie_id', userData.gie_id)
      .eq('niveau', planId)
      .eq('statut', 'completed')
      .eq('doublon', false)
    if (count) {
      return { ok: false, error: `Votre pharmacie est déjà abonnée au forfait ${planId} : aucun nouveau paiement n'est nécessaire.` }
    }
  }

  // Anti double paiement (2/2) : relancer la même offre renvoie vers le paiement déjà ouvert
  const reutilisable = await paiementEnCoursReutilisable(supabase, userData.gie_id, planId, moyenPaiement, montant)
  if (reutilisable) return reutilisable

  const { data: payment, error: insertError } = await supabase
    .from('abonnement_paiements')
    .insert({
      gie_id: userData.gie_id,
      niveau: planId,
      montant,
      provider: providerInitial,
      moyen_paiement: dbMoyenPaiement,
      devise,
      statut: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !payment) {
    if (insertError?.code === '23505') {
      const concurrent = await paiementEnCoursReutilisable(supabase, userData.gie_id, planId, moyenPaiement, montant)
      if (concurrent) return concurrent
      return { ok: false, error: 'Un paiement est déjà en cours pour votre pharmacie. Patientez quelques secondes puis réessayez.' }
    }
    console.error('Erreur création paiement abonnement', insertError)
    return { ok: false, error: "Impossible d'initier le paiement" }
  }

  if (moyenPaiement === 'virement') {
    return { ok: true, virement: true, paymentId: payment.id }
  }

  const returnUrl = `${siteUrl}/checkout/retour?ref=${payment.id}`
  const description = `Abonnement D-PHARMA — forfait ${planId}`

  if (isCarte) {
    const result = await initiateMonerooPayment({
      amount: montant,
      currency: devise,
      description,
      reference: payment.id,
      returnUrl,
      cancelUrl: returnUrl,
      customerEmail: user.email || '',
    })

    if (!result.ok) {
      await supabase.from('abonnement_paiements').update({ statut: 'failed' }).eq('id', payment.id)
      return { ok: false, error: result.error }
    }

    await supabase
      .from('abonnement_paiements')
      .update({ provider: 'moneroo', provider_reference: result.providerTransactionId, checkout_url: result.checkoutUrl })
      .eq('id', payment.id)

    return { ok: true, checkoutUrl: result.checkoutUrl }
  }

  // PAIEMENT MOBILE : 1. Maketou en premier, 2. Chariow prend le relais en réserve en cas de défaillance
  let maketouErrorDetail = ''

  // Étape 1 : Essai avec Maketou
  try {
    const { data: produitMaketou } = await createAdminClient()
      .from('maketou_produits')
      .select('product_id')
      .eq('montant', montant)
      .maybeSingle()

    const maketouProductId = produitMaketou?.product_id || process.env.MAKETOU_PRODUCT_ID || null

    if (maketouProductId) {
      const maketouRes = await initiateMaketouPayment({
        productId: maketouProductId,
        reference: payment.id,
        phoneLocal: phoneLocal || '',
        countryCode: gie?.pays && gie.pays !== 'AUTRE' ? gie.pays : 'SN',
        customerEmail: user.email || '',
        returnUrl,
        montantAttendu: montant,
      })

      if (maketouRes.ok) {
        await supabase
          .from('abonnement_paiements')
          .update({
            provider: 'maketou',
            provider_reference: maketouRes.providerTransactionId,
            checkout_url: maketouRes.checkoutUrl,
          })
          .eq('id', payment.id)

        return { ok: true, checkoutUrl: maketouRes.checkoutUrl }
      } else {
        maketouErrorDetail = maketouRes.error
        console.warn('[Paiement Mobile] Maketou a échoué:', maketouRes.error, '-> Bascule immédiate sur Chariow en réserve...')
      }
    } else {
      maketouErrorDetail = 'Aucun produit Maketou configuré pour ce montant'
      console.warn('[Paiement Mobile] Produit Maketou absent pour', montant, '-> Relais Chariow...')
    }
  } catch (err: any) {
    maketouErrorDetail = err?.message || 'Erreur inconnue Maketou'
    console.warn('[Paiement Mobile] Exception Maketou:', maketouErrorDetail, '-> Relais Chariow...')
  }

  // Étape 2 : Chariow prend le relais en cas de défaillance ou indisponibilité de Maketou
  try {
    const { data: produitChariow } = await createAdminClient()
      .from('chariow_produits')
      .select('product_id')
      .eq('montant', montant)
      .maybeSingle()

    const chariowProductId = produitChariow?.product_id || process.env.CHARIOW_PRODUCT_ID || null

    if (chariowProductId) {
      const chariowRes = await initiateChariowPayment({
        productId: chariowProductId,
        montantAttendu: montant,
        reference: payment.id,
        phoneLocal: phoneLocal || '',
        countryCode: gie?.pays && gie.pays !== 'AUTRE' ? gie.pays : 'SN',
        customerEmail: user.email || '',
        returnUrl,
      })

      if (chariowRes.ok) {
        await supabase
          .from('abonnement_paiements')
          .update({
            provider: 'chariow',
            provider_reference: chariowRes.providerTransactionId,
            checkout_url: chariowRes.checkoutUrl,
          })
          .eq('id', payment.id)

        return { ok: true, checkoutUrl: chariowRes.checkoutUrl }
      } else {
        console.error('[Paiement Mobile] Échec Chariow:', chariowRes.error)
        await supabase.from('abonnement_paiements').update({ statut: 'failed' }).eq('id', payment.id)
        return {
          ok: false,
          error: `Le paiement mobile a rencontré un problème (Maketou: ${maketouErrorDetail} | Chariow: ${chariowRes.error}). Veuillez réessayer ou utiliser le virement bancaire.`
        }
      }
    } else {
      await supabase.from('abonnement_paiements').update({ statut: 'failed' }).eq('id', payment.id)
      return {
        ok: false,
        error: `Paiement mobile non disponible pour ce montant (${maketouErrorDetail}).`
      }
    }
  } catch (err: any) {
    console.error('[Paiement Mobile] Exception Chariow:', err)
    await supabase.from('abonnement_paiements').update({ statut: 'failed' }).eq('id', payment.id)
    return { ok: false, error: `Erreur lors de l'initialisation du paiement mobile: ${err.message}` }
  }
}

// Au-delà, une page de paiement prestataire est considérée expirée : on en ouvre une nouvelle.
const DUREE_REUTILISATION_MS = 30 * 60 * 1000

/**
 * Paiement en cours du GIE (au plus un, cf. index unique de la migration 36) :
 * - même offre (forfait, moyen, montant) et encore récent → on le renvoie tel quel ;
 * - sinon il est marqué abandonné (il reste 'pending' : s'il est payé plus tard,
 *   le webhook le traite et le marque doublon si besoin) et on laisse en créer un neuf.
 */
async function paiementEnCoursReutilisable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  gieId: string,
  niveau: string,
  moyenPaiement: MoyenPaiement,
  montant: number
): Promise<InitiateResult | null> {
  const { data: enCours } = await supabase
    .from('abonnement_paiements')
    .select('id, niveau, moyen_paiement, montant, checkout_url, created_at')
    .eq('gie_id', gieId)
    .eq('statut', 'pending')
    .is('abandonne_le', null)
    .maybeSingle()

  if (!enCours) return null

  const memeOffre = enCours.niveau === niveau && enCours.moyen_paiement === moyenPaiement && Number(enCours.montant) === montant
  if (memeOffre && moyenPaiement === 'virement') {
    // Virement déjà déclaré pour cette offre : il attend la confirmation de réception des fonds.
    return { ok: true, virement: true, paymentId: enCours.id }
  }
  const recent = enCours.created_at && Date.now() - new Date(enCours.created_at).getTime() < DUREE_REUTILISATION_MS
  if (memeOffre && recent && enCours.checkout_url) {
    return { ok: true, checkoutUrl: enCours.checkout_url }
  }

  await supabase
    .from('abonnement_paiements')
    .update({ abandonne_le: new Date().toISOString() })
    .eq('id', enCours.id)
  return null
}
