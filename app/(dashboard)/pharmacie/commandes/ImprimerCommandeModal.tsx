'use client'

import { useState } from 'react'
import { Printer, Download, X, Building2, Calendar, FileText, CheckCircle2 } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface LigneCommande {
  id?: string
  medicament_id: string
  quantite_commandee: number
  quantite_recue?: number
  prix_achat_unitaire?: number
  medicaments?: { id: string; nom: string } | null
}

interface CommandeLabo {
  id: string
  statut: string
  date_commande: string
  date_reception?: string | null
  email_envoye?: boolean
  fournisseurs_labo?: {
    id: string
    nom: string
    email?: string | null
    contact_email?: string | null
    contact_telephone?: string | null
    telephone?: string | null
    adresse?: string | null
  } | null
  lignes_commande_labo?: LigneCommande[]
}

export default function ImprimerCommandeModal({
  commande,
  pharmacieNom = 'Pharmacie',
}: {
  commande: CommandeLabo
  pharmacieNom?: string
}) {
  const [isOpen, setIsOpen] = useState(false)

  const dateFormatee = new Date(commande.date_commande).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const fournisseur = commande.fournisseurs_labo
  const fournisseurNom = fournisseur?.nom || 'Fournisseur non spécifié'
  const fournisseurEmail = fournisseur?.email || fournisseur?.contact_email || '—'
  const fournisseurTel = fournisseur?.telephone || fournisseur?.contact_telephone || '—'
  const refCommande = `CMD-${commande.id.slice(0, 8).toUpperCase()}`

  const lignes = commande.lignes_commande_labo || []
  const totalArticles = lignes.reduce((sum, l) => sum + Number(l.quantite_commandee || 0), 0)
  const totalEstime = lignes.reduce(
    (sum, l) => sum + Number(l.quantite_commandee || 0) * Number(l.prix_achat_unitaire || 0),
    0
  )

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF()

      // En-tête de la pharmacie
      doc.setFontSize(18)
      doc.setTextColor(24, 76, 120) // Primary blue
      doc.text(pharmacieNom.toUpperCase(), 14, 20)

      doc.setFontSize(10)
      doc.setTextColor(100, 116, 139)
      doc.text("BON DE COMMANDE D'APPROVISIONNEMENT", 14, 27)

      // Cadre infos commande & fournisseur
      doc.setDrawColor(226, 232, 240)
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(14, 33, 182, 32, 3, 3, 'FD')

      doc.setFontSize(9)
      doc.setTextColor(51, 65, 85)
      doc.text(`Référence : ${refCommande}`, 20, 42)
      doc.text(`Date d'émission : ${dateFormatee}`, 20, 49)
      doc.text(`Statut : ${commande.statut === 'complete' ? 'Réceptionnée' : 'En attente de livraison'}`, 20, 56)

      doc.text(`Destinataire : ${fournisseurNom}`, 110, 42)
      doc.text(`Email : ${fournisseurEmail}`, 110, 49)
      doc.text(`Tél : ${fournisseurTel}`, 110, 56)

      // Tableau des lignes
      const tableData = lignes.map((l, index) => [
        (index + 1).toString(),
        (l.medicaments as any)?.nom || 'Médicament',
        Number(l.quantite_commandee || 0).toString(),
        l.prix_achat_unitaire ? `${Number(l.prix_achat_unitaire).toLocaleString('fr-FR')} F` : '—',
        l.prix_achat_unitaire
          ? `${(Number(l.quantite_commandee || 0) * Number(l.prix_achat_unitaire)).toLocaleString('fr-FR')} F`
          : '—',
      ])

      autoTable(doc, {
        startY: 72,
        head: [['N°', 'Désignation Médicament / Molécule', 'Quantité', 'Prix Unitaire Est.', 'Montant Est.']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 9,
          textColor: 50,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      })

      // Position finale
      const finalY = (doc as any).lastAutoTable?.finalY || 150

      // Totaux
      doc.setFontSize(10)
      doc.setTextColor(30, 41, 59)
      doc.text(`Nombre total d'unités commandées : ${totalArticles}`, 14, finalY + 12)
      if (totalEstime > 0) {
        doc.setFont('helvetica', 'bold')
        doc.text(`Montant estimé HT : ${totalEstime.toLocaleString('fr-FR')} FCFA`, 14, finalY + 18)
        doc.setFont('helvetica', 'normal')
      }

      // Zone signature
      const signY = Math.min(finalY + 30, 250)
      doc.setDrawColor(203, 213, 225)
      doc.line(120, signY + 25, 185, signY + 25)
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text('Signature & Cachet du Pharmacien :', 120, signY)

      doc.save(`Bon_Commande_${refCommande}.pdf`)
    } catch (err) {
      console.error('Erreur génération PDF:', err)
      // Fallback print
      window.print()
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-surface-border text-foreground hover:bg-surface hover:text-primary transition-colors text-xs font-semibold"
        title="Imprimer ou télécharger le bon de commande"
      >
        <Printer className="w-3.5 h-3.5 text-primary" />
        <span>Imprimer</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="relative w-full max-w-3xl rounded-2xl bg-surface border border-surface-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header modal */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-surface-border bg-background/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Bon de Commande #{refCommande}
                  </h3>
                  <p className="text-xs text-foreground-muted">
                    {fournisseurNom} • {dateFormatee}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger PDF</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border bg-background text-foreground text-xs font-semibold hover:bg-surface"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer</span>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Preview Area */}
            <div className="p-6 sm:p-8 overflow-y-auto bg-white text-slate-900 print:p-0 print:m-0" id={`print-cmd-${commande.id}`}>
              {/* Document Header */}
              <div className="flex justify-between items-start pb-6 border-b border-slate-200">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-blue-900">
                    {pharmacieNom.toUpperCase()}
                  </h1>
                  <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">
                    Officine Pharmaceutique
                  </p>
                  <p className="text-xs text-slate-600 mt-2">
                    Système Officinal Intégré D-PHARMA
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-bold uppercase tracking-wider border border-blue-200 mb-2">
                    Bon de Commande
                  </span>
                  <p className="text-sm font-mono font-bold text-slate-900">
                    Réf : {refCommande}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Date : {dateFormatee}
                  </p>
                </div>
              </div>

              {/* Vendor & Order Details */}
              <div className="grid grid-cols-2 gap-6 my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Fournisseur / Laboratoire
                  </span>
                  <p className="text-sm font-bold text-slate-900">{fournisseurNom}</p>
                  {fournisseurEmail !== '—' && (
                    <p className="text-slate-600 mt-0.5">Email : {fournisseurEmail}</p>
                  )}
                  {fournisseurTel !== '—' && (
                    <p className="text-slate-600 mt-0.5">Tél : {fournisseurTel}</p>
                  )}
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Informations de Livraison
                  </span>
                  <p className="text-slate-700">Lieu de livraison : Au comptoir de l&apos;officine</p>
                  <p className="text-slate-700 mt-0.5">Accusé de réception sous contrôle pharmacien</p>
                  <p className="text-slate-700 mt-0.5">Mode : Facture & Bordereau de livraison</p>
                </div>
              </div>

              {/* Table of items */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-100 text-slate-700">
                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider w-12">N°</th>
                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Désignation Médicament / Molécule</th>
                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right w-24">Quantité</th>
                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right w-32">P.U Estimé</th>
                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right w-32">Total Estimé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {lignes.map((ligne, idx) => {
                    const qte = Number(ligne.quantite_commandee || 0)
                    const pu = Number(ligne.prix_achat_unitaire || 0)
                    const totalLigne = qte * pu
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {(ligne.medicaments as any)?.nom || 'Médicament'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-blue-900">
                          {qte.toLocaleString('fr-FR')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {pu > 0 ? `${pu.toLocaleString('fr-FR')} F` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                          {totalLigne > 0 ? `${totalLigne.toLocaleString('fr-FR')} F` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 font-bold bg-slate-50 text-slate-900">
                    <td colSpan={2} className="py-3 px-3 uppercase text-right">
                      Total général
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-blue-900">
                      {totalArticles.toLocaleString('fr-FR')} unités
                    </td>
                    <td className="py-3 px-3 text-right text-slate-500">—</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-900">
                      {totalEstime > 0 ? `${totalEstime.toLocaleString('fr-FR')} FCFA` : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Signature block */}
              <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs">
                <div>
                  <p className="text-slate-500 italic">
                    Merci de nous confirmer la disponibilité et le délai de livraison prévu.
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">Cachet & Visa du Pharmacien :</p>
                  <div className="mt-12 border-b border-dashed border-slate-300 w-48 ml-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
