import React from 'react'
import type { Metadata } from 'next'
import { AssistantImport, type TypeImportOption } from '@/components/import/AssistantImport'
import { importerDonneesPharma } from './actions'

export const metadata: Metadata = {
  title: 'Importer des données existantes — D-PHARMA',
}

const OPTIONS_PHARMA: TypeImportOption[] = [
  {
    id: 'medicaments',
    titre: 'Médicaments & Stocks initiaux',
    description: 'Catalogue complet, code-barres, principe actif, quantités et prix de vente',
    icone: 'medicament',
    nomFichierModele: 'modele_import_medicaments_stocks.csv',
    modeleCSV: `nom;code_barres;principe_actif;description;soumis_ordonnance;quantite;prix_vente;lot;date_peremption
Paracétamol 500mg boîte 16;3400930000012;Paracétamol;Antalgique antipyrétique;non;150;1200;LOT-2026-A1;2027-12-31
Amoxicilline 1g boîte 14;3400930000029;Amoxicilline;Antibiotique poudre suspension;oui;80;3500;LOT-2026-B2;2026-11-30
Ibuprofène 400mg boîte 20;3400930000036;Ibuprofène;Anti-inflammatoire non stéroïdien;non;120;1800;LOT-2026-C3;2027-06-30
Sérum Physiologique 500ml;3400930000043;Chlorure de sodium;Solution perfusion;non;200;950;LOT-2026-D4;2028-01-31`
  },
  {
    id: 'fournisseurs',
    titre: 'Laboratoires & Grossistes',
    description: 'Fournisseurs pharmaceutiques habituels, emails, téléphones et adresses',
    icone: 'fournisseur',
    nomFichierModele: 'modele_import_fournisseurs_labo.csv',
    modeleCSV: `nom;contact_email;contact_telephone;adresse
COPHARMA SENEGAL;commandes@copharma.sn;+221 33 800 00 00;Km 4 Boulevard du Centenaire, Dakar
LABOREX SENEGAL;contact@laborex.sn;+221 33 839 50 50;Zone Industrielle Bel-Air, Dakar
UBIPHARM SENEGAL;direction@ubipharm-sn.com;+221 33 849 70 70;Zone Franche Industrielle, Dakar`
  },
  {
    id: 'clients',
    titre: 'Clients & Patients',
    description: 'Fichier clients réguliers, ordonnanciers, téléphones et adresses',
    icone: 'client',
    nomFichierModele: 'modele_import_clients.csv',
    modeleCSV: `nom;telephone;email;adresse
Moussa Diop;+221 77 123 45 67;moussa.diop@gmail.com;Pikine Tally Boumack, Dakar
Aïssatou Sow;+221 78 456 78 90;aissatou.sow@yahoo.fr;Mariste Villa 142, Dakar
Mamadou Ba;+221 76 654 32 10;;Médina Rue 22 x 11, Dakar`
  }
]

export default function PageImportPharma() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AssistantImport
        nomApplication="D-PHARMA"
        titreModule="Assistant d'Importation de Données Existantes"
        optionsTypes={OPTIONS_PHARMA}
        onImporter={importerDonneesPharma}
      />
    </div>
  )
}
