'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { pageSuivante, suitePaiement } from '@/lib/suite'
import { AUTRE_PAYS, PAYS_PAR_DEFAUT, trouverPays } from '@/lib/pays'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // Détection dynamique et fiable de l'origine (hôte et protocole réels)
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || 'localhost:3000'
  const proto = headerList.get('x-forwarded-proto') || 'http'
  const currentOrigin = `${proto}://${host}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || currentOrigin

  // Forfait par défaut : pharmacie (suppression standard/medium/premium)
  const rawPlan = (formData.get('plan') as string) || 'pharmacie'
  const plan = (rawPlan === 'fournisseur') ? 'fournisseur' : 'pharmacie'

  const email = (formData.get('email') as string || '').trim().toLowerCase()
  const password = formData.get('password') as string
  const pharmacieNom = ((formData.get('gie_nom') as string) || (formData.get('pharmacie_nom') as string) || '').trim() || 'Ma Pharmacie'

  // Inscription depuis les tarifs ou la page de paiement : redirection vers la finalisation
  const suite = pageSuivante(formData.get('next')) ?? suitePaiement(plan) ?? `/checkout?plan=${plan}`

  // Pays de l'officine
  const codePays = (formData.get('pays') as string) || PAYS_PAR_DEFAUT
  const pays = trouverPays(codePays)
  const paysNom = ((formData.get('pays_nom') as string) || '').trim()

  if (!pays && codePays !== AUTRE_PAYS) {
    return redirect('/signup?message=' + encodeURIComponent('Pays invalide'))
  }
  if (codePays === AUTRE_PAYS && !paysNom) {
    return redirect('/signup?message=' + encodeURIComponent('Indiquez le nom de votre pays') + (suite ? '&next=' + encodeURIComponent(suite) : ''))
  }

  const data = {
    email,
    password,
    options: {
      data: {
        gie_nom: pharmacieNom,
        pharmacie_nom: pharmacieNom,
        plan,
        pays: codePays,
        pays_nom: pays ? pays.nom : paysNom,
        devise: pays ? pays.devise : 'AUCUNE',
      },
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(suite)}`,
    }
  }

  const { data: inscription, error } = await supabase.auth.signUp(data)

  if (error) {
    return redirect('/signup?message=' + encodeURIComponent(error.message))
  }

  // Auto-confirmation immédiate pour éviter tout problème de lien ERR_CONNECTION_REFUSED
  if (inscription?.user) {
    try {
      const admin = createAdminClient()
      await admin.auth.admin.updateUserById(inscription.user.id, {
        email_confirm: true,
      })

      // Connexion directe pour session immédiate
      const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (!loginErr && loginData?.session) {
        return redirect(suite)
      }
    } catch (e: any) {
      console.warn('Auto-confirmation ou connexion directe post-inscription:', e?.message)
    }
  }

  if (inscription?.session) {
    return redirect(suite)
  }

  // Si jamais la session n'est pas ouverte
  const message = "Compte créé avec succès ! Connectez-vous pour accéder à votre espace."
  return redirect('/login?message=' + encodeURIComponent(message) + (suite ? '&next=' + encodeURIComponent(suite) : ''))
}
