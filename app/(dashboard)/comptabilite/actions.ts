'use server'

import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import { revalidatePath } from 'next/cache'

export type LigneEcriture = {
  compte: string
  libelle: string
  debit: number
  credit: number
}

// 1. Récupération des écritures comptables
export async function getEcritures(journal?: string) {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  if (!tenant) return { ecritures: [], error: 'Non authentifié' }

  try {
    let query = supabase
      .from('ecritures_comptables')
      .select('id, journal, date_ecriture, numero_piece, libelle, validee, created_at, lignes_ecritures_comptables(id, compte, libelle, debit, credit)')
      .eq('gie_id', tenant.gieId)
      .order('date_ecriture', { ascending: false })
      .order('created_at', { ascending: false })

    if (journal && journal !== 'tous') {
      query = query.eq('journal', journal)
    }

    const { data, error } = await query

    if (error) {
      console.warn('Erreur lecture ecritures_comptables:', error.message)
      return { ecritures: [], error: error.message }
    }

    return { ecritures: data || [] }
  } catch (err: any) {
    return { ecritures: [], error: err?.message || 'Erreur inconnue' }
  }
}

// 2. Ajout d'une écriture comptable équilibrée
export async function ajouterEcriture(formData: FormData) {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  if (!tenant) return { error: 'Non authentifié' }

  const journal = (formData.get('journal') as string) || 'od'
  const dateEcriture = (formData.get('date_ecriture') as string) || new Date().toISOString().split('T')[0]
  const numeroPiece = ((formData.get('numero_piece') as string) || '').trim()
  const libelle = ((formData.get('libelle') as string) || '').trim()

  const compteDebit = (formData.get('compte_debit') as string) || ''
  const compteCredit = (formData.get('compte_credit') as string) || ''
  const montant = parseFloat(formData.get('montant') as string || '0')

  if (!libelle) return { error: 'Le libellé de l’écriture est obligatoire' }
  if (!compteDebit || !compteCredit) return { error: 'Veuillez sélectionner un compte de débit et un compte de crédit' }
  if (compteDebit === compteCredit) return { error: 'Le compte débité et le compte crédité doivent être distincts' }
  if (isNaN(montant) || montant <= 0) return { error: 'Le montant doit être supérieur à zéro' }

  try {
    // 1. Insertion de l'entête d'écriture
    const { data: ecriture, error: errEcriture } = await supabase
      .from('ecritures_comptables')
      .insert({
        gie_id: tenant.gieId,
        journal,
        date_ecriture: dateEcriture,
        numero_piece: numeroPiece || null,
        libelle,
        validee: true,
      })
      .select('id')
      .single()

    if (errEcriture || !ecriture) {
      return { error: errEcriture?.message || 'Impossible de créer l’écriture' }
    }

    // 2. Insertion des deux lignes (Partie double équilibrée)
    const { error: errLignes } = await supabase
      .from('lignes_ecritures_comptables')
      .insert([
        {
          ecriture_id: ecriture.id,
          gie_id: tenant.gieId,
          compte: compteDebit,
          libelle,
          debit: montant,
          credit: 0,
        },
        {
          ecriture_id: ecriture.id,
          gie_id: tenant.gieId,
          compte: compteCredit,
          libelle,
          debit: 0,
          credit: montant,
        },
      ])

    if (errLignes) {
      // Nettoyage si erreur
      await supabase.from('ecritures_comptables').delete().eq('id', ecriture.id)
      return { error: errLignes.message }
    }

    revalidatePath('/comptabilite')
    revalidatePath('/comptabilite/balance')
    revalidatePath('/comptabilite/resultat')
    return { success: true }
  } catch (err: any) {
    return { error: err?.message || 'Erreur lors de l’enregistrement de l’écriture' }
  }
}

// 3. Plan comptable
export async function getPlanComptable() {
  const supabase = await createClient()
  const tenant = await getTenantContext()

  try {
    const { data, error } = await supabase
      .from('plan_comptable_pharma')
      .select('*')
      .order('compte', { ascending: true })

    if (error) return { plan: [], error: error.message }
    return { plan: data || [] }
  } catch (err: any) {
    return { plan: [], error: err?.message }
  }
}

// 4. Calcul de la Balance générale des comptes
export async function getBalance() {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  if (!tenant) return { balance: [], totaux: { debit: 0, credit: 0, soldeDebiteur: 0, soldeCrediteur: 0 }, error: 'Non authentifié' }

  try {
    const [{ data: plan }, { data: lignes }] = await Promise.all([
      supabase.from('plan_comptable_pharma').select('compte, libelle, classe, type'),
      supabase.from('lignes_ecritures_comptables').select('compte, debit, credit').eq('gie_id', tenant.gieId),
    ])

    const planMap = new Map((plan || []).map((p) => [p.compte, p]))
    const agregats = new Map<string, { compte: string; libelle: string; classe: number; debit: number; credit: number }>()

    for (const ligne of lignes || []) {
      const c = ligne.compte
      const p = planMap.get(c)
      const existant = agregats.get(c) || {
        compte: c,
        libelle: p?.libelle || `Compte ${c}`,
        classe: p?.classe || Number(c[0]) || 0,
        debit: 0,
        credit: 0,
      }
      existant.debit += Number(ligne.debit || 0)
      existant.credit += Number(ligne.credit || 0)
      agregats.set(c, existant)
    }

    const balance = Array.from(agregats.values()).map((item) => {
      const solde = item.debit - item.credit
      return {
        ...item,
        soldeDebiteur: solde > 0 ? solde : 0,
        soldeCrediteur: solde < 0 ? Math.abs(solde) : 0,
      }
    }).sort((a, b) => a.compte.localeCompare(b.compte))

    const totaux = balance.reduce(
      (acc, cur) => ({
        debit: acc.debit + cur.debit,
        credit: acc.credit + cur.credit,
        soldeDebiteur: acc.soldeDebiteur + cur.soldeDebiteur,
        soldeCrediteur: acc.soldeCrediteur + cur.soldeCrediteur,
      }),
      { debit: 0, credit: 0, soldeDebiteur: 0, soldeCrediteur: 0 }
    )

    return { balance, totaux }
  } catch (err: any) {
    return { balance: [], totaux: { debit: 0, credit: 0, soldeDebiteur: 0, soldeCrediteur: 0 }, error: err?.message }
  }
}

// 5. Compte de résultat officinal (Produits 7xx - Charges 6xx)
export async function getResultatOfficinal() {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  if (!tenant) return { produits: [], charges: [], margeBrute: 0, resultatNet: 0, totalProduits: 0, totalCharges: 0 }

  try {
    const { balance } = await getBalance()

    const produits = balance.filter((b) => b.compte.startsWith('7'))
    const charges = balance.filter((b) => b.compte.startsWith('6'))

    const totalProduits = produits.reduce((sum, p) => sum + (p.credit - p.debit), 0)
    const totalCharges = charges.reduce((sum, c) => sum + (c.debit - c.credit), 0)

    const achatsMedicaments = charges
      .filter((c) => c.compte.startsWith('601') || c.compte.startsWith('602'))
      .reduce((sum, c) => sum + (c.debit - c.credit), 0)

    const margeBrute = totalProduits - achatsMedicaments
    const resultatNet = totalProduits - totalCharges

    return {
      produits,
      charges,
      totalProduits,
      totalCharges,
      achatsMedicaments,
      margeBrute,
      resultatNet,
    }
  } catch (err) {
    return { produits: [], charges: [], margeBrute: 0, resultatNet: 0, totalProduits: 0, totalCharges: 0 }
  }
}
