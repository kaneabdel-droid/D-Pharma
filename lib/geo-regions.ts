/**
 * Référentiel géographique du Sénégal pour D-PHARMA
 * Structure les 14 régions administratives, leurs villes et communes principales,
 * et permet le calcul de proximité kilométrique et la priorisation (Ville -> Localités proches -> Région).
 */

export interface CommuneInfo {
  nom: string
  latitude?: number
  longitude?: number
}

export interface VilleInfo {
  nom: string
  communes: string[]
  latitude: number
  longitude: number
}

export interface RegionInfo {
  code: string
  nom: string
  villes: VilleInfo[]
  latitude: number
  longitude: number
}

export const REGIONS_SENEGAL: RegionInfo[] = [
  {
    code: 'DK',
    nom: 'Dakar',
    latitude: 14.7167,
    longitude: -17.4677,
    villes: [
      {
        nom: 'Dakar',
        latitude: 14.6937,
        longitude: -17.4441,
        communes: [
          'Dakar-Plateau',
          'Médina',
          'Fann-Point E-Amitié',
          'Gueule Tapée-Fass-Colobane',
          'Grand Dakar',
          'Biscuiterie',
          'HLM',
          'Hann Bel-Air',
          'Sicap-Liberté',
          'Mermoz-Sacré-Cœur',
          'Ouakam',
          'Ngor',
          'Yoff',
          'Almadies',
          'Grand Yoff',
          'Parcelles Assainies',
          'Patte d\'Oie',
          'Cambérène',
        ],
      },
      {
        nom: 'Pikine',
        latitude: 14.755,
        longitude: -17.398,
        communes: [
          'Pikine-Nord',
          'Pikine-Est',
          'Pikine-Ouest',
          'Dalifort',
          'Djidah Thiaroye Kao',
          'Guinaw Rails Nord',
          'Guinaw Rails Sud',
          'Thiaroye Gare',
          'Thiaroye-sur-mer',
          'Tivaouane Diacksao',
          'Diamaguène Sicap Mbao',
          'Mbao',
        ],
      },
      {
        nom: 'Guédiawaye',
        latitude: 14.77,
        longitude: -17.39,
        communes: [
          'Golf Sud',
          'Sam Notaire',
          'Ndiarème Limamoulaye',
          'Wakhinane Nimzatt',
          'Médina Gounass',
        ],
      },
      {
        nom: 'Keur Massar',
        latitude: 14.783,
        longitude: -17.31,
        communes: [
          'Keur Massar Nord',
          'Keur Massar Sud',
          'Malika',
          'Yeumbeul Nord',
          'Yeumbeul Sud',
          'Jaxaay-Parcelles',
        ],
      },
      {
        nom: 'Rufisque',
        latitude: 14.716,
        longitude: -17.272,
        communes: [
          'Rufisque-Centre',
          'Rufisque-Est',
          'Rufisque-Nord',
          'Rufisque-Ouest',
          'Bargny',
          'Sendou',
        ],
      },
      {
        nom: 'Diamniadio',
        latitude: 14.725,
        longitude: -17.18,
        communes: ['Diamniadio', 'Sébikotane', 'Yenne'],
      },
    ],
  },
  {
    code: 'TH',
    nom: 'Thiès',
    latitude: 14.79,
    longitude: -16.926,
    villes: [
      {
        nom: 'Thiès',
        latitude: 14.79,
        longitude: -16.926,
        communes: ['Thiès-Nord', 'Thiès-Est', 'Thiès-Ouest'],
      },
      {
        nom: 'Mbour',
        latitude: 14.422,
        longitude: -16.963,
        communes: ['Mbour-Centre', 'Saly Portudal', 'Somone', 'Ngaparou', 'Popenguine', 'Nianing'],
      },
      {
        nom: 'Tivaouane',
        latitude: 14.95,
        longitude: -16.816,
        communes: ['Tivaouane-Centre', 'Pire Goureye', 'Meckhe'],
      },
      {
        nom: 'Joal-Fadiouth',
        latitude: 14.166,
        longitude: -16.833,
        communes: ['Joal', 'Fadiouth', 'Ngaparou'],
      },
    ],
  },
  {
    code: 'DB',
    nom: 'Diourbel',
    latitude: 14.65,
    longitude: -16.233,
    villes: [
      {
        nom: 'Touba',
        latitude: 14.864,
        longitude: -15.875,
        communes: ['Touba Mosquée', 'Gouye Mbind', 'Darou Khoudoss', 'Darou Minam'],
      },
      {
        nom: 'Mbacké',
        latitude: 14.79,
        longitude: -15.908,
        communes: ['Mbacké-Centre', 'Mbacké-Kajoor'],
      },
      {
        nom: 'Diourbel',
        latitude: 14.65,
        longitude: -16.233,
        communes: ['Diourbel-Centre', 'Ndindy', 'Ndoulo'],
      },
      {
        nom: 'Bambey',
        latitude: 14.698,
        longitude: -16.45,
        communes: ['Bambey-Centre', 'Lambaye', 'Ngoye'],
      },
    ],
  },
  {
    code: 'SL',
    nom: 'Saint-Louis',
    latitude: 16.032,
    longitude: -16.504,
    villes: [
      {
        nom: 'Saint-Louis',
        latitude: 16.032,
        longitude: -16.504,
        communes: ['Île de Saint-Louis', 'Sor', 'Ndioloffène', 'Pikine Saint-Louis', 'Bango'],
      },
      {
        nom: 'Richard-Toll',
        latitude: 16.462,
        longitude: -15.7,
        communes: ['Richard-Toll', 'Rosso-Sénégal'],
      },
      {
        nom: 'Dagana',
        latitude: 16.516,
        longitude: -15.5,
        communes: ['Dagana-Centre', 'Gae'],
      },
      {
        nom: 'Podor',
        latitude: 16.65,
        longitude: -14.966,
        communes: ['Podor', 'Ndioum', 'Guédé'],
      },
    ],
  },
  {
    code: 'KL',
    nom: 'Kaolack',
    latitude: 14.15,
    longitude: -16.083,
    villes: [
      {
        nom: 'Kaolack',
        latitude: 14.15,
        longitude: -16.083,
        communes: ['Médina Baye', 'Léona', 'Kasnack', 'Bongré', 'Ndangane'],
      },
      {
        nom: 'Nioro du Rip',
        latitude: 13.75,
        longitude: -15.8,
        communes: ['Nioro', 'Paoskoto'],
      },
      {
        nom: 'Guinguinéo',
        latitude: 14.266,
        longitude: -15.95,
        communes: ['Guinguinéo', 'Mboss'],
      },
    ],
  },
  {
    code: 'FK',
    nom: 'Fatick',
    latitude: 14.333,
    longitude: -16.416,
    villes: [
      {
        nom: 'Fatick',
        latitude: 14.333,
        longitude: -16.416,
        communes: ['Fatick-Centre', 'Escale', 'Ndiaye Ndiaye'],
      },
      {
        nom: 'Foundiougne',
        latitude: 14.133,
        longitude: -16.466,
        communes: ['Foundiougne', 'Passy', 'Sokone', 'Toubacouta'],
      },
      {
        nom: 'Gossas',
        latitude: 14.5,
        longitude: -16.066,
        communes: ['Gossas-Centre', 'Colobane'],
      },
    ],
  },
  {
    code: 'ZG',
    nom: 'Ziguinchor',
    latitude: 12.583,
    longitude: -16.266,
    villes: [
      {
        nom: 'Ziguinchor',
        latitude: 12.583,
        longitude: -16.266,
        communes: ['Ziguinchor-Centre', 'Boukitingho', 'Kandé', 'Lindiane'],
      },
      {
        nom: 'Bignona',
        latitude: 12.81,
        longitude: -16.23,
        communes: ['Bignona', 'Tenghori'],
      },
      {
        nom: 'Oussouye',
        latitude: 12.483,
        longitude: -16.55,
        communes: ['Oussouye', 'Cap Skirring'],
      },
    ],
  },
  {
    code: 'LG',
    nom: 'Louga',
    latitude: 15.616,
    longitude: -16.216,
    villes: [
      {
        nom: 'Louga',
        latitude: 15.616,
        longitude: -16.216,
        communes: ['Louga-Centre', 'Montagne', 'Artillerie'],
      },
      {
        nom: 'Kébémer',
        latitude: 14.966,
        longitude: -16.45,
        communes: ['Kébémer', 'Guéoul'],
      },
      {
        nom: 'Linguère',
        latitude: 15.395,
        longitude: -15.119,
        communes: ['Linguère', 'Dahra Djoloff'],
      },
    ],
  },
  {
    code: 'TC',
    nom: 'Tambacounda',
    latitude: 13.766,
    longitude: -13.666,
    villes: [
      {
        nom: 'Tambacounda',
        latitude: 13.766,
        longitude: -13.666,
        communes: ['Tambacounda-Centre', 'Dépôt', 'Abattoirs'],
      },
      {
        nom: 'Bakel',
        latitude: 14.9,
        longitude: -12.45,
        communes: ['Bakel-Centre'],
      },
    ],
  },
  {
    code: 'KD',
    nom: 'Kolda',
    latitude: 12.883,
    longitude: -14.95,
    villes: [
      {
        nom: 'Kolda',
        latitude: 12.883,
        longitude: -14.95,
        communes: ['Kolda-Centre', 'Sikilo', 'Bouna Kane'],
      },
      {
        nom: 'Vélingara',
        latitude: 13.15,
        longitude: -14.116,
        communes: ['Vélingara-Centre'],
      },
    ],
  },
  {
    code: 'MT',
    nom: 'Matam',
    latitude: 15.65,
    longitude: -13.25,
    villes: [
      {
        nom: 'Matam',
        latitude: 15.65,
        longitude: -13.25,
        communes: ['Matam-Centre', 'Soubalo'],
      },
      {
        nom: 'Ourossogui',
        latitude: 15.6,
        longitude: -13.316,
        communes: ['Ourossogui-Centre'],
      },
    ],
  },
  {
    code: 'KF',
    nom: 'Kaffrine',
    latitude: 14.1,
    longitude: -15.55,
    villes: [
      {
        nom: 'Kaffrine',
        latitude: 14.1,
        longitude: -15.55,
        communes: ['Kaffrine-Centre', 'Birkelane', 'Koungheul'],
      },
    ],
  },
  {
    code: 'KG',
    nom: 'Kédougou',
    latitude: 12.55,
    longitude: -12.183,
    villes: [
      {
        nom: 'Kédougou',
        latitude: 12.55,
        longitude: -12.183,
        communes: ['Kédougou-Centre', 'Saraya', 'Salémata'],
      },
    ],
  },
  {
    code: 'SD',
    nom: 'Sédhiou',
    latitude: 12.7,
    longitude: -15.55,
    villes: [
      {
        nom: 'Sédhiou',
        latitude: 12.7,
        longitude: -15.55,
        communes: ['Sédhiou-Centre', 'Bounkiling', 'Goudomp'],
      },
    ],
  },
]

/**
 * Calcule la distance orthodromique (vol d'oiseau) en kilomètres entre deux coordonnées GPS
 * en utilisant la formule de Haversine.
 */
export function calculerDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10 // Arrondi au 10ème de km
}

/**
 * Identifie la région et la ville du Sénégal la plus proche à partir de coordonnées GPS
 */
export function trouverLocalitePlusProche(lat: number, lon: number): {
  region: string
  ville: string
  distanceKm: number
} {
  let minDistance = Infinity
  let meilleureRegion = 'Dakar'
  let meilleureVille = 'Dakar'

  for (const reg of REGIONS_SENEGAL) {
    for (const v of reg.villes) {
      const dist = calculerDistanceKm(lat, lon, v.latitude, v.longitude)
      if (dist < minDistance) {
        minDistance = dist
        meilleureRegion = reg.nom
        meilleureVille = v.nom
      }
    }
  }

  return {
    region: meilleureRegion,
    ville: meilleureVille,
    distanceKm: minDistance,
  }
}

/**
 * Calcule le niveau de priorité de proximité pour le classement d'une pharmacie :
 * - 1 : "Dans votre ville" (Priorité absolue)
 * - 2 : "Localité proche" (Commune voisine ou même région à courte distance)
 * - 3 : "Dans votre région"
 * - 4 : "Autre région"
 */
export function determinerPrioriteProximite(params: {
  pharmaRegion?: string | null
  pharmaVille?: string | null
  pharmaCommune?: string | null
  pharmaLat?: number | null
  pharmaLng?: number | null
  userRegion: string
  userVille: string
  userCommune?: string
  userLat?: number | null
  userLng?: number | null
}): {
  priorite: 1 | 2 | 3 | 4
  prioriteLabel: string
  distanceKm?: number
} {
  const {
    pharmaRegion,
    pharmaVille,
    pharmaCommune,
    pharmaLat,
    pharmaLng,
    userRegion,
    userVille,
    userCommune,
    userLat,
    userLng,
  } = params

  // 1. Distance GPS exacte si les deux coordonnées sont disponibles
  let distanceKm: number | undefined
  if (userLat != null && userLng != null && pharmaLat != null && pharmaLng != null) {
    distanceKm = calculerDistanceKm(userLat, userLng, Number(pharmaLat), Number(pharmaLng))
  }

  const pReg = (pharmaRegion || '').trim().toLowerCase()
  const uReg = (userRegion || '').trim().toLowerCase()
  const pVil = (pharmaVille || '').trim().toLowerCase()
  const uVil = (userVille || '').trim().toLowerCase()
  const pCom = (pharmaCommune || '').trim().toLowerCase()
  const uCom = (userCommune || '').trim().toLowerCase()

  // Match exact de commune ou de ville
  const memeCommune = uCom && pCom && uCom === pCom
  const memeVille = uVil && pVil && (uVil === pVil || pVil.includes(uVil) || uVil.includes(pVil))

  // Priorité 1 : Dans votre ville / commune
  if (memeCommune || memeVille || (distanceKm != null && distanceKm <= 3.5)) {
    return {
      priorite: 1,
      prioriteLabel: 'Dans votre ville',
      distanceKm,
    }
  }

  // Priorité 2 : Localités les plus proches (même région, ou distance < 15 km)
  const memeRegion = pReg && uReg && (pReg === uReg || pReg.includes(uReg) || uReg.includes(pReg))
  if (distanceKm != null && distanceKm <= 15) {
    return {
      priorite: 2,
      prioriteLabel: 'Localité proche',
      distanceKm,
    }
  }

  if (memeRegion) {
    return {
      priorite: 2,
      prioriteLabel: 'Localité voisine',
      distanceKm,
    }
  }

  // Priorité 3 : Même région élargie
  if (distanceKm != null && distanceKm <= 40) {
    return {
      priorite: 3,
      prioriteLabel: 'Région',
      distanceKm,
    }
  }

  // Priorité 4 : Autre région
  return {
    priorite: 4,
    prioriteLabel: pharmaRegion || 'Autre région',
    distanceKm,
  }
}
