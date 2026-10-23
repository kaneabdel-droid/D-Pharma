'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserPlus,
  Key,
  Trash2,
  Copy,
  Check,
  MessageSquare,
  Shield,
  AlertCircle,
  Settings2,
  Phone,
  X,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  Stethoscope,
  Pill,
  ShoppingBag,
  Calculator,
  UserCheck
} from 'lucide-react'
import {
  creerCollaborateur,
  supprimerCollaborateur,
  genererLienResetCollaborateur,
  modifierRoleEtPermissionsCollaborateur,
} from './actions'
import PermissionsMatrix from '@/app/admin/(protected)/gies/[id]/PermissionsMatrix'
import { fullPermissions, sanitizePermissions, type PermissionMap } from '@/lib/permissions'

export type CollaborateurItem = {
  id: string
  role: string | null
  identifiant: string | null
  telephone: string | null
  nom_complet: string | null
  email: string | null
  permissions: PermissionMap | null
}

export const ROLES_PHARMACIE = [
  { value: 'pharmacien_assistant', label: 'Pharmacien Assistant / Adjoint' },
  { value: 'preparateur', label: 'Préparateur en Pharmacie' },
  { value: 'caissier', label: 'Caissier / Vendeur Comptoir' },
  { value: 'magasinier', label: 'Magasinier / Gestionnaire de stock' },
  { value: 'comptable', label: 'Comptable de l’officine' },
  { value: 'stagiaire', label: 'Stagiaire en pharmacie' },
  { value: 'admin', label: 'Co-Pharmacien Titulaire (Accès total)' },
  { value: 'autre', label: 'Autre rôle personnalisé...' },
]

function getRoleBadge(role: string | null) {
  const r = (role || 'collaborateur').toLowerCase()
  if (r === 'admin' || r.includes('titulaire')) {
    return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30'
  }
  if (r.includes('assistant') || r.includes('pharmacien')) {
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
  }
  if (r.includes('preparateur')) {
    return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
  }
  if (r.includes('caissier') || r.includes('vendeur')) {
    return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
  }
  if (r.includes('magasinier') || r.includes('stock')) {
    return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
  }
  if (r.includes('comptable')) {
    return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
  }
  return 'bg-surface-border/50 text-foreground border-surface-border'
}

function getRoleLabel(role: string | null) {
  if (!role) return 'Collaborateur'
  const found = ROLES_PHARMACIE.find((r) => r.value === role)
  if (found) return found.label
  return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ')
}

export default function CollaborateursSection({
  collaborateurs,
  currentUserId,
}: {
  collaborateurs: CollaborateurItem[]
  currentUserId: string
}) {
  const router = useRouter()
  const [collabList, setCollabList] = useState<CollaborateurItem[]>(collaborateurs)
  useEffect(() => {
    setCollabList(collaborateurs)
  }, [collaborateurs])

  const [showAddModal, setShowAddModal] = useState(false)
  const [addRole, setAddRole] = useState('pharmacien_assistant')
  const [addRoleCustom, setAddRoleCustom] = useState('')
  const [addRestrictPerms, setAddRestrictPerms] = useState(false)
  const [addCustomPerms, setAddCustomPerms] = useState<PermissionMap>(fullPermissions())
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false)

  const [createdSuccessInfo, setCreatedSuccessInfo] = useState<{
    nom: string
    identifiant: string
    telephone?: string | null
    email?: string | null
    passwordClair: string
    role: string
  } | null>(null)

  const [resetModalData, setResetModalData] = useState<{
    collab: CollaborateurItem
    link: string
    expirationDate: string
  } | null>(null)

  const [editPermsModal, setEditPermsModal] = useState<{
    collab: CollaborateurItem
    role: string
    roleCustom: string
    hasCustomPerms: boolean
    perms: PermissionMap
  } | null>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [, startTransition] = useTransition()

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2500)
  }

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmittingAdd(true)
    setActionError(null)

    const form = e.currentTarget
    const formData = new FormData(form)

    if (addRestrictPerms) {
      formData.set('permissions', JSON.stringify(addCustomPerms))
    } else {
      formData.delete('permissions')
    }

    const res = await creerCollaborateur(formData)
    setIsSubmittingAdd(false)

    if (res.error) {
      setActionError(res.error)
    } else if (res.collaborateur) {
      const createdItem: CollaborateurItem = {
        id: res.collaborateur.id,
        identifiant: res.collaborateur.identifiant,
        nom_complet: res.collaborateur.nom_complet,
        telephone: res.collaborateur.telephone,
        email: (formData.get('email') as string) || null,
        role: res.collaborateur.role,
        permissions: addRestrictPerms ? addCustomPerms : null,
      }

      setCollabList((prev) => [...prev, createdItem])
      setCreatedSuccessInfo({
        nom: res.collaborateur.nom_complet || res.collaborateur.identifiant,
        identifiant: res.collaborateur.identifiant,
        telephone: res.collaborateur.telephone,
        email: (formData.get('email') as string) || null,
        passwordClair: (formData.get('password') as string) || '',
        role: res.collaborateur.role,
      })

      setShowAddModal(false)
      form.reset()
      setAddRole('pharmacien_assistant')
      setAddRoleCustom('')
      setAddRestrictPerms(false)
      setAddCustomPerms(fullPermissions())
      startTransition(() => {
        router.refresh()
      })
    }
  }

  const handleSupprimer = async (collab: CollaborateurItem) => {
    const confirmation = window.confirm(
      `Êtes-vous sûr de vouloir révoquer l'accès de ${collab.nom_complet || collab.identifiant} ? Cette action est irréversible.`
    )
    if (!confirmation) return

    setDeletingId(collab.id)
    setActionError(null)

    const res = await supprimerCollaborateur(collab.id)
    setDeletingId(null)

    if (res.error) {
      setActionError(res.error)
    } else {
      setCollabList((prev) => prev.filter((c) => c.id !== collab.id))
      startTransition(() => {
        router.refresh()
      })
    }
  }

  const handleGenererReset = async (collab: CollaborateurItem) => {
    setActionError(null)
    const res = await genererLienResetCollaborateur(collab.id)
    if (res.error) {
      setActionError(res.error)
    } else if (res.link) {
      const exp = new Date(Date.now() + 24 * 3600 * 1000).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
      setResetModalData({
        collab,
        link: res.link,
        expirationDate: exp,
      })
    }
  }

  const handleOpenEditPerms = (collab: CollaborateurItem) => {
    const currentRole = collab.role || 'pharmacien_assistant'
    const isStandard = ROLES_PHARMACIE.some((r) => r.value === currentRole)
    const hasCustom = collab.permissions !== null
    const initialPerms = collab.permissions ? sanitizePermissions(collab.permissions) : fullPermissions()

    setEditPermsModal({
      collab,
      role: isStandard ? currentRole : 'autre',
      roleCustom: isStandard ? '' : currentRole,
      hasCustomPerms: hasCustom,
      perms: initialPerms,
    })
  }

  const handleSavePermsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editPermsModal) return
    setIsSubmittingAdd(true)
    setActionError(null)

    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('collaborateur_id', editPermsModal.collab.id)

    if (editPermsModal.hasCustomPerms) {
      formData.set('permissions', JSON.stringify(editPermsModal.perms))
    } else {
      formData.delete('permissions')
    }

    const res = await modifierRoleEtPermissionsCollaborateur(formData)
    setIsSubmittingAdd(false)

    if (res.error) {
      setActionError(res.error)
    } else {
      const updatedRole = res.role || editPermsModal.role
      const updatedPerms = editPermsModal.hasCustomPerms ? editPermsModal.perms : null

      setCollabList((prev) =>
        prev.map((c) =>
          c.id === editPermsModal.collab.id
            ? { ...c, role: updatedRole, permissions: updatedPerms }
            : c
        )
      )
      setEditPermsModal(null)
      startTransition(() => {
        router.refresh()
      })
    }
  }

  return (
    <div className="mt-10 pt-8 border-t border-surface-border space-y-6">
      {/* En-tête de section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-heading text-foreground">
              Équipe de l’Officine & Rôles
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {collabList.length} membre{collabList.length > 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs text-foreground-muted mt-1">
            Gérez les pharmaciens adjoints, préparateurs, caissiers et comptables habilités à opérer sur le logiciel.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAddModal(true)
            setActionError(null)
          }}
          className="btn-primary text-xs flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl font-bold shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>Ajouter un Collaborateur</span>
        </button>
      </div>

      {actionError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Bannière de confirmation post-création */}
      {createdSuccessInfo && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Compte créé pour {createdSuccessInfo.nom} ({getRoleLabel(createdSuccessInfo.role)})
            </span>
            <button
              onClick={() => setCreatedSuccessInfo(null)}
              className="text-emerald-700 dark:text-emerald-300 hover:opacity-75 font-bold"
            >
              &times; Fermer
            </button>
          </div>
          <div className="p-3 bg-surface rounded-xl border border-emerald-500/20 text-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
            <div>
              <p>Identifiant : <span className="font-bold text-primary">{createdSuccessInfo.identifiant}</span></p>
              <p>Mot de passe temporaire : <span className="font-bold">{createdSuccessInfo.passwordClair}</span></p>
              {createdSuccessInfo.telephone && <p>Téléphone : {createdSuccessInfo.telephone}</p>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `Bonjour ${createdSuccessInfo.nom},\nVoici vos accès à l'officine D-PHARMA :\nIdentifiant : ${createdSuccessInfo.identifiant}\nMot de passe : ${createdSuccessInfo.passwordClair}\nLien : ${window.location.origin}/login`,
                    'credentials'
                  )
                }
                className="px-2.5 py-1.5 rounded-lg border border-surface-border hover:bg-background flex items-center gap-1 text-[11px] font-sans"
              >
                {copiedKey === 'credentials' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                Copier les accès
              </button>
              {createdSuccessInfo.telephone && (
                <a
                  href={`https://wa.me/${createdSuccessInfo.telephone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `Bonjour ${createdSuccessInfo.nom},\nVoici vos identifiants D-PHARMA :\nIdentifiant : ${createdSuccessInfo.identifiant}\nMot de passe : ${createdSuccessInfo.passwordClair}\nLien : ${window.location.origin}/login`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 text-[11px] font-sans font-semibold"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grille / Liste des collaborateurs */}
      <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-sm">
        <div className="divide-y divide-surface-border">
          {collabList.map((collab) => {
            const isMe = collab.id === currentUserId
            const isTitulaire = collab.role === 'admin'

            return (
              <div
                key={collab.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-background/40 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {collab.nom_complet
                      ? collab.nom_complet.charAt(0).toUpperCase()
                      : (collab.identifiant || 'U').charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">
                        {collab.nom_complet || collab.identifiant || 'Collaborateur'}
                      </span>
                      {isMe && (
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-primary/15 text-primary font-bold">
                          Vous
                        </span>
                      )}
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold ${getRoleBadge(
                          collab.role
                        )}`}
                      >
                        {getRoleLabel(collab.role)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-foreground-muted mt-1 flex-wrap">
                      {collab.identifiant && (
                        <span className="font-mono text-[11px] bg-background px-1.5 py-0.5 rounded border border-surface-border">
                          @{collab.identifiant}
                        </span>
                      )}
                      {collab.telephone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-foreground-muted/70" />
                          {collab.telephone}
                        </span>
                      )}
                      {collab.permissions ? (
                        <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Droits restreints
                        </span>
                      ) : (
                        <span className="text-[11px] text-foreground-muted/80">Accès standard</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Boutons d'actions */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleOpenEditPerms(collab)}
                    className="p-2 rounded-xl border border-surface-border text-foreground-muted hover:text-foreground hover:bg-background transition-colors text-xs flex items-center gap-1.5 font-medium"
                    title="Modifier rôle & permissions"
                  >
                    <Settings2 className="w-4 h-4 text-foreground-muted" />
                    <span className="hidden md:inline">Rôle & Droits</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenererReset(collab)}
                    className="p-2 rounded-xl border border-surface-border text-foreground-muted hover:text-foreground hover:bg-background transition-colors text-xs flex items-center gap-1.5 font-medium"
                    title="Réinitialiser le mot de passe"
                  >
                    <Key className="w-4 h-4 text-foreground-muted" />
                    <span className="hidden md:inline">Mot de passe</span>
                  </button>

                  {!isMe && (
                    <button
                      type="button"
                      disabled={deletingId === collab.id}
                      onClick={() => handleSupprimer(collab)}
                      className="p-2 rounded-xl border border-surface-border text-danger hover:bg-danger/10 transition-colors text-xs disabled:opacity-50"
                      title="Révoquer l'accès"
                    >
                      {deletingId === collab.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* MODAL : AJOUT D'UN COLLABORATEUR */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-surface-border p-6 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-surface-border">
              <h3 className="font-bold font-heading text-lg text-foreground flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Ajouter un Membre de l’Équipe
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-foreground-muted hover:text-foreground text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground-muted uppercase mb-1">
                  Nom et Prénom *
                </label>
                <input
                  type="text"
                  name="nom_complet"
                  required
                  placeholder="Ex: Dr. Fatou Ndiaye"
                  className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground-muted uppercase mb-1">
                    Identifiant de connexion *
                  </label>
                  <input
                    type="text"
                    name="identifiant"
                    required
                    placeholder="Ex: fatou.ndiaye"
                    className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="text-[10px] text-foreground-muted">Sans espaces ni accents</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground-muted uppercase mb-1">
                    Téléphone (WhatsApp)
                  </label>
                  <input
                    type="text"
                    name="telephone"
                    placeholder="Ex: +221 77 123 45 67"
                    className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground-muted uppercase mb-1">
                  Rôle au sein de l’officine *
                </label>
                <select
                  name="role"
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {ROLES_PHARMACIE.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {addRole === 'autre' && (
                <div>
                  <label className="block text-xs font-bold text-foreground-muted uppercase mb-1">
                    Intitulé du rôle personnalisé *
                  </label>
                  <input
                    type="text"
                    name="role_custom"
                    value={addRoleCustom}
                    onChange={(e) => setAddRoleCustom(e.target.value)}
                    required
                    placeholder="Ex: Responsable Parapharmacie"
                    className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-foreground-muted uppercase mb-1">
                  Mot de passe initial *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    minLength={6}
                    placeholder="Minimum 6 caractères"
                    className="w-full px-3 py-2 pr-10 rounded-xl border border-surface-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-foreground-muted hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Option personnalisation fine des permissions */}
              <div className="pt-2 border-t border-surface-border space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={addRestrictPerms}
                    onChange={(e) => setAddRestrictPerms(e.target.checked)}
                    className="rounded border-surface-border text-primary focus:ring-primary"
                  />
                  <span>Restreindre ou personnaliser les droits d’accès aux modules</span>
                </label>

                {addRestrictPerms && (
                  <div className="p-3 rounded-xl bg-background border border-surface-border mt-2">
                    <PermissionsMatrix
                      value={addCustomPerms}
                      onChange={(next) => setAddCustomPerms(next)}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-surface-border text-foreground text-xs font-semibold hover:bg-background"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingAdd && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Créer le Compte Collaborateur</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : MODIFIER RÔLE & PERMISSIONS */}
      {editPermsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-surface-border p-6 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-surface-border">
              <h3 className="font-bold font-heading text-lg text-foreground flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                Rôle & Permissions : {editPermsModal.collab.nom_complet || editPermsModal.collab.identifiant}
              </h3>
              <button
                type="button"
                onClick={() => setEditPermsModal(null)}
                className="text-foreground-muted hover:text-foreground text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSavePermsSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground-muted uppercase mb-1">
                  Rôle de l’utilisateur
                </label>
                <select
                  name="role"
                  value={editPermsModal.role}
                  onChange={(e) =>
                    setEditPermsModal((prev) => (prev ? { ...prev, role: e.target.value } : null))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {ROLES_PHARMACIE.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {editPermsModal.role === 'autre' && (
                <div>
                  <label className="block text-xs font-bold text-foreground-muted uppercase mb-1">
                    Intitulé personnalisé
                  </label>
                  <input
                    type="text"
                    name="role_custom"
                    value={editPermsModal.roleCustom}
                    onChange={(e) =>
                      setEditPermsModal((prev) => (prev ? { ...prev, roleCustom: e.target.value } : null))
                    }
                    required
                    className="w-full px-3 py-2 rounded-xl border border-surface-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-surface-border space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={editPermsModal.hasCustomPerms}
                    onChange={(e) =>
                      setEditPermsModal((prev) =>
                        prev ? { ...prev, hasCustomPerms: e.target.checked } : null
                      )
                    }
                    className="rounded border-surface-border text-primary focus:ring-primary"
                  />
                  <span>Activer des restrictions personnalisées sur les modules</span>
                </label>

                {editPermsModal.hasCustomPerms && (
                  <div className="p-3 rounded-xl bg-background border border-surface-border mt-2">
                    <PermissionsMatrix
                      value={editPermsModal.perms}
                      onChange={(next) =>
                        setEditPermsModal((prev) => (prev ? { ...prev, perms: next } : null))
                      }
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setEditPermsModal(null)}
                  className="px-4 py-2 rounded-xl border border-surface-border text-foreground text-xs font-semibold hover:bg-background"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingAdd && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Enregistrer les Droits</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : LIEN DE RÉINITIALISATION DE MOT DE PASSE */}
      {resetModalData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-surface-border p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <h3 className="font-bold font-heading text-lg text-foreground flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                Lien de Connexion / Réinitialisation
              </h3>
              <button
                type="button"
                onClick={() => setResetModalData(null)}
                className="text-foreground-muted hover:text-foreground text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <p className="text-foreground-muted">
                Transmettez ce lien sécurisé à{' '}
                <strong className="text-foreground">
                  {resetModalData.collab.nom_complet || resetModalData.collab.identifiant}
                </strong>
                . Il lui permettra de se connecter directement et de définir un nouveau mot de passe.
              </p>

              <div className="p-3 bg-background rounded-xl border border-surface-border font-mono text-[11px] break-all select-all">
                {resetModalData.link}
              </div>

              <p className="text-[11px] text-amber-600">
                Ce lien est valable 24 heures (jusqu’au {resetModalData.expirationDate}).
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(resetModalData.link, 'resetLink')}
                  className="btn-primary flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  {copiedKey === 'resetLink' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Lien Copié !
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copier le Lien
                    </>
                  )}
                </button>

                {resetModalData.collab.telephone && (
                  <a
                    href={`https://wa.me/${resetModalData.collab.telephone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Bonjour,\nVoici votre lien de connexion sécurisé D-PHARMA :\n${resetModalData.link}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-1.5 font-bold"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
