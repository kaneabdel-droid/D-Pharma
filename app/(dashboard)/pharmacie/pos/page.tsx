import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import PointDeVenteClient from './PointDeVenteClient'

export const metadata = {
  title: 'Point de Vente | D-PHARMA',
}

import { getLocale, getDictionary } from '@/dictionaries'

export default async function POSPage() {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const tPos: any = dict.pharmacie?.pos || {}

  // Récupérer le catalogue de médicaments avec le stock disponible pour le GIE (Pharmacie) actuel.
  const { data: stocks, error } = await supabase
    .from('stocks_pharmacie')
    .select(`
      id,
      quantite,
      prix_vente,
      date_peremption,
      medicaments!inner (
        id,
        nom,
        code_barres
      )
    `)
    .order('date_peremption', { ascending: true })

  // Reformater les données pour le client
  const initialMedicaments = (stocks || []).map((stock: any) => ({
    id: stock.medicaments.id,
    nom: stock.medicaments.nom,
    code_barres: stock.medicaments.code_barres,
    prix_vente: stock.prix_vente,
    quantite_stock: stock.quantite,
    date_peremption: stock.date_peremption
  }))

  // Agréger s'il y a plusieurs lots pour le même médicament
  const aggregatedMedicaments = Object.values(
    initialMedicaments.reduce((acc, curr) => {
      if (!acc[curr.id]) {
        acc[curr.id] = { ...curr }
      } else {
        acc[curr.id].quantite_stock += curr.quantite_stock
      }
      return acc
    }, {} as Record<string, typeof initialMedicaments[0]>)
  )

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto min-w-0">
          <h2 className="text-2xl font-bold font-heading text-foreground break-words">{tPos.title || 'Point de Vente (Caisse)'}</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            {tPos.subtitle || 'Scannez ou recherchez un médicament pour l\'ajouter au panier.'}
          </p>
        </div>
      </div>

      <PointDeVenteClient initialMedicaments={aggregatedMedicaments} t={tPos} locale={locale} />
    </div>
  )
}
