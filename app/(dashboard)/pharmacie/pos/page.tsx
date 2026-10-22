import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import PointDeVenteClient from './PointDeVenteClient'
import { getLocale, getDictionary } from '@/dictionaries'

export const metadata = {
  title: 'Point de Vente | D-PHARMA',
}

export const dynamic = 'force-dynamic'

export default async function POSPage() {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const tPos: any = dict.pharmacie?.pos || {}

  if (!tenant) {
    return <div className="p-4 text-danger bg-danger/10 rounded-xl">Officine non identifiée.</div>
  }

  // 1. Récupération parallèle des stocks, comptes de trésorerie, clients et ventes récentes
  const [stocksRes, comptesRes, clientsRes, ventesRes] = await Promise.all([
    supabase
      .from('stocks_pharmacie')
      .select(`
        id,
        quantite,
        prix_vente,
        date_peremption,
        medicaments!inner (
          id,
          nom,
          code_barres,
          type_produit
        )
      `)
      .order('date_peremption', { ascending: true }),
    supabase
      .from('comptes')
      .select('id, nom, type')
      .eq('gie_id', tenant.gieId)
      .order('nom'),
    supabase
      .from('clients_externes')
      .select('id, nom, type_client, telephone, taux_couverture, plafond_credit, solde_creance')
      .eq('gie_id', tenant.gieId)
      .order('nom'),
    supabase
      .from('ventes_pharmacie')
      .select(`
        id,
        numero_ticket,
        montant_total,
        moyen_paiement,
        date_vente,
        statut,
        motif_annulation,
        date_annulation,
        part_patient,
        part_credit,
        compte_tresorerie_id,
        client_id,
        clients_externes (nom, telephone, type_client),
        comptes (nom),
        lignes_vente_pharmacie (
          id,
          quantite,
          prix_unitaire,
          medicaments (id, nom)
        )
      `)
      .eq('gie_id', tenant.gieId)
      .order('date_vente', { ascending: false })
      .limit(50),
  ])

  // Reformater le catalogue
  const initialMedicaments = (stocksRes.data || []).map((stock: any) => ({
    id: stock.medicaments.id,
    nom: stock.medicaments.nom,
    code_barres: stock.medicaments.code_barres,
    type_produit: stock.medicaments.type_produit || 'medicament',
    prix_vente: stock.prix_vente,
    quantite_stock: stock.quantite,
    date_peremption: stock.date_peremption,
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
    }, {} as Record<string, (typeof initialMedicaments)[0]>)
  )

  return (
    <div className="space-y-6">
      <PointDeVenteClient 
        initialMedicaments={aggregatedMedicaments} 
        comptes={comptesRes.data || []}
        clients={clientsRes.data || []}
        recentVentes={ventesRes.data || []}
        t={tPos} 
        locale={locale} 
      />
    </div>
  )
}
