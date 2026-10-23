import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getTenantContext } from '@/utils/supabase/tenant'
import { getDictionary, getLocale } from '@/dictionaries'
import ParametresForm from './ParametresForm'
import CollaborateursSection, { type CollaborateurItem } from './CollaborateursSection'
import type { PermissionMap } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export default async function ParametresPage() {
  const tenant = await getTenantContext()
  if (!tenant) redirect('/login')

  const supabase = await createClient()
  const dict = await getDictionary(await getLocale())
  const t = dict.parametres

  const { data: gie } = await supabase
    .from('gies')
    .select('nom, adresse, telephone, email, identification, devise, logo_url, region, ville, commune, telephone_whatsapp, horaires, est_de_garde')
    .eq('id', tenant.gieId)
    .single()

  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const menuLayout = (cookieStore.get('menu_layout')?.value === 'horizontal' ? 'horizontal' : 'sidebar') as 'sidebar' | 'horizontal'

  let collaborateurs: CollaborateurItem[] = []
  if (tenant.role === 'admin') {
    try {
      const adminSupabase = createAdminClient()
      const [{ data: usersData }, { data: authUsers }] = await Promise.all([
        adminSupabase
          .from('utilisateurs')
          .select('id, role, permissions, identifiant, telephone, nom_complet')
          .eq('gie_id', tenant.gieId)
          .order('created_at', { ascending: true }),
        adminSupabase.auth.admin.listUsers({ perPage: 1000 }),
      ])
      const emailById = new Map(authUsers?.users.map((u) => [u.id, u.email ?? null]) ?? [])

      collaborateurs = (usersData ?? []).map((u) => ({
        id: u.id,
        role: u.role,
        permissions: (u.permissions as PermissionMap | null) ?? null,
        identifiant: u.identifiant,
        telephone: u.telephone,
        nom_complet: u.nom_complet,
        email: emailById.get(u.id) ?? null,
      }))
    } catch (e) {
      console.error('Erreur chargement collaborateurs:', e)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold font-heading text-foreground mb-2">{t.title}</h1>
      <p className="text-sm text-foreground-muted mb-8">{t.subtitle}</p>

      <ParametresForm
        dict={dict}
        menuLayout={menuLayout}
        gie={{
          nom: gie?.nom ?? '',
          adresse: gie?.adresse ?? '',
          telephone: gie?.telephone ?? '',
          email: gie?.email ?? '',
          identification: gie?.identification ?? '',
          devise: gie?.devise ?? 'XOF',
          logoUrl: gie?.logo_url ?? null,
          region: gie?.region ?? 'Dakar',
          ville: gie?.ville ?? 'Dakar',
          commune: gie?.commune ?? '',
          telephoneWhatsapp: gie?.telephone_whatsapp ?? '',
          horaires: gie?.horaires ?? '8h00 - 22h00',
          estDeGarde: !!gie?.est_de_garde,
        }}
      />

      {tenant.role === 'admin' && (
        <CollaborateursSection
          collaborateurs={collaborateurs}
          currentUserId={tenant.userId}
        />
      )}
    </div>
  )
}

