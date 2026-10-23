'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getTenantContext } from '@/utils/supabase/tenant'
import { estDeviseValide } from '@/lib/currency'
import { requirePermission } from '@/utils/supabase/permissions'
import { sanitizePermissions, type PermissionMap } from '@/lib/permissions'

type ActionResult = { success?: true; error?: string; logoUrl?: string }

export async function updateGieInfos(formData: FormData): Promise<ActionResult> {
  const denied = await requirePermission('parametres', 'update')
  if (denied) return denied as never
  const tenant = await getTenantContext()
  if (!tenant) return { error: 'Non autorisé' }
  const supabase = await createClient()

  const nom = (formData.get('nom') as string)?.trim()
  const adresse = (formData.get('adresse') as string) ?? ''
  const telephone = (formData.get('telephone') as string) ?? ''
  const telephoneWhatsapp = (formData.get('telephone_whatsapp') as string) ?? ''
  const email = (formData.get('email') as string) ?? ''
  const identification = (formData.get('identification') as string) ?? ''
  const devise = formData.get('devise') as string
  const region = (formData.get('region') as string) ?? 'Dakar'
  const ville = (formData.get('ville') as string) ?? 'Dakar'
  const commune = (formData.get('commune') as string) ?? ''
  const horaires = (formData.get('horaires') as string) ?? '8h00 - 22h00'
  const estDeGarde = formData.get('est_de_garde') === 'on' || formData.get('est_de_garde') === 'true'

  if (!nom) return { error: 'Le nom est requis' }
  if (!estDeviseValide(devise)) return { error: 'Devise invalide' }

  const { error } = await supabase.rpc('update_gie_infos_geo', {
    p_nom: nom,
    p_adresse: adresse,
    p_telephone: telephone,
    p_telephone_whatsapp: telephoneWhatsapp,
    p_email: email,
    p_identification: identification,
    p_devise: devise,
    p_region: region,
    p_ville: ville,
    p_commune: commune,
    p_horaires: horaires,
    p_est_de_garde: estDeGarde,
  })
  if (error) return { error: error.message }

  const menuLayout = formData.get('menu_layout') as string
  if (menuLayout === 'horizontal' || menuLayout === 'sidebar') {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    cookieStore.set('menu_layout', menuLayout, { path: '/', maxAge: 31536000 })
  }

  revalidatePath('/parametres')
  revalidatePath('/', 'layout')
  return { success: true }
}

// Upload distinct de la mise à jour du formulaire : le logo se remplace
// indépendamment des autres champs via update_gie_logo, une fois l'upload
// Storage terminé et l'URL publique connue.
export async function uploadLogo(formData: FormData): Promise<ActionResult> {
  const denied = await requirePermission('parametres', 'update')
  if (denied) return denied as never
  const tenant = await getTenantContext()
  if (!tenant) return { error: 'Non autorisé' }
  const supabase = await createClient()

  const file = formData.get('logo') as File | null
  if (!file || file.size === 0) return { error: 'Aucun fichier sélectionné' }
  if (!file.type.startsWith('image/')) return { error: 'Le fichier doit être une image' }
  if (file.size > 2 * 1024 * 1024) return { error: 'Image trop volumineuse (max 2 Mo)' }

  const extension = file.name.split('.').pop() || 'png'
  const path = `${tenant.gieId}/logo.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) return { error: uploadError.message }

  const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(path)
  const logoUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

  const { error: rpcError } = await supabase.rpc('update_gie_logo', { p_logo_url: logoUrl })
  if (rpcError) return { error: rpcError.message }

  revalidatePath('/parametres')
  return { success: true, logoUrl }
}

function normaliserIdentifiant(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_.-]/g, '_')
}

function genererEmailSynthetique(identifiant: string, gieId: string): string {
  const prefix = gieId.replace(/-/g, '').slice(0, 8)
  return `${identifiant}.${prefix}@collab.dpharma.local`
}

export async function creerCollaborateur(formData: FormData): Promise<{
  success?: boolean
  error?: string
  collaborateur?: {
    id: string
    identifiant: string
    nom_complet: string | null
    telephone: string | null
    role: string
  }
}> {
  try {
    const tenant = await getTenantContext()
    if (!tenant || tenant.role !== 'admin') {
      return { error: "Seul le pharmacien titulaire (administrateur) peut ajouter des collaborateurs." }
    }

    const rawIdentifiant = (formData.get('identifiant') as string)?.trim()
    const nomComplet = (formData.get('nom_complet') as string)?.trim() || null
    const telephone = (formData.get('telephone') as string)?.trim() || null
    const emailInput = (formData.get('email') as string)?.trim() || ''
    const password = (formData.get('password') as string) || ''
    const roleInput = ((formData.get('role') as string)?.trim()) || 'pharmacien_assistant'
    const customRole = ((formData.get('role_custom') as string)?.trim()) || ''
    const role = roleInput === 'autre' && customRole ? customRole : roleInput
    const rawPerms = formData.get('permissions') as string | null

    if (!rawIdentifiant) {
      return { error: "L'identifiant ou numéro de téléphone est obligatoire." }
    }

    const identifiant = normaliserIdentifiant(rawIdentifiant)
    if (identifiant.length < 3) {
      return { error: "L'identifiant doit comporter au moins 3 caractères." }
    }

    if (!password || password.length < 6) {
      return { error: 'Le mot de passe doit comporter au moins 6 caractères.' }
    }

    let permissions: PermissionMap | null = null
    if (rawPerms) {
      try {
        permissions = sanitizePermissions(JSON.parse(rawPerms))
      } catch {}
    }

    const authEmail = emailInput ? emailInput.toLowerCase() : genererEmailSynthetique(identifiant, tenant.gieId)
    const adminSupabase = createAdminClient()

    // 1. Vérification unicité identifiant / téléphone au sein de la pharmacie
    const cleanPhone = telephone ? telephone.replace(/[^0-9+]/g, '') : null
    let existantQuery = adminSupabase.from('utilisateurs').select('id').eq('gie_id', tenant.gieId)
    if (cleanPhone && cleanPhone.length >= 6) {
      existantQuery = existantQuery.or(`identifiant.ilike.${identifiant},telephone.ilike.%${cleanPhone}%`)
    } else {
      existantQuery = existantQuery.ilike('identifiant', identifiant)
    }

    const { data: existant } = await existantQuery.limit(1).maybeSingle()
    if (existant) {
      const { data: authCheck } = await adminSupabase.auth.admin.getUserById(existant.id)
      if (!authCheck?.user) {
        await adminSupabase.from('utilisateurs').delete().eq('id', existant.id)
      } else {
        return { error: 'Cet identifiant ou numéro de téléphone est déjà attribué à un collaborateur.' }
      }
    }

    // 2. Création auth.users
    let authCreatedUser: { id: string } | null = null
    const { data: authCreated, error: authError } = await adminSupabase.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: {
        existing_gie_id: tenant.gieId,
        role,
        identifiant,
        telephone,
        nom_complet: nomComplet,
      },
    })

    if (authError) {
      return { error: `Échec de création du compte : ${authError.message}` }
    } else if (authCreated?.user) {
      authCreatedUser = authCreated.user
    }

    if (!authCreatedUser) {
      return { error: 'Impossible de finaliser la création du compte.' }
    }

    // 3. Mise à jour / insertion dans public.utilisateurs
    const { data: existingProfile } = await adminSupabase
      .from('utilisateurs')
      .select('id')
      .eq('id', authCreatedUser.id)
      .maybeSingle()

    if (!existingProfile) {
      await adminSupabase.from('utilisateurs').insert({
        id: authCreatedUser.id,
        gie_id: tenant.gieId,
        role,
        identifiant,
        telephone,
        nom_complet: nomComplet,
        permissions,
        actif: true,
      })
    } else {
      await adminSupabase
        .from('utilisateurs')
        .update({
          identifiant,
          telephone,
          nom_complet: nomComplet,
          role,
          permissions,
          actif: true,
        })
        .eq('id', authCreatedUser.id)
    }

    revalidatePath('/parametres')
    return {
      success: true,
      collaborateur: {
        id: authCreatedUser.id,
        identifiant,
        nom_complet: nomComplet,
        telephone,
        role,
      },
    }
  } catch (err: unknown) {
    console.error('Erreur inattendue dans creerCollaborateur:', err)
    const message = err instanceof Error ? err.message : 'Une erreur inattendue est survenue.'
    return { error: message }
  }
}

export async function supprimerCollaborateur(collaborateurId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const tenant = await getTenantContext()
    if (!tenant || tenant.role !== 'admin') {
      return { error: 'Action réservée au pharmacien titulaire.' }
    }

    if (collaborateurId === tenant.userId) {
      return { error: 'Vous ne pouvez pas révoquer votre propre compte administrateur.' }
    }

    const adminSupabase = createAdminClient()

    // Vérifier appartenance à la pharmacie
    const { data: cible } = await adminSupabase
      .from('utilisateurs')
      .select('id, role')
      .eq('id', collaborateurId)
      .eq('gie_id', tenant.gieId)
      .maybeSingle()

    if (!cible) {
      return { error: 'Collaborateur introuvable dans votre officine.' }
    }

    await adminSupabase.from('utilisateurs').delete().eq('id', collaborateurId).eq('gie_id', tenant.gieId)
    await adminSupabase.auth.admin.deleteUser(collaborateurId).catch(() => {})

    revalidatePath('/parametres')
    return { success: true }
  } catch (err: unknown) {
    console.error('Erreur inattendue dans supprimerCollaborateur:', err)
    return { error: err instanceof Error ? err.message : 'Erreur inattendue lors de la suppression.' }
  }
}

export async function modifierRoleEtPermissionsCollaborateur(formData: FormData): Promise<{
  success?: boolean
  error?: string
  role?: string
}> {
  try {
    const tenant = await getTenantContext()
    if (!tenant || tenant.role !== 'admin') {
      return { error: 'Action réservée au pharmacien titulaire.' }
    }

    const collaborateurId = formData.get('collaborateur_id') as string
    const roleInput = (formData.get('role') as string)?.trim() || 'pharmacien_assistant'
    const customRole = (formData.get('role_custom') as string)?.trim() || ''
    const role = roleInput === 'autre' && customRole ? customRole : roleInput
    const rawPerms = formData.get('permissions') as string | null

    let permissions: PermissionMap | null = null
    if (rawPerms) {
      try {
        permissions = sanitizePermissions(JSON.parse(rawPerms))
      } catch {}
    }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
      .from('utilisateurs')
      .update({ role, permissions })
      .eq('id', collaborateurId)
      .eq('gie_id', tenant.gieId)

    if (error) return { error: error.message }

    revalidatePath('/parametres')
    return { success: true, role }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erreur inattendue lors de la mise à jour.' }
  }
}

export async function genererLienResetCollaborateur(collaborateurId: string): Promise<{
  link?: string
  error?: string
}> {
  try {
    const tenant = await getTenantContext()
    if (!tenant || tenant.role !== 'admin') {
      return { error: 'Action réservée au pharmacien titulaire.' }
    }

    const adminSupabase = createAdminClient()
    const { data: userProfile } = await adminSupabase
      .from('utilisateurs')
      .select('id, identifiant')
      .eq('id', collaborateurId)
      .eq('gie_id', tenant.gieId)
      .maybeSingle()

    if (!userProfile) return { error: 'Collaborateur introuvable.' }

    const { data: authUser } = await adminSupabase.auth.admin.getUserById(collaborateurId)
    if (!authUser?.user?.email) {
      return { error: "Adresse d'authentification introuvable pour ce compte." }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://d-pharma.dembasolution.com'
    const { data: linkData, error: linkErr } = await adminSupabase.auth.admin.generateLink({
      type: 'recovery',
      email: authUser.user.email,
      options: {
        redirectTo: `${siteUrl}/update-password`,
      },
    })

    if (linkErr || !linkData?.properties?.action_link) {
      return { error: linkErr?.message || 'Impossible de générer le lien de réinitialisation.' }
    }

    return { link: linkData.properties.action_link }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erreur inattendue.' }
  }
}

