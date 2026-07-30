import { useEffect, useState, type FormEvent } from 'react'
import { Home, UserPlus, Users } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/FormField'
import { AddressText } from '@/components/ui/AddressText'
import { apiFetch, ApiError } from '@/lib/api'
import { formatUsd } from '@/lib/rentalRent'
import { formatLongDate, cn } from '@/lib/utils'
import { paymentToneTagClass } from '@/lib/paymentStatusPresentation'
import type {
  PortalHousehold,
  PortalRoommatePaymentTone,
  PortalRoommateStartOption,
} from '@/types'

interface PortalPropertyDetailsPanelProps {
  household: PortalHousehold
  className?: string
}

function toneClass(tone: PortalRoommatePaymentTone): string {
  return paymentToneTagClass(tone)
}

export function PortalPropertyDetailsPanel({
  household,
  className,
}: PortalPropertyDetailsPanelProps) {
  const [inviteOpen, setInviteOpen] = useState(false)

  const roommateLabel =
    household.totalRoommates === 1
      ? '1 person in this home'
      : `${household.totalRoommates} people in this home`

  return (
    <>
      <aside
        className={cn(
          'paper-box flex h-full min-h-0 w-full flex-col px-4 py-6 text-left sm:px-5 sm:py-7',
          className
        )}
        aria-label="Property details"
        data-onboarding="portal-property-details"
      >
        <div className="mb-4 flex items-start gap-2 border-b border-ink/10 pb-3">
          <Home className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold uppercase tracking-caps text-ink">
              Property details
            </h2>
            {household.address ? (
              <p className="mt-1 min-w-0 text-xs leading-snug text-ink-muted">
                <AddressText address={household.address} />
              </p>
            ) : null}
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2 text-sm text-ink">
          <Users className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
          <span className="font-medium">{roommateLabel}</span>
        </div>

        <ul className="min-h-0 flex-1 space-y-2.5 overflow-y-auto">
          {household.roommates.map((mate) => (
            <li
              key={mate.id}
              className="flex items-center justify-between gap-2 border-b border-ink/5 pb-2 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  {mate.name}
                  {mate.isYou ? (
                    <span className="ml-1.5 text-xs font-normal text-ink-muted">(you)</span>
                  ) : null}
                </p>
              </div>
              <span
                className={cn(
                  'status-badge shrink-0 border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                  toneClass(mate.paymentStatusTone)
                )}
              >
                {mate.paymentStatusLabel}
              </span>
            </li>
          ))}
        </ul>

        {household.hasExtraBedroom ? (
          <div className="mt-5 space-y-3 border-t border-ink/10 pt-4">
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="group flex w-full items-start gap-2 rounded-[var(--radius-sm)] border border-brand/35 bg-brand/5 px-3 py-2.5 text-left transition hover:border-brand hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <UserPlus
                className="mt-0.5 h-4 w-4 shrink-0 text-brand transition-transform group-hover:scale-110"
                aria-hidden
              />
              <span className="min-w-0">
                <span className="block text-xs font-bold uppercase tracking-wide text-brand">
                  Extra Bedroom Available—Send Invite Link!
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-ink-muted">
                  Text a potential roommate the registration link
                </span>
              </span>
            </button>

            {household.currentShareAmount != null &&
            household.reducedShareAmount != null &&
            household.reducedShareAmount < household.currentShareAmount ? (
              <p className="text-xs leading-relaxed text-ink-muted">
                Adding a roommate lowers your share from{' '}
                <span className="font-semibold text-ink">
                  {formatUsd(household.currentShareAmount)}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-ink">
                  {formatUsd(household.reducedShareAmount)}
                </span>{' '}
                per person
                {household.unitMonthlyRent != null
                  ? ` (of ${formatUsd(household.unitMonthlyRent)} total rent)`
                  : ''}
                .
              </p>
            ) : null}
          </div>
        ) : null}
      </aside>

      <RoommateInviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        household={household}
      />
    </>
  )
}

function RoommateInviteModal({
  open,
  onClose,
  household,
}: {
  open: boolean
  onClose: () => void
  household: PortalHousehold
}) {
  const availableOptions = household.startOptions.filter((opt) => opt.available)
  const defaultOption =
    availableOptions.find((opt) => opt.id === 'next_month') ?? availableOptions[0] ?? null

  const [phone, setPhone] = useState('')
  const [startOption, setStartOption] = useState<PortalRoommateStartOption['id']>(
    defaultOption?.id ?? 'next_month'
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!open) return
    setPhone('')
    setError('')
    setSuccess('')
    setStartOption(defaultOption?.id ?? 'next_month')
  }, [open, defaultOption?.id])

  const selected =
    household.startOptions.find((opt) => opt.id === startOption) ?? defaultOption

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    const digits = phone.replace(/\D/g, '')
    const normalized =
      digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
    if (normalized.length !== 10) {
      setError('Enter a valid 10-digit phone number.')
      return
    }
    if (!selected?.available) {
      setError('Choose an available start option.')
      return
    }

    setSubmitting(true)
    try {
      const result = await apiFetch<{
        message?: string
        smsDevMode?: boolean
      }>('/api/portal/roommate-invite', {
        method: 'POST',
        body: JSON.stringify({
          phone: normalized,
          startOption: selected.id,
        }),
      })
      setSuccess(
        result.message ||
          'Invite link sent. Account registration is locked until launch.'
      )
      setPhone('')
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not send the invite. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite a roommate"
      size="md"
      mobileCover
      fitContent
    >
      <form onSubmit={(e) => void handleSend(e)} className="space-y-4 text-left">
        <p className="text-sm leading-relaxed text-ink-muted">
          Send a registration link by text. Account registration is locked until
          launch — the link is ready for when signup opens. Their lease runs until{' '}
          {household.leaseEndDate ? formatLongDate(household.leaseEndDate) : 'your lease ends'}
          ; after that, everyone renews together to continue.
        </p>

        {household.currentShareAmount != null &&
        household.reducedShareAmount != null &&
        household.reducedShareAmount < household.currentShareAmount ? (
          <div className="rounded-[var(--radius-sm)] border border-brand/25 bg-brand/5 px-3 py-2.5 text-sm text-ink">
            Your share drops from{' '}
            <strong>{formatUsd(household.currentShareAmount)}</strong> to{' '}
            <strong>{formatUsd(household.reducedShareAmount)}</strong> per person when they join.
          </div>
        ) : null}

        <div>
          <Input
            id="roommate-invite-phone"
            label="Roommate phone number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(555) 123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={submitting || Boolean(success)}
            required
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-xs font-semibold uppercase tracking-caps text-ink">
            When they start
          </legend>
          {household.startOptions.map((opt) => (
            <label
              key={opt.id}
              className={cn(
                'flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-sm)] border px-3 py-2.5 text-sm',
                opt.available
                  ? startOption === opt.id
                    ? 'border-brand bg-brand/5'
                    : 'border-ink/15 hover:border-ink/30'
                  : 'cursor-not-allowed border-ink/10 opacity-50'
              )}
            >
              <input
                type="radio"
                name="roommate-start"
                className="mt-1"
                checked={startOption === opt.id}
                disabled={!opt.available || submitting || Boolean(success)}
                onChange={() => setStartOption(opt.id)}
              />
              <span className="min-w-0">
                <span className="block font-medium text-ink">{opt.label}</span>
                {opt.available && opt.startDate ? (
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    Starts {formatLongDate(opt.startDate)}
                    {opt.leaseEndDate
                      ? ` · ends ${formatLongDate(opt.leaseEndDate)}`
                      : ''}
                  </span>
                ) : (
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    Not available before this lease ends — renew together afterward
                  </span>
                )}
              </span>
            </label>
          ))}
        </fieldset>

        {error ? (
          <p className="text-sm text-accent" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-sm text-ink" role="status">
            {success}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            {success ? 'Close' : 'Cancel'}
          </Button>
          {!success ? (
            <Button type="submit" disabled={submitting || availableOptions.length === 0}>
              {submitting ? 'Sending…' : 'Send invite link'}
            </Button>
          ) : null}
        </div>
      </form>
    </Modal>
  )
}
