import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, Loader2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { ApiError } from '@/lib/api'
import { createTenantInvite } from '@/lib/portalUsersApi'
import {
  DEFAULT_LEASE_LENGTH_MONTHS,
  earliestFutureLeaseStartDate,
  formatLeaseLengthLabel,
  isFutureLeaseStartDate,
  LEASE_LENGTH_OPTIONS,
  resolveScheduleAsOf,
  type LeaseLengthMonths,
} from '@/lib/leaseSchedule'
import { useApp } from '@/context/AppContext'

interface SendInviteModalProps {
  open: boolean
  onClose: () => void
}

const EMPTY_FORM = {
  propertyAddress: '',
  leaseStartDate: '',
  leaseLengthMonths: String(DEFAULT_LEASE_LENGTH_MONTHS),
  connectionCode: '',
  phone: '',
}

export function SendInviteModal({ open, onClose }: SendInviteModalProps) {
  const { settings, properties } = useApp()
  const [form, setForm] = useState(EMPTY_FORM)
  const [inviteUrl, setInviteUrl] = useState('')
  const [connectionCode, setConnectionCode] = useState('')
  const [smsNote, setSmsNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState<'link' | 'code' | null>(null)
  const [error, setError] = useState('')

  const propertyOptions = useMemo(
    () =>
      [...properties]
        .map((p) => p.address.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [properties]
  )

  const minStartDate = earliestFutureLeaseStartDate(resolveScheduleAsOf())

  useEffect(() => {
    if (!open) return
    setForm({
      ...EMPTY_FORM,
      leaseStartDate: earliestFutureLeaseStartDate(resolveScheduleAsOf()),
    })
    setInviteUrl('')
    setConnectionCode('')
    setSmsNote('')
    setCopied(null)
    setError('')
    setSubmitting(false)
  }, [open])

  const update = (field: keyof typeof EMPTY_FORM, value: string) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCopied(null)

    const propertyAddress = form.propertyAddress.trim()
    const phone = form.phone.trim()
    const leaseStartDate = form.leaseStartDate.trim()
    const leaseLengthMonths = Number(form.leaseLengthMonths) as LeaseLengthMonths

    if (!propertyAddress) {
      setError('Choose a property for this invite.')
      return
    }
    if (!leaseStartDate || !isFutureLeaseStartDate(leaseStartDate, resolveScheduleAsOf())) {
      setError('Lease start date must be a future date.')
      return
    }
    if (!phone) {
      setError('Enter the tenant’s phone number to text the invite link.')
      return
    }

    setSubmitting(true)
    try {
      const result = await createTenantInvite({
        propertyAddress,
        leaseStartDate,
        leaseLengthMonths,
        phone,
        connectionCode: form.connectionCode.trim() || undefined,
        sendSms: true,
      })
      setInviteUrl(result.inviteUrl)
      setConnectionCode(result.connectionCode ?? result.invite.connectionCode ?? '')
      setSmsNote(
        result.sms?.devMode
          ? `Invite saved. SMS is in demo mode — message logged for ${result.sms.to ?? phone}.`
          : `Invite texted to ${result.sms?.to ?? phone}.`
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send invite link')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopy = async (value: string, kind: 'link' | 'code') => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
    } catch {
      setError('Could not copy — select and copy it manually')
    }
  }

  const companyName = settings?.businessName?.trim() || 'your agency'

  return (
    <Modal open={open} onClose={onClose} title="Send Invite Link" size="lg">
      <div className="space-y-4">
        {!inviteUrl ? (
          <>
            <p className="text-sm text-ink-muted">
              Choose a rental, set a future lease start and duration, and optionally set a custom
              invite code. We’ll text a one-time link to the tenant — they confirm details on a
              pre-filled dashboard (no account signup), then appear under Waiting to Connect.
            </p>

            {error && (
              <p className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
                {error}
              </p>
            )}

            <form onSubmit={(e) => void handleSend(e)} className="space-y-4">
              <SearchableSelect
                label="Property"
                name="propertyAddress"
                required
                options={propertyOptions}
                value={form.propertyAddress}
                onChange={(value) => update('propertyAddress', value)}
                placeholder={
                  propertyOptions.length > 0
                    ? 'Search rentals…'
                    : 'Add a rental first under Rentals'
                }
                emptyMessage={
                  propertyOptions.length === 0
                    ? 'No rentals yet — add one under Rentals'
                    : 'No matching rentals'
                }
                disabled={propertyOptions.length === 0}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Lease Start Date"
                  name="leaseStartDate"
                  type="date"
                  required
                  min={minStartDate}
                  value={form.leaseStartDate}
                  onChange={(e) => update('leaseStartDate', e.target.value)}
                  hint="Future dates only"
                />
                <Select
                  label="Lease Duration"
                  name="leaseLengthMonths"
                  required
                  value={form.leaseLengthMonths}
                  onChange={(e) => update('leaseLengthMonths', e.target.value)}
                >
                  {LEASE_LENGTH_OPTIONS.map((months) => (
                    <option key={months} value={months}>
                      {formatLeaseLengthLabel(months)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Custom Invite Code"
                  name="connectionCode"
                  placeholder="Optional — e.g. HOME-2026"
                  value={form.connectionCode}
                  onChange={(e) => update('connectionCode', e.target.value.toUpperCase())}
                  hint="Letters, numbers, hyphens. Leave blank to auto-generate."
                />
                <Input
                  label="Tenant Phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="(555) 123-4567"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  hint={`Texted from ${companyName}`}
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
                {submitting ? 'Sending…' : 'Text Invite Link'}
              </Button>
            </form>
          </>
        ) : (
          <>
            {smsNote && (
              <p className="rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink">
                {smsNote}
              </p>
            )}
            {error && (
              <p className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
                {error}
              </p>
            )}

            <div>
              <p className="label-caps mb-2">Invite link</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={inviteUrl}
                  className="min-w-0 flex-1 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface px-3 py-2.5 text-sm text-ink"
                  onFocus={(event) => event.target.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleCopy(inviteUrl, 'link')}
                >
                  {copied === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied === 'link' ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            {connectionCode ? (
              <div>
                <p className="label-caps mb-2">Invite code</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={connectionCode}
                    className="min-w-0 flex-1 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface px-3 py-2.5 font-mono text-sm tracking-widest text-ink"
                    onFocus={(event) => event.target.select()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleCopy(connectionCode, 'code')}
                  >
                    {copied === 'code' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied === 'code' ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
            ) : null}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setInviteUrl('')
                setConnectionCode('')
                setSmsNote('')
                setCopied(null)
                setForm({
                  ...EMPTY_FORM,
                  leaseStartDate: earliestFutureLeaseStartDate(resolveScheduleAsOf()),
                })
              }}
            >
              Send another invite
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}
