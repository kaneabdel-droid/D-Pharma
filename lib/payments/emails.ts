import { createAdminClient } from '@/utils/supabase/admin'

type InfosConfirmationPharma = {
  paymentId: string
  gieId: string
  niveau: string
  montant: number
  devise?: string
  provider: string
  providerReference?: string | null
}

const NOMS_NIVEAUX: Record<string, string> = {
  pharmacie: 'Pharmacie (Officine)',
  fournisseur: 'Fournisseur / Laboratoire',
  standard: 'Standard',
  medium: 'Médium',
  premium: 'Premium',
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function envoyerEmailsConfirmationPharma(infos: InfosConfirmationPharma) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[Emails] RESEND_API_KEY absent : aucun email de confirmation envoyé')
    return false
  }

  const expediteur = process.env.EMAIL_EXPEDITEUR || 'noreply@dembasolution.com'
  const adminEmails = (process.env.ADMIN_EMAILS || 'kaneabdel@gmail.com')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)

  const supabase = createAdminClient()

  const { data: gie } = await supabase
    .from('gies')
    .select('nom, email, telephone')
    .eq('id', infos.gieId)
    .maybeSingle()

  const { data: user } = await supabase
    .from('utilisateurs')
    .select('email, prenom, nom, telephone')
    .eq('gie_id', infos.gieId)
    .limit(1)
    .maybeSingle()

  const nomPharmacie = gie?.nom || 'Votre pharmacie'
  const clientEmail = gie?.email || user?.email || ''
  const clientNom = user ? `${user.prenom || ''} ${user.nom || ''}`.trim() : nomPharmacie
  const telephone = gie?.telephone || user?.telephone || ''

  const niveauLibelle = NOMS_NIVEAUX[infos.niveau] || infos.niveau
  const montantFormate = `${Number(infos.montant).toLocaleString('fr-FR')} ${infos.devise || 'FCFA'}`
  const datePaiement = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://d-pharma.dembasolution.com'

  // 1. Email au client (si une adresse email est trouvée)
  if (clientEmail) {
    const htmlClient = `
      <!doctype html>
      <html lang="fr">
      <head><meta charset="utf-8" /></head>
      <body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
        <div style="max-width:600px;margin:24px auto;background:#FFFFFF;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="background:#0284C7;padding:28px 32px;text-align:center;">
            <h1 style="color:#FFFFFF;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px;">D-PHARMA</h1>
            <p style="color:#BAE6FD;margin:6px 0 0;font-size:13px;">Gestion officinale &amp; pharmaceutique moderne</p>
          </div>
          
          <div style="padding:32px;">
            <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;padding:16px 20px;margin-bottom:24px;text-align:center;">
              <span style="font-size:24px;">✅</span>
              <h2 style="color:#065F46;margin:8px 0 4px;font-size:18px;font-weight:700;">Abonnement activé avec succès !</h2>
              <p style="color:#047857;margin:0;font-size:14px;">Votre paiement a été reçu et validé.</p>
            </div>

            <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
              Bonjour <strong>${escapeHtml(clientNom || nomPharmacie)}</strong>,
            </p>
            <p style="font-size:14px;line-height:1.6;color:#475569;margin:0 0 24px;">
              Nous vous confirmons la bonne réception de votre paiement pour votre officine <strong>${escapeHtml(nomPharmacie)}</strong>. Votre abonnement <strong>D-PHARMA</strong> est actif.
            </p>

            <table style="width:100%;border-collapse:collapse;margin-bottom:28px;background:#F8FAFC;border-radius:12px;border:1px solid #E2E8F0;font-size:14px;">
              <tr>
                <td style="padding:12px 16px;color:#64748B;border-bottom:1px solid #E2E8F0;">Officine</td>
                <td style="padding:12px 16px;font-weight:600;color:#0F172A;border-bottom:1px solid #E2E8F0;text-align:right;">${escapeHtml(nomPharmacie)}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;color:#64748B;border-bottom:1px solid #E2E8F0;">Formule souscrite</td>
                <td style="padding:12px 16px;font-weight:600;color:#0F172A;border-bottom:1px solid #E2E8F0;text-align:right;">${escapeHtml(niveauLibelle)}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;color:#64748B;border-bottom:1px solid #E2E8F0;">Montant réglé</td>
                <td style="padding:12px 16px;font-weight:700;color:#059669;border-bottom:1px solid #E2E8F0;text-align:right;">${escapeHtml(montantFormate)}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;color:#64748B;border-bottom:1px solid #E2E8F0;">Date</td>
                <td style="padding:12px 16px;color:#0F172A;border-bottom:1px solid #E2E8F0;text-align:right;">${escapeHtml(datePaiement)}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;color:#64748B;">Moyen de paiement</td>
                <td style="padding:12px 16px;color:#0F172A;text-align:right;text-transform:capitalize;">${escapeHtml(infos.provider)}</td>
              </tr>
            </table>

            <div style="text-align:center;margin-bottom:24px;">
              <a href="${siteUrl}" style="display:inline-block;background:#0284C7;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:10px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                Accéder à mon tableau de bord D-PHARMA
              </a>
            </div>

            <p style="font-size:12px;color:#94A3B8;text-align:center;margin:0;">
              Besoin d'aide ou d'une question ? Contactez notre support à <a href="mailto:support@dembasolution.com" style="color:#64748B;">support@dembasolution.com</a>.
            </p>
          </div>

          <div style="background:#F8FAFC;padding:16px;text-align:center;border-top:1px solid #E2E8F0;font-size:11px;color:#94A3B8;">
            DembaSolution © ${new Date().getFullYear()} — Tous droits réservés.
          </div>
        </div>
      </body>
      </html>
    `

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `D-PHARMA <${expediteur}>`,
          to: [clientEmail],
          subject: `Confirmation de votre abonnement D-PHARMA (${niveauLibelle})`,
          html: htmlClient,
        }),
      })
    } catch (err) {
      console.error('[Emails] Échec envoi confirmation client D-PHARMA:', err)
    }
  }

  // 2. Email de notification à l'administrateur
  if (adminEmails.length > 0) {
    const htmlAdmin = `
      <div style="font-family:sans-serif;line-height:1.6;color:#1E293B;">
        <h2 style="color:#0284C7;margin-top:0;">🎉 Nouveau paiement d'abonnement reçu — D-PHARMA</h2>
        <p>Une officine vient de régler son abonnement avec succès :</p>
        <ul>
          <li><strong>Officine :</strong> ${escapeHtml(nomPharmacie)}</li>
          <li><strong>Contact :</strong> ${escapeHtml(clientNom)} (${escapeHtml(clientEmail || 'N/A')}, ${escapeHtml(telephone || 'N/A')})</li>
          <li><strong>Formule :</strong> ${escapeHtml(niveauLibelle)}</li>
          <li><strong>Montant :</strong> <strong>${escapeHtml(montantFormate)}</strong></li>
          <li><strong>Prestataire :</strong> ${escapeHtml(infos.provider)} (Réf: ${escapeHtml(infos.providerReference || infos.paymentId)})</li>
          <li><strong>Date :</strong> ${escapeHtml(datePaiement)}</li>
        </ul>
      </div>
    `

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `D-PHARMA Notifications <${expediteur}>`,
          to: adminEmails,
          subject: `[Paiement Reçu] D-PHARMA — ${nomPharmacie} (${montantFormate})`,
          html: htmlAdmin,
        }),
      })
    } catch (err) {
      console.error('[Emails] Échec envoi notification admin D-PHARMA:', err)
    }
  }

  return true
}
