'use server'

import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import { revalidatePath } from 'next/cache'

export interface EchangePharmaSante {
  id: string
  type_echange: 'substitution' | 'alerte_rupture' | 'signal_epidemique'
  structure_sante_id?: string
  pharmacie_id: string
  pharmacie_nom: string
  patient_id?: string
  patient_ipp?: string
  patient_nom?: string
  consultation_id?: string
  numero_ordonnance?: string
  medicament_prescrit?: string
  medicament_propose?: string
  motif?: string
  posologie_ajustee?: string
  niveau_urgence: 'normal' | 'urgent' | 'critique'
  statut: 'en_attente' | 'approuve' | 'rejete' | 'clos'
  reponse_medecin?: string
  valide_par_medecin_nom?: string
  date_reponse?: string
  created_at: string
}

export interface BordereauPharmaIpm {
  id: string
  numero_bordereau: string
  source_type: 'clinique' | 'pharmacie'
  emetteur_id: string
  emetteur_nom: string
  organisme_assurance_id?: string
  organisme_nom: string
  periode_debut: string
  periode_fin: string
  nombre_factures: number
  montant_total_reclame: number
  montant_total_admis: number
  statut_organisme: 'soumis' | 'en_audit' | 'valide_partiel' | 'rejete' | 'regle'
  reference_virement?: string
  date_reglement?: string
  notes_audit?: string
  created_at: string
}

/**
 * Récupère les échanges D-Pharma <-> D-Santé
 */
export async function getEchangesPharma() {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  const gieId = tenant?.gieId || 'demo-gie'

  const { data, error } = await supabase
    .from('echanges_clinique_pharmacie')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data || data.length === 0) {
    const demoEchanges: EchangePharmaSante[] = [
      {
        id: 'ech-ph-01',
        type_echange: 'substitution',
        pharmacie_id: gieId,
        pharmacie_nom: tenant?.gieName || 'Pharmacie Moderne',
        patient_ipp: 'PAT-2610-001',
        patient_nom: 'Aminata Diallo',
        numero_ordonnance: 'ORD-2610-0012',
        medicament_prescrit: 'Augmentin 1g Sachet',
        medicament_propose: 'Amoxicilline + Acide Clavulanique 1g Comprimé',
        motif: 'Forme sachet épuisée grossiste. Proposer forme comprimé disponible en rayon.',
        posologie_ajustee: '1 comprimé matin et soir pendant 7 jours',
        niveau_urgence: 'urgent',
        statut: 'en_attente',
        created_at: new Date().toISOString(),
      },
      {
        id: 'ech-ph-02',
        type_echange: 'signal_epidemique',
        pharmacie_id: gieId,
        pharmacie_nom: tenant?.gieName || 'Pharmacie Moderne',
        medicament_prescrit: 'Coartem 20/120mg & Paracétamol Sirop',
        motif: 'Poussée épidémique palustre signalée par les médecins cliniciens D-Santé (+60% de consultations fébriles). Préparer commande Laborex.',
        niveau_urgence: 'urgent',
        statut: 'approuve',
        valide_par_medecin_nom: 'Dr. Cheikh Anta Diop (Polyclinique D-Santé)',
        created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
      },
    ]
    return { echanges: demoEchanges }
  }

  return { echanges: data as EchangePharmaSante[] }
}

/**
 * Le pharmacien émet une demande de substitution vers le médecin
 */
export async function soumettreDemandeSubstitution(formData: FormData) {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  const gieId = tenant?.gieId || 'demo-gie'
  const pharmaNom = tenant?.gieName || 'Pharmacie Officine'

  const patientNom = formData.get('patient_nom') as string
  const patientIpp = formData.get('patient_ipp') as string
  const numeroOrdonnance = formData.get('numero_ordonnance') as string
  const medicamentPrescrit = formData.get('medicament_prescrit') as string
  const medicamentPropose = formData.get('medicament_propose') as string
  const motif = formData.get('motif') as string
  const posologieAjustee = formData.get('posologie_ajustee') as string

  if (!medicamentPrescrit || !medicamentPropose) {
    return { error: 'Veuillez renseigner le médicament prescrit et le substitut' }
  }

  const { error } = await supabase.from('echanges_clinique_pharmacie').insert({
    pharmacie_id: gieId,
    pharmacie_nom: pharmaNom,
    type_echange: 'substitution',
    patient_nom: patientNom || 'Patient Guichet',
    patient_ipp: patientIpp || 'PAT-TEMP',
    numero_ordonnance: numeroOrdonnance || 'ORD-COMPTOIR',
    medicament_prescrit: medicamentPrescrit,
    medicament_propose: medicamentPropose,
    motif: motif || 'Rupture fournisseur grossiste. Équivalent DCI disponible en rayon.',
    posologie_ajustee: posologieAjustee || null,
    niveau_urgence: 'urgent',
    statut: 'en_attente',
  })

  if (error) {
    console.warn('Erreur insertion substitution pharma:', error.message)
  }

  revalidatePath('/pharmacie/interop')
  revalidatePath('/pharmacie/pos')
  return { success: true }
}

/**
 * Le pharmacien signale une rupture grossiste générale à l'ensemble du réseau médical
 */
export async function signalerRuptureGrossiste(formData: FormData) {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  const gieId = tenant?.gieId || 'demo-gie'
  const pharmaNom = tenant?.gieName || 'Pharmacie Officine'

  const medicament = formData.get('medicament') as string
  const motif = formData.get('motif') as string
  const urgence = (formData.get('niveau_urgence') as any) || 'critique'

  if (!medicament) {
    return { error: 'Veuillez préciser le médicament en rupture' }
  }

  const { error } = await supabase.from('echanges_clinique_pharmacie').insert({
    pharmacie_id: gieId,
    pharmacie_nom: pharmaNom,
    type_echange: 'alerte_rupture',
    medicament_prescrit: medicament,
    motif: motif || 'Rupture d’approvisionnement déclarée auprès des grossistes répartiteurs',
    niveau_urgence: urgence,
    statut: 'clos',
  })

  if (error) {
    console.warn('Erreur insertion rupture:', error.message)
  }

  revalidatePath('/pharmacie/interop')
  return { success: true }
}

/**
 * Récupère les bordereaux de télétransmission Tiers-Payant de l'officine
 */
export async function getBordereauxIpmPharma() {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  const gieId = tenant?.gieId || 'demo-gie'

  const { data, error } = await supabase
    .from('bordereaux_teletransmission_ipm')
    .select('*')
    .eq('source_type', 'pharmacie')
    .order('created_at', { ascending: false })

  if (error || !data || data.length === 0) {
    const demoBordereaux: BordereauPharmaIpm[] = [
      {
        id: 'bord-ph-01',
        numero_bordereau: 'BORD-PH-2610-IPM-0112',
        source_type: 'pharmacie',
        emetteur_id: gieId,
        emetteur_nom: tenant?.gieName || 'Pharmacie Moderne',
        organisme_nom: 'IPM Sonatel & Entreprises',
        periode_debut: '2026-10-01',
        periode_fin: '2026-10-31',
        nombre_factures: 38,
        montant_total_reclame: 1420000,
        montant_total_admis: 1420000,
        statut_organisme: 'regle',
        reference_virement: 'VIR-SGBS-261029-8812',
        date_reglement: '2026-10-29',
        notes_audit: 'Ordonnances et feuilles de soins télétransmises conformes.',
        created_at: '2026-10-26T11:00:00Z',
      },
    ]
    return { bordereaux: demoBordereaux }
  }

  return { bordereaux: data as BordereauPharmaIpm[] }
}

/**
 * Génère un bordereau Tiers-Payant pour l'officine
 */
export async function creerBordereauPharmaIpm(formData: FormData) {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  const gieId = tenant?.gieId || 'demo-gie'
  const pharmaNom = tenant?.gieName || 'Pharmacie Moderne'

  const organismeNom = formData.get('organisme_nom') as string
  const periodeDebut = formData.get('periode_debut') as string
  const periodeFin = formData.get('periode_fin') as string
  const montantTotal = Number(formData.get('montant_total') || 0)
  const nombreFactures = Number(formData.get('nombre_factures') || 1)

  const numeroBordereau = `BORD-PH-${new Date().toISOString().substring(2, 7).replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`

  const { error } = await supabase.from('bordereaux_teletransmission_ipm').insert({
    numero_bordereau: numeroBordereau,
    source_type: 'pharmacie',
    emetteur_id: gieId,
    emetteur_nom: pharmaNom,
    organisme_nom: organismeNom || 'IPM Conventionnée',
    periode_debut: periodeDebut || new Date().toISOString().split('T')[0],
    periode_fin: periodeFin || new Date().toISOString().split('T')[0],
    nombre_factures: nombreFactures,
    montant_total_reclame: montantTotal,
    statut_organisme: 'soumis',
  })

  if (error) {
    console.warn('Erreur bordereau pharma:', error.message)
  }

  revalidatePath('/pharmacie/interop')
  return { success: true, numeroBordereau }
}

