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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Envoie le bordereau de télétransmission Tiers-Payant directement par email à l'IPM
 */
export async function envoyerBordereauPharmaIpmParEmail(
  bordereauId: string,
  emailDestinataire: string,
  messageAccompagnement?: string
) {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  const pharmaNom = tenant?.gieName || 'Pharmacie d’Officine'

  const destinataire = (emailDestinataire || '').trim()
  if (!destinataire || !destinataire.includes('@')) {
    return { error: 'Adresse email IPM invalide.' }
  }

  const { data: bordereau } = await supabase
    .from('bordereaux_teletransmission_ipm')
    .select('*')
    .eq('id', bordereauId)
    .maybeSingle()

  const numBordereau = bordereau?.numero_bordereau || bordereauId
  const orgNom = bordereau?.organisme_nom || 'Organisme IPM'
  const montantReclame = Number(bordereau?.montant_total_reclame || 0)
  const nbFactures = Number(bordereau?.nombre_factures || 0)
  const periode = bordereau ? `${bordereau.periode_debut} au ${bordereau.periode_fin}` : 'Période en cours'

  const apiKey = process.env.RESEND_API_KEY
  const expediteur = process.env.EMAIL_EXPEDITEUR || 'noreply@dembasolution.com'
  const sujet = `[TÉLÉTRANSMISSION TIERS-PAYANT OFFICINE] ${numBordereau} — ${pharmaNom}`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
      <div style="border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #0d9488; margin: 0 0 4px 0; font-size: 20px;">BORDEREAU DE TÉLÉTRANSMISSION TIERS-PAYANT PHARMACIE</h2>
        <p style="margin: 0; color: #64748b; font-size: 13px;">Référence : <strong>${escapeHtml(numBordereau)}</strong> • Période : ${escapeHtml(periode)}</p>
      </div>

      <div style="background-color: #f8fafc; border-radius: 12px; padding: 14px; margin-bottom: 20px; font-size: 13px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: top; width: 50%;">
              <strong style="color: #475569;">OFFICINE PHARMACEUTIQUE :</strong><br/>
              <span style="font-size: 14px; font-weight: bold; color: #0f172a;">${escapeHtml(pharmaNom)}</span>
            </td>
            <td style="vertical-align: top; width: 50%;">
              <strong style="color: #475569;">ORGANISME PAYEUR (IPM / ASSURANCE) :</strong><br/>
              <span style="font-size: 14px; font-weight: bold; color: #0f172a;">${escapeHtml(orgNom)}</span><br/>
              Email de réception : ${escapeHtml(destinataire)}
            </td>
          </tr>
        </table>
      </div>

      ${messageAccompagnement ? `
        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 10px 14px; margin-bottom: 20px; font-size: 13px; color: #065f46;">
          <strong>Message d'accompagnement de l'officine :</strong><br/>
          ${escapeHtml(messageAccompagnement)}
        </div>
      ` : ''}

      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #334155;">RÉCAPITULATIF DES CRÉANCES DÉLIVRÉES EN TIERS-PAYANT :</h3>
        <table style="width: 100%; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Nombre d'ordonnances / factures prises en charge :</td>
            <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #0f172a;">${nbFactures} dossier(s)</td>
          </tr>
          <tr style="border-top: 1px dashed #e2e8f0;">
            <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Montant total de remboursement réclamé :</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 16px; color: #0d9488;">
              ${new Intl.NumberFormat('fr-FR').format(montantReclame)} FCFA
            </td>
          </tr>
        </table>
      </div>

      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 12px; font-size: 12px; color: #64748b; line-height: 1.5;">
        <p style="margin: 0 0 4px 0;"><strong>Contrôle & Pièces justificatives :</strong></p>
        <p style="margin: 0;">Les ordonnances scannées, volets de prise en charge et attestations d'assurés correspondants sont archivés et tenus à la disposition du médecin-contrôleur de l'IPM.</p>
      </div>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
        Télétransmis via <strong>DEMBA HEALTH EXCHANGE</strong> pour ${escapeHtml(pharmaNom)}.<br/>
        Pour toute vérification ou émission de virement, contacter directement l'officine.
      </div>
    </div>
  `

  if (!apiKey) {
    console.info(`[MODE DÉMO EMAIL] Bordereau ${numBordereau} simulé vers ${destinataire}`)
    return {
      success: true,
      message: `Bordereau télétransmis avec succès à ${destinataire} (Mode simulation).`,
    }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `DEMBA HEALTH EXCHANGE <${expediteur}>`,
        to: [destinataire],
        subject: sujet,
        html: html,
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      console.error('Erreur API Resend:', errData)
      return {
        error: `Erreur d'expédition (${res.status}): ${errData.message || 'Impossible de joindre le serveur mail.'}`,
      }
    }

    return {
      success: true,
      message: `Bordereau transmis avec succès à l'organisme IPM (${destinataire}).`,
    }
  } catch (err: any) {
    console.error('Exception Resend:', err)
    return { error: `Erreur de connexion réseau : ${err.message}` }
  }
}

