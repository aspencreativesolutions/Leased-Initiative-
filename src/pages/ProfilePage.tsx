import { useEffect, useState } from 'react'
import { KeyRound, Save } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { CompanyDetailsPanel } from '@/components/profile/CompanyDetailsPanel'
import { LeaseUploadSection } from '@/components/profile/LeaseUploadSection'
import { ProfileLegalSection } from '@/components/legal/ProfileLegalSection'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/FormField'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'
import { formatDate } from '@/lib/utils'

export function ProfilePage() {
  const { user, updateProfile, changePassword } = useAuth()

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

  return (
    <div className="w-full min-w-0">
      <PageHeader
        title="Company Profile"
        subtitle="Company details, rental-type and renter breakdowns, account settings, and lease import. Manage rentals from the Rentals page."
      />

      <div className="w-full min-w-0 space-y-6">
        <CompanyDetailsPanel />

        <LeaseUploadSection />

        <Card>
          <CardHeader
            title="Account"
            subtitle={`Login, display name, and password · Member since ${formatDate(user.createdAt.split('T')[0])}`}
          />
          <div className="space-y-8">
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

            <form onSubmit={handleNameSubmit} className="space-y-4 border-t border-line pt-6">
              <div>
                <h3 className="text-sm font-semibold text-ink">Display name</h3>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Shown in the navigation and across the app
                </p>
              </div>
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
            </form>

            <form onSubmit={handlePasswordSubmit} className="space-y-4 border-t border-line pt-6">
              <div>
                <h3 className="text-sm font-semibold text-ink">Change password</h3>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Enter your current password, then choose a new one
                </p>
              </div>
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
            </form>
          </div>
        </Card>

        <ProfileLegalSection />
      </div>
    </div>
  )
}
