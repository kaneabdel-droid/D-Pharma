import { redirect } from 'next/navigation'
import { getTenantContext } from '@/utils/supabase/tenant'
import ClientLayout from './ClientLayout'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  if (tenant.compteVerrouille || tenant.essaiExpire) {
    redirect('/abonnement?essai_expire=1')
  }

  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const menuLayout = (cookieStore.get('menu_layout')?.value === 'horizontal' ? 'horizontal' : 'sidebar') as 'sidebar' | 'horizontal'

  const locale = await getLocale()
  const dict = await getDictionary(locale)

  return (
    <ClientLayout
      subscriptionTier={tenant.subscriptionTier}
      role={tenant.role}
      permissions={tenant.permissions}
      gieName={tenant.gieName}
      devise={tenant.devise}
      dict={dict}
      locale={locale}
      menuLayout={menuLayout}
    >
      {children}
    </ClientLayout>
  )
}
