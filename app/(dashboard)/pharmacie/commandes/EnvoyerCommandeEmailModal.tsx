'use client'

import { useState } from 'react'
import { Mail, Send, Copy, Check, X, ExternalLink, AlertCircle, Building2, CheckCircle2 } from 'lucide-react'
import { marquerEmailEnvoye, envoyerEmailCommandeServeur } from './actions'

interface LigneCommande {
  id?: string
  medicament_id: string
  quantite_commandee: number
  medicaments?: { id: string; nom: string } | null
}

interface CommandeLabo {
  id: string
  statut: string
  date_commande: string
  email_envoye?: boolean
  fournisseurs_labo?: {
    id: string
    nom: string
    email?: string | null
    contact_email?: string | null
    contact_telephone?: string | null
    telephone?: string | null
  } | null
  lignes_commande_labo?: LigneCommande[]
}

export default function EnvoyerCommandeEmailModal({
  commande,
  pharmacieNom = 'Ma Pharmacie',
}: {
  commande: CommandeLabo
  pharmacieNom?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailStatus, setEmailStatus] = useState<string | null>(null)

  const fournisseur = commande.fournisseurs_labo
  const fournisseurNom = fournisseur?.nom || 'Fournisseur'
  const defaultEmail = fournisseur?.email || fournisseur?.contact_email || ''
  const [destinataire, setDestinataire] = useState(defaultEmail)

  const refCommande = `CMD-${commande.id.slice(0, 8).toUpperCase()}`
  const dateStr = new Date(commande.date_commande).toLocaleDateString('fr-FR')
  const lignes = commande.lignes_commande_labo || []
  const totalArticles = lignes.reduce((sum, l) => sum + Number(l.quantite_commandee || 0), 0)

  // Construction du corps d'email
  const subject = `Bon de commande ${refCommande} - ${pharmacieNom}`
  const bodyText = `Bonjour ${fournisseurNom},

Veuillez trouver ci-dessous notre bon de commande d'approvisionnement pour l'officine ${pharmacieNom}.

RÉFÉRENCE COMMANDE : ${refCommande}
DATE D'ÉMISSION : ${dateStr}
OFFICINE CLIENTE : ${pharmacieNom}

DÉTAIL DES ARTICLES COMMANDÉS (${totalArticles} unités au total) :
${lignes
      .map(
        (l, i) =>
          `${i + 1}. ${(l.medicaments as any)?.nom || 'Médicament'} — Quantité commandée : ${l.quantite_commandee}`
      )
      .join('\n')}

LIVRAISON SOUHAITÉE :
- Lieu de réception : Au comptoir de la pharmacie ${pharmacieNom}
- Modalité : Accusé de réception avec bon de livraison conforme

Merci de bien vouloir nous accuser réception de cette commande et de nous indiquer le créneau de livraison prévu.

Restant à votre entière disposition.

Cordialement,
Le Pharmacien Titulaire & L'équipe Officine
${pharmacieNom}
`

  const mailtoUrl = `mailto:${encodeURIComponent(destinataire)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(bodyText)}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bodyText)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      // Fallback
    }
  }

  const [messagePerso, setMessagePerso] = useState('')

  const handleEnvoiDirectServeur = async () => {
    if (!destinataire || !destinataire.includes('@')) {
      setEmailStatus('Veuillez renseigner une adresse email valide pour le fournisseur.')
      return
    }
    setIsSubmitting(true)
    setEmailStatus(null)
    const res = await envoyerEmailCommandeServeur(commande.id, destinataire, messagePerso)
    setIsSubmitting(false)
    if (res?.error) {
      setEmailStatus(`Erreur : ${res.error}`)
    } else {
      setEmailStatus(`✓ ${res.message || 'Bon de commande envoyé avec succès !'}`)
      setTimeout(() => {
        setIsOpen(false)
      }, 2000)
    }
  }

  const handleMarquerEnvoye = async () => {
    setIsSubmitting(true)
    setEmailStatus(null)
    const res = await marquerEmailEnvoye(commande.id, destinataire)
    setIsSubmitting(false)
    if (res?.error) {
      setEmailStatus(`Erreur : ${res.error}`)
    } else {
      setEmailStatus('Statut mis à jour : Commande enregistrée comme transmise par email.')
      setTimeout(() => {
        setIsOpen(false)
      }, 1500)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors text-xs font-semibold ${commande.email_envoye
            ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20'
            : 'border-surface-border text-foreground hover:bg-surface hover:text-primary'
          }`}
        title="Envoyer la commande par email au fournisseur"
      >
        <Mail className="w-3.5 h-3.5 text-primary" />
        <span>{commande.email_envoye ? 'Renvoyer email' : 'Envoyer par mail'}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="relative w-full max-w-2xl rounded-2xl bg-surface border border-surface-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-surface-border bg-background/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Envoyer le bon de commande par mail
                  </h3>
                  <p className="text-xs text-foreground-muted">
                    {refCommande} • {fournisseurNom}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              {commande.email_envoye && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Cette commande a déjà été marquée comme envoyée par email au fournisseur.</span>
                </div>
              )}

              {emailStatus && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs">
                  {emailStatus}
                </div>
              )}

              {/* Recipient */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Adresse e-mail du fournisseur / laboratoire
                </label>
                <input
                  type="email"
                  value={destinataire}
                  onChange={(e) => setDestinataire(e.target.value)}
                  placeholder="contact@laboratoire-grossiste.com"
                  className="w-full rounded-xl border border-surface-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
                {!defaultEmail && (
                  <p className="text-[11px] text-foreground-muted mt-1">
                    Conseil : Renseignez l&apos;email de ce grossiste dans l&apos;onglet « Grossistes & Dettes » pour qu&apos;il soit pré-rempli automatiquement.
                  </p>
                )}
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Objet du message
                </label>
                <input
                  type="text"
                  readOnly
                  value={subject}
                  className="w-full rounded-xl border border-surface-border bg-background/50 px-3.5 py-2 text-sm text-foreground-muted font-medium"
                />
              </div>

              {/* Message personnel additionnel */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Note ou instruction particulière (optionnel)
                </label>
                <input
                  type="text"
                  value={messagePerso}
                  onChange={(e) => setMessagePerso(e.target.value)}
                  placeholder="Ex: Urgent - merci de livrer avant vendredi 12h..."
                  className="w-full rounded-xl border border-surface-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              {/* Message Preview */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-foreground">
                    Aperçu du contenu du bon de commande
                  </label>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-success" />
                        <span>Copié dans le presse-papier !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copier le texte</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={7}
                  value={bodyText}
                  className="w-full rounded-xl border border-surface-border bg-background/50 p-3 text-xs font-mono text-foreground focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-surface-border bg-background/50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-surface-border bg-surface text-foreground text-xs font-semibold hover:bg-background"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copié' : 'Copier'}</span>
                </button>
                <a
                  href={mailtoUrl}
                  onClick={() => handleMarquerEnvoye()}
                  title="Ouvrir votre client de messagerie local (Outlook, Thunderbird, Mail...)"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-surface-border bg-surface text-foreground text-xs font-semibold hover:bg-background"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-foreground-muted" />
                  <span>Messagerie locale</span>
                </a>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-foreground-muted hover:text-foreground"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={handleEnvoiDirectServeur}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-md shadow-primary/20 transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Envoi en cours...' : 'Envoyer par email (Direct)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
