'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { addCompte } from './actions'

export default function AddCompteModal({ 
  dict, 
  onSuccess, 
  buttonLabel,
  defaultType = 'caisse'
}: { 
  dict: any
  onSuccess?: (newCompte: any) => void
  buttonLabel?: string
  defaultType?: 'caisse' | 'banque' | 'mobile_money'
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [typeCompte, setTypeCompte] = useState<string>(defaultType)
  const d = dict.tresorerie_extra || {}

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    const nom = formData.get('nom') as string
    const type_compte = formData.get('type_compte') as string
    const solde_initial = Number(formData.get('solde_initial') || 0)

    const res = await addCompte(nom, type_compte, solde_initial)
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsOpen(false)
      if (onSuccess && (res as any)?.compte) {
        onSuccess((res as any).compte)
      }
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-x-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
      >
        <Plus className="-ml-0.5 h-5 w-5" aria-hidden="true" />
        {buttonLabel || d.add_account_btn}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  {typeCompte === 'caisse' ? 'Nouveau Poste / Caisse de Vente' : d.modal?.title || 'Ajouter un compte'}
                </h3>
                <form id="add-compte-form" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="type_compte" className="block text-sm font-medium text-foreground">{d.modal?.type || 'Type de compte'}</label>
                    <select
                      name="type_compte"
                      id="type_compte"
                      value={typeCompte}
                      onChange={(e) => setTypeCompte(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm font-semibold"
                    >
                      <option value="caisse">🪙 Caisse / Poste de Vente Comptoir</option>
                      <option value="banque">🏛️ Compte Bancaire (CBAO, SGBS, BOA...)</option>
                      <option value="mobile_money">📱 Compte Mobile Money (Wave, Orange Money, Free...)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="nom" className="block text-sm font-medium text-foreground">
                      {typeCompte === 'caisse' ? 'Nom du poste ou de la caisse *' : (d.modal?.name || 'Nom du compte *')}
                    </label>
                    <input
                      type="text"
                      name="nom"
                      id="nom"
                      required
                      placeholder={typeCompte === 'caisse' ? 'Ex : Poste 4 - Caisse Parapharmacie' : (d.modal?.name_placeholder || 'Ex : Compte Courant')}
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    />
                    {typeCompte === 'caisse' && (
                      <p className="mt-1 text-xs text-foreground-muted">
                        💡 Cette caisse pourra être sélectionnée directement au Point de Vente (POS) comme poste actif pour isoler les encaissements et les clôtures de caisse.
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="solde_initial" className="block text-sm font-medium text-foreground">
                      {typeCompte === 'caisse' ? 'Fond de caisse initial (FCFA)' : (d.modal?.initial_balance || 'Solde initial')}
                    </label>
                    <input
                      type="number"
                      name="solde_initial"
                      id="solde_initial"
                      defaultValue={0}
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm font-mono"
                    />
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form="add-compte-form"
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? dict.common.creating : dict.common.create}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto"
                >
                  {dict.common.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
