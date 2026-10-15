'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  Search,
  MapPin,
  Pill,
  Navigation,
  Phone,
  MessageCircle,
  Clock,
  ShieldCheck,
  Building,
  SlidersHorizontal,
  Compass,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles
} from 'lucide-react'
import {
  REGIONS_SENEGAL,
  trouverLocalitePlusProche,
  calculerDistanceKm,
} from '@/lib/geo-regions'
import {
  rechercherMedicamentsPublic,
  type ResultatPharmacie,
} from './actions'

const MEDICAMENTS_FREQUENTS = [
  'Paracétamol',
  'Amoxicilline',
  'Augmentin',
  'Ibuprofène',
  'Artéméther',
  'Oméprazole',
  'Cétirizine',
]

export default function RechercheClient() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('Dakar')
  const [selectedVille, setSelectedVille] = useState('Dakar')
  const [selectedCommune, setSelectedCommune] = useState('')
  const [deGardeOnly, setDeGardeOnly] = useState(false)

  // Coordonnées GPS de l'utilisateur si géolocalisation acceptée
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [isGeolocating, setIsGeolocating] = useState(false)
  const [geoMessage, setGeoMessage] = useState<string | null>(null)

  // Résultats & état
  const [results, setResults] = useState<ResultatPharmacie[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [filterTab, setFilterTab] = useState<'all' | 'ville' | 'proches'>('all')
  const [isPending, startTransition] = useTransition()
  const [searchError, setSearchError] = useState<string | null>(null)

  // Villes et communes dynamiques selon la région sélectionnée
  const regionActuelle = REGIONS_SENEGAL.find((r) => r.nom === selectedRegion) || REGIONS_SENEGAL[0]
  const villesDisponibles = regionActuelle.villes
  const villeActuelle = villesDisponibles.find((v) => v.nom === selectedVille) || villesDisponibles[0]
  const communesDisponibles = villeActuelle?.communes || []

  // Mettre à jour la ville par défaut si on change de région
  const handleRegionChange = (newRegion: string) => {
    setSelectedRegion(newRegion)
    const reg = REGIONS_SENEGAL.find((r) => r.nom === newRegion)
    if (reg && reg.villes.length > 0) {
      setSelectedVille(reg.villes[0].nom)
      setSelectedCommune('')
    }
  }

  // Activer la géolocalisation automatique du navigateur
  const handleGeolocaliser = () => {
    if (!navigator.geolocation) {
      setGeoMessage('La géolocalisation n\'est pas supportée par votre navigateur.')
      return
    }

    setIsGeolocating(true)
    setGeoMessage(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserCoords({ lat: latitude, lng: longitude })

        // Détecter automatiquement la ville et la région la plus proche
        const plusProche = trouverLocalitePlusProche(latitude, longitude)
        setSelectedRegion(plusProche.region)
        setSelectedVille(plusProche.ville)
        setIsGeolocating(false)
        setGeoMessage(`Localisé à proximité de ${plusProche.ville} (${plusProche.region})`)

        // Relancer la recherche si un médicament était déjà recherché
        if (searchTerm.trim()) {
          executerRecherche({
            userLat: latitude,
            userLng: longitude,
            userReg: plusProche.region,
            userVil: plusProche.ville,
          })
        }
      },
      (error) => {
        setIsGeolocating(false)
        let msg = 'Impossible d\'obtenir votre position.'
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Autorisation GPS refusée. Veuillez sélectionner manuellement votre région et ville.'
        }
        setGeoMessage(msg)
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  // Exécution de la recherche
  const executerRecherche = (params?: {
    term?: string
    userLat?: number | null
    userLng?: number | null
    userReg?: string
    userVil?: string
    userCom?: string
    garde?: boolean
  }) => {
    const term = params?.term ?? searchTerm
    if (!term.trim()) return

    const reg = params?.userReg ?? selectedRegion
    const vil = params?.userVil ?? selectedVille
    const com = params?.userCom ?? selectedCommune
    const lat = params?.userLat !== undefined ? params.userLat : userCoords?.lat
    const lng = params?.userLng !== undefined ? params.userLng : userCoords?.lng
    const garde = params?.garde !== undefined ? params.garde : deGardeOnly

    setSearchError(null)
    setHasSearched(true)

    startTransition(async () => {
      const res = await rechercherMedicamentsPublic({
        searchTerm: term,
        userRegion: reg,
        userVille: vil,
        userCommune: com || undefined,
        userLat: lat,
        userLng: lng,
        deGardeOnly: garde,
      })

      if (res.success && res.data) {
        setResults(res.data)
      } else {
        setSearchError(res.error || 'Erreur lors de la recherche')
        setResults([])
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    executerRecherche()
  }

  const handleQuickSearch = (medName: string) => {
    setSearchTerm(medName)
    executerRecherche({ term: medName })
  }

  // Filtrage par onglet (Dans ma ville / Localités proches / Tous)
  const resultsFiltered = results.filter((r) => {
    if (filterTab === 'ville') return r.priorite === 1
    if (filterTab === 'proches') return r.priorite <= 2
    return true
  })

  // Séparation en groupes hiérarchiques pour l'affichage prioritaire
  const groupeDansVille = results.filter((r) => r.priorite === 1)
  const groupeProches = results.filter((r) => r.priorite === 2)
  const groupeAutres = results.filter((r) => r.priorite >= 3)

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Bannière Déontologique */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs sm:text-sm text-foreground-muted">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
          <span>
            <strong>Portail Déontologique D-PHARMA :</strong> Disponibilité transmise en temps réel. Les prix et quantités précises ne sont pas divulgués publiquement conformément à la législation pharmaceutique.
          </span>
        </div>
      </div>

      {/* Boîte Principale de Recherche & Localisation */}
      <div className="bg-surface rounded-3xl shadow-xl p-6 sm:p-10 border border-surface-border">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 text-primary rounded-2xl mb-4">
            <Pill className="w-7 h-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-heading text-foreground mb-3">
            Où trouver votre médicament ?
          </h1>
          <p className="text-foreground-muted text-sm sm:text-base">
            Localisez immédiatement la pharmacie la plus proche de chez vous ayant votre traitement en stock.
          </p>
        </div>

        {/* Barre de Localisation (Région > Ville > GPS) */}
        <div className="bg-background/80 rounded-2xl p-4 sm:p-5 border border-surface-border mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground-muted">
              <MapPin className="w-4 h-4 text-primary" />
              <span>Zone de recherche prioritaire</span>
            </div>

            {/* Bouton Géolocalisation GPS */}
            <button
              type="button"
              onClick={handleGeolocaliser}
              disabled={isGeolocating}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                userCoords
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                  : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20'
              }`}
              title="Utiliser ma position GPS"
            >
              <Navigation className={`w-3.5 h-3.5 ${isGeolocating ? 'animate-spin' : ''}`} />
              {isGeolocating ? 'Détection GPS...' : userCoords ? 'GPS Actif 📍' : 'Me géolocaliser'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Région */}
            <div>
              <label htmlFor="select-region" className="block text-xs font-medium text-foreground-muted mb-1">
                Région
              </label>
              <select
                id="select-region"
                value={selectedRegion}
                onChange={(e) => handleRegionChange(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent transition"
              >
                {REGIONS_SENEGAL.map((r) => (
                  <option key={r.code} value={r.nom}>
                    {r.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* Ville */}
            <div>
              <label htmlFor="select-ville" className="block text-xs font-medium text-foreground-muted mb-1">
                Ville / Département
              </label>
              <select
                id="select-ville"
                value={selectedVille}
                onChange={(e) => {
                  setSelectedVille(e.target.value)
                  setSelectedCommune('')
                }}
                className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent transition"
              >
                {villesDisponibles.map((v) => (
                  <option key={v.nom} value={v.nom}>
                    {v.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* Commune / Quartier (optionnel pour affiner) */}
            <div>
              <label htmlFor="select-commune" className="block text-xs font-medium text-foreground-muted mb-1">
                Commune / Quartier <span className="text-foreground-muted/60">(optionnel)</span>
              </label>
              <select
                id="select-commune"
                value={selectedCommune}
                onChange={(e) => setSelectedCommune(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-transparent transition"
              >
                <option value="">Toute la ville ({selectedVille})</option>
                {communesDisponibles.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {geoMessage && (
            <p className="mt-2 text-xs text-primary font-medium flex items-center gap-1.5 animate-fadeIn">
              <Compass className="w-3.5 h-3.5 shrink-0" />
              {geoMessage}
            </p>
          )}
        </div>

        {/* Formulaire de recherche du médicament */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-foreground-muted">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ex: Paracétamol, Amoxicilline, Augmentin, Ibuprofène..."
              className="block w-full pl-12 pr-28 sm:pr-36 py-4 rounded-2xl border-2 border-surface-border bg-background text-base sm:text-lg text-foreground focus:ring-4 focus:ring-primary/20 focus:border-primary shadow-inner transition-all placeholder:text-foreground-muted/60"
            />
            <button
              type="submit"
              disabled={isPending || !searchTerm.trim()}
              className="absolute inset-y-2 right-2 bg-primary text-white px-5 sm:px-8 rounded-xl font-bold hover:bg-primary-hover disabled:opacity-50 transition-all shadow-md flex items-center gap-2"
            >
              {isPending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Chercher'
              )}
            </button>
          </div>

          {/* Raccourcis médicaments populaires & Filtre Garde */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-foreground-muted font-medium">Populaires :</span>
              {MEDICAMENTS_FREQUENTS.map((med) => (
                <button
                  key={med}
                  type="button"
                  onClick={() => handleQuickSearch(med)}
                  className="px-2.5 py-1 rounded-lg bg-background hover:bg-primary/10 hover:text-primary text-foreground-muted border border-surface-border transition-colors font-medium"
                >
                  {med}
                </button>
              ))}
            </div>

            {/* Toggle de garde */}
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground select-none">
              <input
                type="checkbox"
                checked={deGardeOnly}
                onChange={(e) => {
                  setDeGardeOnly(e.target.checked)
                  if (searchTerm.trim()) {
                    executerRecherche({ garde: e.target.checked })
                  }
                }}
                className="rounded border-surface-border text-primary focus:ring-primary w-4 h-4"
              />
              <span>🌙 Pharmacie de garde uniquement</span>
            </label>
          </div>
        </form>
      </div>

      {/* Affichage des Résultats */}
      {hasSearched && (
        <div className="space-y-6 animate-fadeIn">
          {/* En-tête des résultats avec compteurs et onglets de filtres */}
          <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-surface-border flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold font-heading text-foreground flex items-center gap-2">
                <span>Disponibilité pour « {searchTerm} »</span>
                <span className="bg-primary/10 text-primary text-xs font-bold py-0.5 px-2.5 rounded-full">
                  {results.length} trouvée{results.length > 1 ? 's' : ''}
                </span>
              </h2>
              <p className="text-xs text-foreground-muted mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Localisation retenue : <strong>{selectedVille}</strong> ({selectedRegion})
              </p>
            </div>

            {/* Filtres rapides d'affichage */}
            <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-surface-border text-xs font-medium">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filterTab === 'all'
                    ? 'bg-primary text-white font-bold shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                Toutes ({results.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('ville')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filterTab === 'ville'
                    ? 'bg-primary text-white font-bold shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                Dans ma ville ({groupeDansVille.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('proches')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filterTab === 'proches'
                    ? 'bg-primary text-white font-bold shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                Localités proches ({groupeDansVille.length + groupeProches.length})
              </button>
            </div>
          </div>

          {searchError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl p-4 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {results.length === 0 ? (
            <div className="bg-surface rounded-2xl p-12 text-center border border-surface-border">
              <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4 text-foreground-muted">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold font-heading mb-2">Aucun résultat trouvé</h3>
              <p className="text-foreground-muted text-sm max-w-md mx-auto mb-6">
                Aucune pharmacie partenaire à <strong>{selectedVille}</strong> ou dans les localités voisines de <strong>{selectedRegion}</strong> n&apos;a actuellement de stock disponible pour « {searchTerm} ».
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRegionChange('Dakar')}
                  className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-semibold transition"
                >
                  Élargir la recherche à tout Dakar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeGardeOnly(false)
                    executerRecherche({ garde: false })
                  }}
                  className="px-4 py-2 bg-background hover:bg-surface border border-surface-border text-foreground-muted rounded-xl text-xs font-medium transition"
                >
                  Désactiver le filtre &quot;De garde&quot;
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* GROUPE 1 : DANS VOTRE VILLE (PRIORITÉ ABSOLUE) */}
              {(filterTab === 'all' || filterTab === 'ville' || filterTab === 'proches') && groupeDansVille.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-surface-border pb-2">
                    <h3 className="text-lg font-bold font-heading text-foreground flex items-center gap-2">
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      <span>Dans votre ville : {selectedVille}</span>
                      <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">
                        Priorité N°1 ({groupeDansVille.length})
                      </span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupeDansVille.map((pharma) => (
                      <PharmacyCard key={`${pharma.pharmacie_id}-${pharma.medicament_nom}`} pharma={pharma} />
                    ))}
                  </div>
                </div>
              )}

              {/* GROUPE 2 : LOCALITÉS LES PLUS PROCHES */}
              {(filterTab === 'all' || filterTab === 'proches') && groupeProches.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-surface-border pb-2 pt-4">
                    <h3 className="text-lg font-bold font-heading text-foreground flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-amber-500" />
                      <span>Localités les plus proches (Région {selectedRegion})</span>
                      <span className="text-xs font-semibold bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">
                        Communes voisines ({groupeProches.length})
                      </span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupeProches.map((pharma) => (
                      <PharmacyCard key={`${pharma.pharmacie_id}-${pharma.medicament_nom}`} pharma={pharma} />
                    ))}
                  </div>
                </div>
              )}

              {/* GROUPE 3 : AUTRES LOCALITÉS / RÉGION ÉLARGIE */}
              {filterTab === 'all' && groupeAutres.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-surface-border pb-2 pt-4">
                    <h3 className="text-lg font-bold font-heading text-foreground flex items-center gap-2">
                      <Building className="w-4 h-4 text-blue-500" />
                      <span>Autres pharmacies disponibles ({groupeAutres.length})</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupeAutres.map((pharma) => (
                      <PharmacyCard key={`${pharma.pharmacie_id}-${pharma.medicament_nom}`} pharma={pharma} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Carte de pharmacie optimisée avec boutons d'actions directes (Appel, WhatsApp, Itinéraire Maps)
 */
function PharmacyCard({ pharma }: { pharma: ResultatPharmacie }) {
  const cleanPhone = (pharma.telephone || '').replace(/[^0-9+]/g, '')
  const whatsappPhone = (pharma.telephone_whatsapp || pharma.telephone || '').replace(/[^0-9]/g, '')
  const whatsappMsg = encodeURIComponent(
    `Bonjour, j'ai vu sur la plateforme D-PHARMA que votre officine a le médicament "${pharma.medicament_nom}" en stock. Est-il toujours disponible s'il vous plaît ? Merci.`
  )
  const mapsQuery = encodeURIComponent(`${pharma.pharmacie_nom}, ${pharma.adresse}, ${pharma.ville}, Sénégal`)

  return (
    <div className="bg-surface rounded-2xl p-5 border border-surface-border hover:border-primary/40 hover:shadow-lg transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Badges d'état et de proximité */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            {pharma.priorite === 1 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" /> Dans votre ville
              </span>
            ) : pharma.priorite === 2 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                <Navigation className="w-3 h-3" /> Localité proche
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 border border-blue-500/20">
                {pharma.region}
              </span>
            )}

            {pharma.distanceKm != null && (
              <span className="text-xs font-semibold text-foreground-muted bg-background px-2 py-0.5 rounded-md border border-surface-border">
                À ~{pharma.distanceKm} km
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {pharma.est_de_garde && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                🌙 De garde
              </span>
            )}
            {pharma.service_urgence && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                24h/24
              </span>
            )}
          </div>
        </div>

        {/* Nom & Disponibilité */}
        <h4 className="text-lg font-bold font-heading text-foreground mb-1 group-hover:text-primary transition-colors">
          {pharma.pharmacie_nom}
        </h4>

        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>En stock : {pharma.medicament_nom}</span>
        </div>

        {/* Coordonnées & Horaires */}
        <div className="space-y-1.5 text-xs text-foreground-muted mb-5">
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <span>
              <strong>{pharma.commune ? `${pharma.commune}, ` : ''}{pharma.ville}</strong> ({pharma.region})
              {pharma.adresse && ` — ${pharma.adresse}`}
            </span>
          </div>

          {pharma.horaires && (
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
              <span>Horaires : {pharma.horaires}</span>
            </div>
          )}
        </div>
      </div>

      {/* Boutons d'Action (Appel, WhatsApp, Itinéraire Google Maps) */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-surface-border">
        {cleanPhone ? (
          <a
            href={`tel:${cleanPhone}`}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors shadow-sm text-center"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Appeler</span>
          </a>
        ) : (
          <button disabled className="px-3 py-2 rounded-xl bg-surface text-foreground-muted text-xs font-medium opacity-50 cursor-not-allowed">
            Tél. indisponible
          </button>
        )}

        {whatsappPhone ? (
          <a
            href={`https://wa.me/${whatsappPhone}?text=${whatsappMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm text-center"
            title="Poser une question via WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </a>
        ) : (
          <button disabled className="px-3 py-2 rounded-xl bg-surface text-foreground-muted text-xs font-medium opacity-50 cursor-not-allowed">
            WhatsApp
          </button>
        )}

        <a
          href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-background hover:bg-surface border border-surface-border text-foreground text-xs font-semibold transition-colors text-center"
          title="Ouvrir l'itinéraire dans Google Maps"
        >
          <ExternalLink className="w-3.5 h-3.5 text-primary" />
          <span>Itinéraire</span>
        </a>
      </div>
    </div>
  )
}
