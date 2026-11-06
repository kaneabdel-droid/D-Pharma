import { getPlanComptable } from '../actions'
import PlanComptableClient from './PlanComptableClient'

export const metadata = {
  title: 'Plan Comptable SYSCOHADA | D-PHARMA',
}

export const dynamic = 'force-dynamic'

export default async function PlanComptablePage() {
  const { plan = [], error } = await getPlanComptable()

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
        Erreur lors du chargement du plan comptable : {error}
      </div>
    )
  }

  return <PlanComptableClient initialPlan={plan || []} />
}
