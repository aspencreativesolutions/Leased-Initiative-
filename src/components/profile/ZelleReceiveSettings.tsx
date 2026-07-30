import { useEffect, useState } from 'react'
import { Check, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/FormField'
import { useApp } from '@/context/AppContext'
import { PaymentProviderLogo } from '@/components/payments/PaymentProviderLogo'

function isLikelyZelleHandle(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (trimmed.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed.toLowerCase())
  }
  const digits = trimmed.replace(/\D/g, '')
  return /^1?\d{10}$/.test(digits)
}

/** Landlord connects a Zelle email/phone for guided bank-transfer invoices. */
export function ZelleReceiveSettings() {
  const { settings, updateSettings } = useApp()
  const [handle, setHandle] = useState(settings.zelleHandle ?? '')
  const [confirmHandle, setConfirmHandle] = useState(settings.zelleHandle ?? '')
  const [displayName, setDisplayName] = useState(settings.zelleDisplayName ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setHandle(settings.zelleHandle ?? '')
    setConfirmHandle(settings.zelleHandle ?? '')
    setDisplayName(settings.zelleDisplayName ?? '')
  }, [settings.zelleHandle, settings.zelleDisplayName])

  const connected = Boolean(settings.zelleHandle?.trim())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const trimmed = handle.trim()
    const confirm = confirmHandle.trim()
    if (!trimmed) {
      setError('Enter the email or phone enrolled with Zelle.')
      return
    }
    if (!isLikelyZelleHandle(trimmed)) {
      setError('Use a valid email address or 10-digit US phone number.')
      return
    }
    if (trimmed.includes('@')) {
      if (trimmed.toLowerCase() !== confirm.toLowerCase()) {
        setError('Zelle handle and confirmation do not match.')
        return
      }
    } else if (trimmed.replace(/\D/g, '') !== confirm.replace(/\D/g, '')) {
      setError('Zelle handle and confirmation do not match.')
      return
    }

    setSaving(true)
    try {
      updateSettings({
        zelleHandle: trimmed,
        zelleDisplayName: displayName.trim() || undefined,
        zelleConnectedAt: new Date().toISOString(),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Could not save Zelle settings.')
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = () => {
    setError('')
    updateSettings({
      zelleHandle: '',
      zelleDisplayName: '',
      zelleConnectedAt: undefined,
    })
    setHandle('')
    setConfirmHandle('')
    setDisplayName('')
  }

  return (
    <Card>
      <CardHeader
        title="Receive Zelle"
        subtitle="Tenants who prefer Zelle see this handle on their portal pay page. No API keys — enroll the email or phone with your bank first."
      />
      <div className="px-4 pb-2 sm:px-6">
        <PaymentProviderLogo provider="zelle" size="sm" />
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-5 sm:px-6">
        {connected ? (
          <p className="rounded-[var(--radius-sm)] border border-line bg-surface-muted px-3 py-2 text-sm text-ink">
            Connected
            {settings.zelleConnectedAt
              ? ` · ${new Date(settings.zelleConnectedAt).toLocaleDateString()}`
              : ''}
            {settings.zelleHandle ? ` · ${settings.zelleHandle}` : ''}
          </p>
        ) : (
          <p className="text-sm text-ink-muted">
            Not connected. Add your Zelle destination before sending Zelle invoices.
          </p>
        )}
        <Input
          label="Zelle email or phone"
          name="zelleHandle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="payments@example.com or (555) 123-4567"
          autoComplete="off"
          required
        />
        <Input
          label="Confirm email or phone"
          name="zelleHandleConfirm"
          value={confirmHandle}
          onChange={(e) => setConfirmHandle(e.target.value)}
          placeholder="Type the same handle again"
          autoComplete="off"
          required
        />
        <Input
          label="Display name (optional)"
          name="zelleDisplayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="How tenants should search for you in Zelle"
        />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : saved ? (
              <Check className="h-4 w-4" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            {saved ? 'Saved' : 'Save Zelle handle'}
          </Button>
          {connected ? (
            <Button type="button" variant="outline" onClick={handleDisconnect}>
              Disconnect
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  )
}
