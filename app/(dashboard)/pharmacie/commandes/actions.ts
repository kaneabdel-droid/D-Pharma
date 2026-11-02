'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getTenantContext } from '@/utils/supabase/tenant'

export async function createCommande(formData: FormData) {
  const supabase = await createClient()
  const tenant = await getTenantContext()

  if (!tenant) return { error: 'Officine non trouvée.' }

  const fournisseur_id = formData.get('fournisseur_id') as string
  const lignesRaw = formData.get('lignes') as string

  let lignes: { medicament_id: string; quantite: number }[] = []

  if (lignesRaw) {
    try {
      lignes = JSON.parse(lignesRaw)
    } catch {
      lignes = []
    }
  }

  // Rétrocompatibilité avec les formulaires mono-ligne
  if (lignes.length === 0) {
    const medicament_id = formData.get('medicament_id') as string
    const quantite_commandee = parseFloat(formData.get('quantite') as string)
    if (medicament_id && quantite_commandee > 0) {
      lignes.push({ medicament_id, quantite: quantite_commandee })
    }
  }

  if (!fournisseur_id || lignes.length === 0) {
    return { error: 'Veuillez remplir tous les champs obligatoires et ajouter au moins un produit.' }
  }

  try {
    // 1. Créer la commande
    const { data: commande, error: cmdError } = await supabase
      .from('commandes_labo')
      .insert({
        gie_id: tenant.gieId,
        fournisseur_id,
        statut: 'envoyee',
      })
      .select('id')
      .single()

    if (cmdError) throw cmdError

    // 2. Ajouter toutes les lignes de commande
    const rowsToInsert = lignes.map(ligne => ({
      commande_id: commande.id,
      medicament_id: ligne.medicament_id,
      quantite_commandee: Number(ligne.quantite),
    }))

    const { error: ligneError } = await supabase
      .from('lignes_commande_labo')
      .insert(rowsToInsert)

    if (ligneError) throw ligneError

    revalidatePath('/pharmacie/commandes')
    return { success: true }
  } catch (err: any) {
    console.error('Erreur création commande:', err)
    return { error: err.message || 'Erreur lors de la création de la commande' }
  }
}

export async function accuserReception(input: string | FormData) {
  const supabase = await createClient()
  const tenant = await getTenantContext()

  if (!tenant) return { error: 'Officine non trouvée.' }

  const { data: { user } } = await supabase.auth.getUser()

  let commandeId = ''
  let constaterAchat = true
  let customLignes: Array<{
    ligne_id?: string
    medicament_id: string
    nom?: string
    code_barres?: string
    quantite_recue: number
    prix_achat?: number
    prix_vente?: number
    lot?: string
    date_peremption?: string
  }> = []

  if (typeof input === 'string') {
    commandeId = input
  } else {
    commandeId = input.get('commande_id') as string
    constaterAchat = input.get('constater_achat') === 'true' || input.get('constater_achat') === 'on'
    const lignesRaw = input.get('lignes') as string
    if (lignesRaw) {
      try {
        customLignes = JSON.parse(lignesRaw)
      } catch {
        customLignes = []
      }
    }
  }

  if (!commandeId) return { error: 'Identifiant de commande manquant.' }

  try {
    // 1. Récupérer les informations de la commande et du fournisseur
    const { data: commande, error: cmdErr } = await supabase
      .from('commandes_labo')
      .select(`
        id,
        fournisseur_id,
        fournisseurs_labo (id, nom, solde_dette)
      `)
      .eq('id', commandeId)
      .eq('gie_id', tenant.gieId)
      .single()

    if (cmdErr || !commande) throw new Error('Commande introuvable.')

    // 2. Marquer la commande comme complète
    const { error: updateError } = await supabase
      .from('commandes_labo')
      .update({ statut: 'complete', date_reception: new Date().toISOString() })
      .eq('id', commandeId)
      .eq('gie_id', tenant.gieId)

    if (updateError) throw updateError

    // 3. Mettre à jour le stock par lot, le code-barre d'entrée et les lignes de commande
    if (customLignes.length > 0) {
      // Regrouper les quantités par ligne de commande
      const qteTotaleParLigne: Record<string, { qte: number; prix_achat: number }> = {}

      for (const ligne of customLignes) {
        const qteRecue = Number(ligne.quantite_recue || 0)
        const prixAchat = Number(ligne.prix_achat || 0)
        const prixVente = Number(ligne.prix_vente || 0)
        const numLot = (ligne.lot || `REC-${Date.now().toString().slice(-6)}`).trim()
        const datePeremption = ligne.date_peremption || '2028-12-31'

        // A. Enregistrement d'entrée du code-barres dans le catalogue
        if (ligne.code_barres && ligne.code_barres.trim()) {
          try {
            await supabase
              .from('medicaments')
              .update({ code_barres: ligne.code_barres.trim() })
              .eq('id', ligne.medicament_id)
          } catch (e) {
            console.warn('Erreur update code-barres:', e)
          }
        }

        // B. Cumul par ligne de commande
        if (ligne.ligne_id) {
          if (!qteTotaleParLigne[ligne.ligne_id]) {
            qteTotaleParLigne[ligne.ligne_id] = { qte: 0, prix_achat: prixAchat }
          }
          qteTotaleParLigne[ligne.ligne_id].qte += qteRecue
          if (prixAchat > 0) {
            qteTotaleParLigne[ligne.ligne_id].prix_achat = prixAchat
          }
        }

        if (qteRecue <= 0) continue

        // C. Mettre à jour ou insérer le lot spécifique dans stocks_pharmacie
        const { data: existingLotStock } = await supabase
          .from('stocks_pharmacie')
          .select('id, quantite, prix_vente, prix_achat')
          .eq('gie_id', tenant.gieId)
          .eq('medicament_id', ligne.medicament_id)
          .eq('lot', numLot)
          .maybeSingle()

        if (existingLotStock) {
          const updatePayload: any = {
            quantite: Number(existingLotStock.quantite || 0) + qteRecue,
            date_peremption: datePeremption,
            updated_at: new Date().toISOString()
          }
          if (prixVente > 0) updatePayload.prix_vente = prixVente
          if (prixAchat > 0) updatePayload.prix_achat = prixAchat

          await supabase
            .from('stocks_pharmacie')
            .update(updatePayload)
            .eq('id', existingLotStock.id)
        } else {
          await supabase
            .from('stocks_pharmacie')
            .insert({
              gie_id: tenant.gieId,
              medicament_id: ligne.medicament_id,
              quantite: qteRecue,
              prix_vente: prixVente,
              prix_achat: prixAchat,
              date_peremption: datePeremption,
              lot: numLot,
            })
        }
      }

      // D. Mettre à jour les lignes de commande
      for (const [ligneId, val] of Object.entries(qteTotaleParLigne)) {
        await supabase
          .from('lignes_commande_labo')
          .update({
            quantite_recue: val.qte,
            prix_achat_unitaire: val.prix_achat
          })
          .eq('id', ligneId)
      }
    } else {
      // Fallback si aucune ligne custom n'a été transmise
      const { data: lignes } = await supabase
        .from('lignes_commande_labo')
        .select('medicament_id, quantite_commandee')
        .eq('commande_id', commandeId)

      if (lignes && lignes.length > 0) {
        for (const ligne of lignes) {
          const { data: existingStock } = await supabase
            .from('stocks_pharmacie')
            .select('id, quantite')
            .eq('gie_id', tenant.gieId)
            .eq('medicament_id', ligne.medicament_id)
            .maybeSingle()

          if (existingStock) {
            await supabase
              .from('stocks_pharmacie')
              .update({ quantite: Number(existingStock.quantite || 0) + Number(ligne.quantite_commandee || 0) })
              .eq('id', existingStock.id)
          } else {
            const peremption = new Date()
            peremption.setFullYear(peremption.getFullYear() + 2)
            await supabase
              .from('stocks_pharmacie')
              .insert({
                gie_id: tenant.gieId,
                medicament_id: ligne.medicament_id,
                quantite: Number(ligne.quantite_commandee || 0),
                prix_vente: 0,
                date_peremption: peremption.toISOString().split('T')[0],
                lot: `REC-${Date.now().toString().slice(-6)}`,
              })
          }
        }
      }
    }

    // 4. Constatation de l'achat en comptabilité et dette fournisseur
    const totalAchat = customLignes.reduce((sum, l) => sum + (Number(l.quantite_recue || 0) * Number(l.prix_achat || 0)), 0)

    if (constaterAchat && totalAchat > 0 && commande.fournisseur_id) {
      const fournisseur: any = commande.fournisseurs_labo
      const soldeActuel = Number(fournisseur?.solde_dette || 0)
      const nouveauSolde = soldeActuel + totalAchat
      const today = new Date().toISOString().split('T')[0]
      const pieceRef = `CMD-${commande.id.slice(0, 8).toUpperCase()}`

      // A. Mettre à jour la dette du fournisseur
      await supabase
        .from('fournisseurs_labo')
        .update({ solde_dette: nouveauSolde })
        .eq('id', commande.fournisseur_id)

      // B. Créer le mouvement de dette fournisseur
      await supabase
        .from('mouvements_dettes_fournisseurs')
        .insert({
          gie_id: tenant.gieId,
          fournisseur_id: commande.fournisseur_id,
          date_mouvement: today,
          type_mouvement: 'livraison',
          numero_piece: pieceRef,
          debit: 0,
          credit: totalAchat,
          solde_resultant: nouveauSolde,
          libelle: `Livraison commande #${commande.id.slice(0, 8)} (${fournisseur?.nom || 'Grossiste'})`
        })

      // C. Constater l'écriture dans le Journal des Achats
      const { data: ecriture } = await supabase
        .from('ecritures_comptables')
        .insert({
          gie_id: tenant.gieId,
          journal: 'achats',
          date_ecriture: today,
          numero_piece: pieceRef,
          libelle: `Facture achat / Livraison ${fournisseur?.nom || 'Grossiste'} (${pieceRef})`,
          validee: true,
          created_by: user?.id || null
        })
        .select('id')
        .single()

      if (ecriture) {
        await supabase
          .from('lignes_ecritures_comptables')
          .insert([
            {
              ecriture_id: ecriture.id,
              gie_id: tenant.gieId,
              compte: '601',
              libelle: `Achats de médicaments (${fournisseur?.nom || 'Grossiste'})`,
              debit: totalAchat,
              credit: 0
            },
            {
              ecriture_id: ecriture.id,
              gie_id: tenant.gieId,
              compte: '401',
              libelle: `Fournisseur ${fournisseur?.nom || 'Grossiste'}`,
              debit: 0,
              credit: totalAchat
            }
          ])
      }
    }

    revalidatePath('/pharmacie/commandes')
    revalidatePath('/pharmacie/stocks')
    revalidatePath('/pharmacie/pos')
    revalidatePath('/pharmacie/fournisseurs')
    revalidatePath('/comptabilite')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error('Erreur accuserReception:', err)
    return { error: err.message || 'Erreur lors de l\'accusé de réception' }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function envoyerEmailCommandeServeur(
  commandeId: string,
  emailDestinataire: string,
  messageOptionnel?: string
) {
  const supabase = await createClient()
  const tenant = await getTenantContext()

  if (!tenant) return { error: 'Officine non trouvée.' }
  if (!commandeId) return { error: 'Identifiant de commande manquant.' }

  const destinataire = (emailDestinataire || '').trim()
  if (!destinataire || !destinataire.includes('@')) {
    return { error: 'Adresse email destinataire invalide.' }
  }

  try {
    const { data: cmd, error: cmdErr } = await supabase
      .from('commandes_labo')
      .select(`
        id,
        date_commande,
        fournisseurs_labo (id, nom, contact_email, contact_telephone, adresse),
        lignes_commande_labo (
          id,
          quantite_commandee,
          prix_achat_unitaire,
          medicaments (id, nom, code_barres)
        )
      `)
      .eq('id', commandeId)
      .eq('gie_id', tenant.gieId)
      .single()

    if (cmdErr || !cmd) return { error: 'Commande introuvable.' }

    const fournisseur: any = cmd.fournisseurs_labo
    const fournisseurNom = fournisseur?.nom || 'Fournisseur / Laboratoire'
    const pharmacieNom = tenant.gieName || 'Pharmacie'
    const refCommande = `CMD-${cmd.id.slice(0, 8).toUpperCase()}`
    const dateStr = new Date(cmd.date_commande).toLocaleDateString('fr-FR')
    const lignes = cmd.lignes_commande_labo || []
    const totalArticles = lignes.reduce((sum: number, l: any) => sum + Number(l.quantite_commandee || 0), 0)

    const apiKey = process.env.RESEND_API_KEY
    const expediteur = process.env.EMAIL_EXPEDITEUR || 'noreply@dembasolution.com'

    const { data: gie } = await supabase
      .from('gies')
      .select('email, telephone')
      .eq('id', tenant.gieId)
      .maybeSingle()

    const replyToEmail = gie?.email || undefined
    const sujet = `[BON DE COMMANDE] ${refCommande} — ${pharmacieNom}`

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <div style="border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #0284c7; margin: 0 0 4px 0; font-size: 20px;">BON DE COMMANDE D'APPROVISIONNEMENT</h2>
          <p style="margin: 0; color: #64748b; font-size: 13px;">Référence : <strong>${escapeHtml(refCommande)}</strong> • Date : ${escapeHtml(dateStr)}</p>
        </div>

        <div style="background-color: #f8fafc; border-radius: 12px; padding: 14px; margin-bottom: 20px; font-size: 13px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="vertical-align: top; width: 50%;">
                <strong style="color: #475569;">ÉMETTEUR (OFFICINE) :</strong><br/>
                <span style="font-size: 14px; font-weight: bold; color: #0f172a;">${escapeHtml(pharmacieNom)}</span><br/>
                ${gie?.telephone ? `Tél : ${escapeHtml(gie.telephone)}<br/>` : ''}
                ${gie?.email ? `Email : ${escapeHtml(gie.email)}` : ''}
              </td>
              <td style="vertical-align: top; width: 50%;">
                <strong style="color: #475569;">FOURNISSEUR DESTINATAIRE :</strong><br/>
                <span style="font-size: 14px; font-weight: bold; color: #0f172a;">${escapeHtml(fournisseurNom)}</span><br/>
                Email : ${escapeHtml(destinataire)}
              </td>
            </tr>
          </table>
        </div>

        ${messageOptionnel ? `
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 10px 14px; margin-bottom: 20px; font-size: 13px; color: #1e40af;">
            <strong>Note de l'officine :</strong><br/>
            ${escapeHtml(messageOptionnel)}
          </div>
        ` : ''}

        <h3 style="font-size: 14px; text-transform: uppercase; color: #334155; margin-bottom: 8px;">Détail des médicaments commandés (${totalArticles} boîtes) :</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: left; color: #475569;">
              <th style="padding: 8px 10px; border: 1px solid #e2e8f0;">#</th>
              <th style="padding: 8px 10px; border: 1px solid #e2e8f0;">Désignation / Médicament</th>
              <th style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">Code-barres</th>
              <th style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right;">Quantité</th>
            </tr>
          </thead>
          <tbody>
            ${lignes.map((l: any, idx: number) => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; color: #64748b;">${idx + 1}</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${escapeHtml(l.medicaments?.nom || 'Médicament')}</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center; font-family: monospace; color: #64748b;">${escapeHtml(l.medicaments?.code_barres || '—')}</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0284c7;">${l.quantite_commandee}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="background-color: #f8fafc; border-radius: 12px; padding: 12px; font-size: 12px; color: #475569; margin-bottom: 20px;">
          <strong>Modalités de réception :</strong><br/>
          • Livraison au comptoir de l'officine ${escapeHtml(pharmacieNom)}.<br/>
          • Contrôle de conformité et accusé de réception à l'arrivée avec bon de livraison conforme.<br/>
          • Merci de nous confirmer par retour de mail le créneau de livraison prévu.
        </div>

        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
          Ce bon de commande a été émis via la plateforme officinale <strong>D-PHARMA</strong> de Demba Solution. Pour répondre, répondez directement à ce mail.
        </p>
      </div>
    `

    const text = `BON DE COMMANDE : ${refCommande}\n` +
      `Date : ${dateStr}\n` +
      `Officine : ${pharmacieNom}\n` +
      `Fournisseur : ${fournisseurNom}\n\n` +
      `ARTICLES COMMANDÉS :\n` +
      lignes.map((l: any, i: number) => `${i + 1}. ${l.medicaments?.nom || 'Médicament'} — Quantité : ${l.quantite_commandee}`).join('\n') +
      `\n\nTotal : ${totalArticles} boîtes commandées.\n` +
      `Merci de nous confirmer la réception et le créneau de livraison.`

    if (apiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${pharmacieNom} <${expediteur}>`,
            to: [destinataire],
            reply_to: replyToEmail || undefined,
            subject: sujet,
            html,
            text,
          }),
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          console.warn('API Resend warning:', errorData)
        }
      } catch (errApi) {
        console.warn('Erreur envoi Resend:', errApi)
      }
    }

    // Marquer la commande comme transmise
    await marquerEmailEnvoye(commandeId, destinataire)

    return { success: true, message: `Bon de commande transmis avec succès à ${destinataire} !` }
  } catch (err: any) {
    console.error('Erreur envoi email direct:', err)
    return { error: err.message || 'Erreur lors de l\'envoi de l\'email.' }
  }
}
