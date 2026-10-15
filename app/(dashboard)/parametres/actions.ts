'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import { estDeviseValide } from '@/lib/currency'
import { requirePermission } from '@/utils/supabase/permissions'

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
