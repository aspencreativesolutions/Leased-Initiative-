import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, KeyRound, Save, UserCircle, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/FormField'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { OfficialClientBadge } from '@/components/clients/OfficialClientBadge'
import { PendingClientBadge } from '@/components/clients/PendingClientBadge'
import { ProfileRemindersSection } from '@/components/profile/ProfileRemindersSection'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { countOfficialClients } from '@/lib/clientUtils'
import { ApiError } from '@/lib/api'
import { formatDate } from '@/lib/utils'

export function ProfilePage() {
  const { user, updateProfile, changePassword } = useAuth()
  const { clients } = useApp()

  const [name, setName] = useState(user?.name ?? '')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [nameError, setNameError] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    if (user) setName(user.name)
  }, [user])

  if (!user) return null

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameError('')
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError('Name is required')
      return
    }
    if (trimmed === user.name) return

    setNameSaving(true)
    try {
      await updateProfile(trimmed)
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 3000)
    } catch (err) {
      setNameError(err instanceof ApiError ? err.message : 'Could not update name')
    } finally {
      setNameSaving(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters')
      return
    }

    setPasswordSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSaved(true)
      setTimeout(() => setPasswordSaved(false), 3000)
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'Could not change password')
    } finally {
      setPasswordSaving(false)
    }
  }

  const officialCount = countOfficialClients(clients)

  return (
    <div className="w-full min-w-0">
      <PageHeader
        title="My Profile"
        subtitle="Your studio login, account settings, and current client roster."
      />

      <div className="w-full min-w-0 space-y-6">
        <Card>
          <CardHeader
            title="Account"
            subtitle={`Member since ${formatDate(user.createdAt.split('T')[0])}`}
          />
          <div className="space-y-4">
            <Input
              label="Login email"
              type="email"
              value={user.email}
              readOnly
              hint="Your sign-in email cannot be changed here."
            />
            <Input
              label="Password"
              type="password"
              value="••••••••"
              readOnly
              hint="Your password is stored securely and cannot be displayed. Use the form below to change it."
            />
          </div>
        </Card>

        <form onSubmit={handleNameSubmit}>
          <Card>
            <CardHeader title="Display name" subtitle="Shown in the navigation and across the app" />
            <div className="space-y-4">
              {nameError && (
                <div className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
                  {nameError}
                </div>
              )}
              <Input
                label="Full name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setNameSaved(false)
                }}
                required
                autoComplete="name"
              />
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={nameSaving || name.trim() === user.name}>
                  <Save className="h-4 w-4" />
                  {nameSaving ? 'Saving…' : 'Save name'}
                </Button>
                {nameSaved && (
                  <span className="text-sm font-medium text-brand">Name updated.</span>
                )}
              </div>
            </div>
          </Card>
        </form>

        <form onSubmit={handlePasswordSubmit}>
          <Card>
            <CardHeader
              title="Change password"
              subtitle="Enter your current password, then choose a new one"
            />
            <div className="space-y-4">
              {passwordError && (
                <div className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
                  {passwordError}
                </div>
              )}
              {passwordSaved && (
                <div className="rounded-sm border-2 border-brand bg-brand/10 px-3 py-2 text-sm text-brand">
                  Password updated successfully.
                </div>
              )}
              <Input
                label="Current password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="New password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  hint="At least 8 characters"
                />
                <Input
                  label="Confirm new password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" disabled={passwordSaving}>
                <KeyRound className="h-4 w-4" />
                {passwordSaving ? 'Updating…' : 'Update password'}
              </Button>
            </div>
          </Card>
        </form>

        <ProfileRemindersSection />

        <Card>
          <CardHeader
            title="My clients"
            subtitle={`${officialCount} client${officialCount !== 1 ? 's' : ''} · ${clients.length} total in your roster`}
          />
          {clients.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No clients yet"
              description="Clients you add will appear here and across the dashboard."
              action={
                <Link to="/clients">
                  <Button>
                    <UserCircle className="h-4 w-4" />
                    Go to Clients
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink/10">
              <table className="w-full table-auto text-left text-sm">
                <thead>
                  <tr className="border-b-[length:var(--border-width)] border-ink bg-surface">
                    <th className="label-caps px-3 py-2.5 sm:px-4">Client</th>
                    <th className="label-caps px-3 py-2.5 hidden md:table-cell sm:px-4">Project</th>
                    <th className="label-caps px-3 py-2.5 sm:px-4">Status</th>
                    <th className="label-caps px-3 py-2.5 sm:px-4">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-surface transition-colors">
                      <td className="px-3 py-2.5 align-top sm:px-4">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Link
                            to={`/clients/${client.id}`}
                            className="truncate font-semibold text-ink hover:text-brand hover:underline"
                          >
                            {client.name}
                          </Link>
                          {client.isOfficialClient ? (
                            <OfficialClientBadge />
                          ) : (
                            <PendingClientBadge />
                          )}
                        </div>
                        <p className="truncate text-xs text-ink-muted">{client.businessName}</p>
                      </td>
                      <td className="hidden md:table-cell px-3 py-2.5 align-top sm:px-4">
                        <p className="break-words font-medium text-ink">
                          {client.projectName || '—'}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 align-top sm:px-4">
                        <StatusBadge type="project" status={client.projectStatus} />
                      </td>
                      <td className="px-3 py-2.5 align-top sm:px-4">
                        <Link to={`/clients/${client.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden xl:inline">View</span>
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
