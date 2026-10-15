'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { determinerPrioriteProximite } from '@/lib/geo-regions'

export type ResultatPharmacie = {
  pharmacie_id: string
  pharmacie_nom: string
  region: string
  ville: string
  commune: string
  adresse: string
  telephone: string
  telephone_whatsapp?: string
  horaires?: string
  est_de_garde: boolean
  service_urgence: boolean
  medicament_nom: string
  en_stock: boolean
  distanceKm?: number
  priorite: 1 | 2 | 3 | 4
  prioriteLabel: string
}

export type CriteresRecherche = {
  searchTerm: string
  userRegion: string
  userVille: string
  userCommune?: string
  userLat?: number | null
  userLng?: number | null
  deGardeOnly?: boolean
}

/**
 * Action serveur publique pour la recherche déontologique de médicaments.
 * Conformément au code de déontologie pharmaceutique :
 * - Les prix unitaires et quantités d'inventaire numériques ne sont JAMAIS transmis au client.
 * - Seul l'indicateur binaire de disponibilité (en stock / non périmé) et les coordonnées de contact sont renvoyés.
 * - Le classement priorise strictement la ville de l'utilisateur, puis les localités les plus proches de sa région.
 */
export async function rechercherMedicamentsPublic(criteres: CriteresRecherche): Promise<{
  success: boolean
  data?: ResultatPharmacie[]
  error?: string
}> {
  const {
    searchTerm,
    userRegion,
    userVille,
    userCommune,
    userLat,
    userLng,
    deGardeOnly = false,
  } = criteres

  if (!searchTerm || !searchTerm.trim()) {
    return { success: true, data: [] }
  }

  try {
    const supabase = createAdminClient()
    const cleanSearch = searchTerm.trim()

    // 1. Rechercher les médicaments correspondants
    const { data: medicaments, error: medError } = await supabase
      .from('medicaments')
      .select('id, nom, principe_actif')
      .or(`nom.ilike.%${cleanSearch}%,principe_actif.ilike.%${cleanSearch}%`)
      .limit(8)

    if (medError) throw medError

    if (!medicaments || medicaments.length === 0) {
      return { success: true, data: [] }
    }

    const medIds = medicaments.map((m) => m.id)
    const today = new Date().toISOString().split('T')[0]

    // 2. Trouver les stocks valides et non périmés
    const { data: stocks, error: stockError } = await supabase
      .from('stocks_pharmacie')
      .select(`
        medicament_id,
        quantite,
        date_peremption,
        medicaments (nom),
        gies (
          id,
          nom,
          region,
          ville,
          commune,
          adresse,
          telephone,
          telephone_whatsapp,
          latitude,
          longitude,
          horaires,
          est_de_garde,
          service_urgence,
          abonnement_statut,
          compte_verrouille
        )
      `)
      .in('medicament_id', medIds)
      .gt('quantite', 0)
      .gt('date_peremption', today)

    if (stockError) throw stockError

    if (!stocks || stocks.length === 0) {
      return { success: true, data: [] }
    }

    // 3. Formater, filtrer et hiérarchiser selon la localisation demandée
    const mapped: ResultatPharmacie[] = []
    const dejaVus = new Set<string>()

    for (const item of stocks) {
      const gie = (item as any).gies
      const med = (item as any).medicaments

      if (!gie || gie.compte_verrouille) continue
      if (deGardeOnly && !gie.est_de_garde) continue

      const cleUnique = `${gie.id}-${med?.nom || item.medicament_id}`
      if (dejaVus.has(cleUnique)) continue
      dejaVus.add(cleUnique)

      // Calcul de la priorité (1: Dans sa ville, 2: Localités proches, 3: Région, 4: Autre)
      const proximity = determinerPrioriteProximite({
        pharmaRegion: gie.region,
        pharmaVille: gie.ville,
        pharmaCommune: gie.commune,
        pharmaLat: gie.latitude ? Number(gie.latitude) : null,
        pharmaLng: gie.longitude ? Number(gie.longitude) : null,
        userRegion: userRegion || 'Dakar',
        userVille: userVille || 'Dakar',
        userCommune: userCommune,
        userLat: userLat,
        userLng: userLng,
      })

      mapped.push({
        pharmacie_id: gie.id,
        pharmacie_nom: gie.nom || 'Pharmacie',
        region: gie.region || 'Dakar',
        ville: gie.ville || 'Dakar',
        commune: gie.commune || gie.ville || '',
        adresse: gie.adresse || 'Adresse disponible par téléphone',
        telephone: gie.telephone || '',
        telephone_whatsapp: gie.telephone_whatsapp || gie.telephone || '',
        horaires: gie.horaires || '8h00 - 22h00',
        est_de_garde: !!gie.est_de_garde,
        service_urgence: !!gie.service_urgence,
        medicament_nom: med?.nom || 'Médicament',
        en_stock: true,
        distanceKm: proximity.distanceKm,
        priorite: proximity.priorite,
        prioriteLabel: proximity.prioriteLabel,
      })
    }

    // 4. Tri par priorité absolue (Ville en 1er, puis localités les plus proches, puis région)
    mapped.sort((a, b) => {
      // 1ère clé : Priorité (1 < 2 < 3 < 4)
      if (a.priorite !== b.priorite) {
        return a.priorite - b.priorite
      }
      // 2ème clé : Si distances disponibles, tri par proximité kilométrique croissante
      if (a.distanceKm != null && b.distanceKm != null) {
        return a.distanceKm - b.distanceKm
      }
      if (a.distanceKm != null) return -1
      if (b.distanceKm != null) return 1

      // 3ème clé : Prioriser les pharmacies de garde en cas d'urgence
      if (a.est_de_garde !== b.est_de_garde) {
        return a.est_de_garde ? -1 : 1
      }

      // 4ème clé : Ordre alphabétique
      return a.pharmacie_nom.localeCompare(b.pharmacie_nom, 'fr')
    })

    return { success: true, data: mapped }
  } catch (err: any) {
    console.error('Erreur recherche medicament:', err)
    return {
      success: false,
      error: err.message || 'Erreur lors de la recherche du médicament',
    }
  }
}
