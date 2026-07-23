import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, FolderKanban, KeyRound, Save, UserCircle } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/FormField'
import { ServiceTierBadge } from '@/components/scheduler/ServiceTierBadge'
import { ProfileLegalSection } from '@/components/legal/ProfileLegalSection'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'
import { contractSectionHref } from '@/lib/contractSections'
import { fetchPortalProfile, updatePortalProfile } from '@/lib/portalProfileApi'
import { getServiceTierInfo } from '@/lib/serviceTierInfo'
import { migrateServiceTier } from '@/lib/serviceTiers'
import { formatDate } from '@/lib/utils'
import type { PortalProfile } from '@/lib/portalProfileApi'

export function PortalProfilePage() {
  const { user, changePassword, refreshUser } = useAuth()
  const [profile, setProfile] = useState<PortalProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchPortalProfile()
      setProfile(data)
      setName(data.name)
      setPhone(data.phone)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load profile')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setProfileError('')
    const trimmedName = name.trim()
    const trimmedPhone = phone.trim()
    if (!trimmedName) {
      setProfileError('Name is required')
      return
    }
    if (trimmedName === profile.name && trimmedPhone === profile.phone) return

    setProfileSaving(true)
    try {
      const updated = await updatePortalProfile({
        name: trimmedName,
        phone: trimmedPhone,
      })
      setProfile(updated)
      await refreshUser()
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : 'Could not save profile')
    } finally {
      setProfileSaving(false)
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

  if (loading) {
    return <div className="py-16 text-center text-ink-muted">Loading your profile…</div>
  }

  if (error || !profile) {
    return (
      <EmptyState
        icon={UserCircle}
        title="Could not load profile"
        description={error || 'Something went wrong'}
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="My Profile"
        subtitle="Account details, credentials, and your active projects"
      />

      <div className="space-y-6">
        <Card>
          <CardHeader title="Account" subtitle="Your sign-in email" />
          <Input
            label="Email"
            type="email"
            value={profile.email}
            readOnly
            hint="Contact your landlord if you need to change your login email."
          />
        </Card>

        <form onSubmit={handleProfileSubmit}>
          <Card>
            <CardHeader
              title="Personal details"
              subtitle="Update how your landlord sees you on project files and leases"
            />
            <div className="space-y-4">
              {profileError && (
                <div className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
                  {profileError}
                </div>
              )}
              <Input
                label="Full name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setProfileSaved(false)
                }}
                required
                autoComplete="name"
              />
              <Input
                label="Phone number"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  setProfileSaved(false)
                }}
                placeholder="(555) 123-4567"
                autoComplete="tel"
              />
              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={
                    profileSaving ||
                    (name.trim() === profile.name && phone.trim() === profile.phone)
                  }
                >
                  <Save className="h-4 w-4" />
                  {profileSaving ? 'Saving…' : 'Save details'}
                </Button>
                {profileSaved && (
                  <span className="text-sm font-medium text-brand">Profile updated.</span>
                )}
              </div>
            </div>
          </Card>
        </form>

        <form onSubmit={handlePasswordSubmit}>
          <Card>
            <CardHeader
              title="Password"
              subtitle="Change the password you use to sign in to the portal"
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
                  className="[&>label]:min-h-[2.75rem]"
                  label="New password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                />
                <Input
                  className="[&>label]:min-h-[2.75rem]"
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

        <section>
          <h2 className="label-caps mb-3 flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            My Projects
          </h2>

          {!profile.linked ? (
            <Card padding="md">
              <p className="text-sm text-ink-muted">
                Your landlord hasn&apos;t linked your account to a project yet. Once accepted,
                your projects, service tier, and lease details will appear here.
              </p>
            </Card>
          ) : profile.projects.length === 0 ? (
            <Card padding="md">
              <p className="text-sm text-ink-muted">
                No leases have been sent yet. When your landlord shares a lease, it will
                show up here with your service tier and developer contact.
              </p>
            </Card>
          ) : (
            <ul className="space-y-4">
              {profile.projects.map((project) => {
                const tier = migrateServiceTier(project.serviceTier)
                const tierInfo = getServiceTierInfo(tier)
                return (
                  <li key={project.contractId}>
                    <Card padding="lg">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-display text-lg font-semibold text-ink">
                            {project.projectTitle}
                          </h3>
                          <p className="mt-1 text-sm text-ink-muted">
                            Developer:{' '}
                            <span className="font-medium text-ink">
                              {project.developerName}
                            </span>
                            {project.businessName ? ` · ${project.businessName}` : ''}
                          </p>
                          {project.sentAt && (
                            <p className="mt-0.5 text-xs text-ink-faint">
                              Lease sent {formatDate(project.sentAt)}
                              {project.signedAt
                                ? ` · Signed ${formatDate(project.signedAt)}`
                                : ''}
                            </p>
                          )}
                        </div>
                        <ServiceTierBadge tier={tier} />
                      </div>

                      <p className="mt-1 text-sm font-medium text-ink">{tierInfo.tagline}</p>

                      <p className="mt-3 text-sm text-ink-muted">{tierInfo.summary}</p>

                      <ul className="mt-3 space-y-2">
                        {tierInfo.details.map((detail) => (
                          <li key={detail.sectionId} className="text-sm">
                            <Link
                              to={contractSectionHref(project.contractId, detail.sectionId)}
                              className="inline-flex items-center gap-1.5 text-brand hover:underline"
                            >
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              {detail.label}
                            </Link>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-4">
                        <Link to={`/portal/contracts/${project.contractId}`}>
                          <Button size="sm" variant="outline">
                            View full lease
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <ProfileLegalSection />

        {user && (
          <p className="text-xs text-ink-faint">
            Member since {formatDate(user.createdAt.split('T')[0])}
          </p>
        )}
      </div>
    </div>
  )
}
