import { getEchangesPharma, getBordereauxIpmPharma } from './actions'
import { InteropPharmaClient } from './InteropPharmaClient'

export default async function InteropPharmaPage() {
  const [{ echanges }, { bordereaux }] = await Promise.all([
    getEchangesPharma(),
    getBordereauxIpmPharma(),
  ])

  return <InteropPharmaClient echanges={echanges || []} bordereaux={bordereaux || []} />
}

