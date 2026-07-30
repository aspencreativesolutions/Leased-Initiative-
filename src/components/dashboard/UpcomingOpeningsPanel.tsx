import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, DoorOpen, Link2, Loader2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/FormField'
import { useApp } from '@/context/AppContext'
import { ApiError } from '@/lib/api'
import { getFirstName } from '@/lib/clientUtils'
import { formatDate, cn } from '@/lib/utils'
import { createTenantInvite } from '@/lib/portalUsersApi'
import { buildUpcomingOpenings, type PropertyOpening } from '@/lib/properties'
import { logResignMessage } from '@/lib/propertiesApi'
import { resolveLandlordSenderName } from '@/lib/publicDemo'
import { openSmsCompose } from '@/lib/tenantMessageTemplates'
import type { Client } from '@/types'

type OpeningAction = 'resign' | 'invite'

function buildResignDraft(vars: {
  tenantName: string
  address: string
  landlordName: string
  endDate?: string
}) {
  const name = getFirstName(vars.tenantName) || 'there'
  const end =
    vars.endDate && vars.endDate !== '—'
      ? ` Your current lease ends on ${formatDate(vars.endDate)}.`
      : ''
  return `Hi ${name}, this is ${vars.landlordName} regarding ${vars.address}.${end} We would like to discuss renewing or re-signing your lease. Please reply so we can send next steps. Thank you!`
}

export function UpcomingOpeningsPanel() {
  const { properties, clients, getContractForClient, settings, getClient, refresh } = useApp()
  const [active, setActive] = useState<{
    opening: PropertyOpening
    action: OpeningAction
  } | null>(null)

  const openings = useMemo(
    () => buildUpcomingOpenings(properties, clients, getContractForClient),
    [properties, clients, getContractForClient]
  )

  return (
    <>
      <Card
        className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)] p-3 sm:p-5"
        data-onboarding="admin-upcoming-openings"
      >
        <CardHeader
          dense
          noBorder
          title="Upcoming Openings"
          subtitle="Available now, opening soon, approaching lease end, or ready for a renewal decision — send a re-sign message or generate an invite code from any row"
        />

        {openings.length === 0 ? (
          <EmptyState
            icon={DoorOpen}
            title="No openings right now"
            description="Vacant units and leases ending within the next several months will appear here."
          />
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-line">
            <table className="w-full table-auto text-left text-sm">
              <thead>
                <tr className="border-b border-ink bg-surface">
                  <th className="label-caps px-3 py-2.5 sm:px-4">Rental</th>
                  <th className="label-caps hidden px-3 py-2.5 md:table-cell sm:px-4">
                    Opening
                  </th>
                  <th className="label-caps hidden px-3 py-2.5 lg:table-cell sm:px-4">
                    Tenants
                  </th>
                  <th className="label-caps w-[11.5rem] px-3 py-2.5 sm:w-[13rem] sm:px-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {openings.map((opening) => (
                  <tr key={opening.id} className="transition-colors hover:bg-surface">
                    <td className="px-3 py-2.5 align-top sm:px-4">
                      <p className="break-words font-medium text-ink">{opening.address}</p>
                      <p className="mt-0.5 text-xs text-ink-muted md:hidden">
                        {opening.label}
                      </p>
                    </td>
                    <td className="hidden px-3 py-2.5 align-top md:table-cell sm:px-4">
                      <span
                        className={cn(
                          'inline-flex rounded-sm border px-2 py-0.5 text-xs font-semibold',
                          opening.kind === 'vacant'
                            ? 'border-brand/30 bg-brand/10 text-brand'
                            : 'border-accent/40 bg-accent-light text-accent'
                        )}
                      >
                        {opening.label}
                      </span>
                      {opening.endDate && (
                        <p className="mt-1 text-xs text-ink-muted">
                          End {formatDate(opening.endDate)}
                        </p>
                      )}
                    </td>
                    <td className="hidden px-3 py-2.5 align-top lg:table-cell sm:px-4">
                      {opening.tenantNames.length > 0
                        ? opening.tenantNames.join(', ')
                        : '—'}
                    </td>
                    <td className="w-[11.5rem] px-3 py-2.5 align-top sm:w-[13rem] sm:px-4">
                      <div className="flex min-w-0 flex-col items-stretch gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-auto w-full justify-center whitespace-normal px-2 py-1.5 text-center leading-tight"
                          onClick={() => setActive({ opening, action: 'resign' })}
                        >
                          Send Re-sign Message
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          className="h-auto w-full justify-center whitespace-normal px-2 py-1.5 text-center leading-tight"
                          onClick={() => setActive({ opening, action: 'invite' })}
                        >
                          Generate Invite Code
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <OpeningActionsModal
        opening={active?.opening ?? null}
        action={active?.action ?? null}
        onClose={() => setActive(null)}
        landlordName={resolveLandlordSenderName(settings)}
        getClient={getClient}
        onLogged={refresh}
      />
    </>
  )
}

function OpeningActionsModal({
  opening,
  action,
  onClose,
  landlordName,
  getClient,
  onLogged,
}: {
  opening: PropertyOpening | null
  action: OpeningAction | null
  onClose: () => void
  landlordName: string
  getClient: (id: string) => Client | undefined
  onLogged?: () => void
}) {
  const [inviteUrl, setInviteUrl] = useState('')
  const [connectionCode, setConnectionCode] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [copied, setCopied] = useState<'link' | 'code' | null>(null)
  const [error, setError] = useState('')
  const [resignMessage, setResignMessage] = useState('')
  const [resignBusy, setResignBusy] = useState(false)
  const [resignDone, setResignDone] = useState(false)

  useEffect(() => {
    if (!opening || !action) {
      setInviteUrl('')
      setConnectionCode('')
      setCopied(null)
      setError('')
      setResignMessage('')
      setResignDone(false)
      return
    }
    const primary = opening.tenantIds[0] ? getClient(opening.tenantIds[0]) : undefined
    setResignMessage(
      buildResignDraft({
        tenantName: primary?.name || opening.tenantNames[0] || 'there',
        address: opening.address,
        landlordName,
        endDate: opening.endDate,
      })
    )
    setInviteUrl('')
    setConnectionCode('')
    setCopied(null)
    setError('')
    setResignDone(false)
  }, [opening, action, landlordName, getClient])

  if (!opening || !action) return null

  const canResign = opening.kind === 'lease_ending' && opening.tenantIds.length > 0
  const title =
    action === 'resign' ? 'Send re-sign message' : 'Generate connection invite'

  const handleGenerateInvite = async () => {
    setInviteBusy(true)
    setError('')
    setCopied(null)
    try {
      const result = await createTenantInvite(opening.address)
      setInviteUrl(result.inviteUrl)
      setConnectionCode(result.connectionCode ?? result.invite.connectionCode ?? '')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create invite')
    } finally {
      setInviteBusy(false)
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

  const handleResign = async () => {
    const body = resignMessage.trim()
    if (!body) {
      setError('Write a re-sign message first.')
      return
    }
    setResignBusy(true)
    setError('')
    try {
      let openedSms = false
      for (const tenantId of opening.tenantIds) {
        const tenant = getClient(tenantId)
        await logResignMessage(tenantId, body)
        if (!openedSms && tenant?.phone?.trim()) {
          openSmsCompose(tenant.phone, body)
          openedSms = true
        }
      }
      setResignDone(true)
      onLogged?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send re-sign message')
    } finally {
      setResignBusy(false)
    }
  }

  return (
    <Modal open={Boolean(opening && action)} onClose={onClose} title={title} size="lg">
      <div className="space-y-5">
        <div>
          <p className="break-words font-medium text-ink">{opening.address}</p>
          <p className="mt-1 text-sm text-ink-muted">{opening.label}</p>
          {opening.endDate && (
            <p className="mt-1 text-sm text-ink-muted">
              Lease end date: {formatDate(opening.endDate)}
            </p>
          )}
          {opening.tenantNames.length > 0 && (
            <p className="mt-1 text-sm text-ink-muted">
              Current tenants: {opening.tenantNames.join(', ')}
            </p>
          )}
          {action === 'invite' && opening.kind === 'vacant' && (
            <p className="mt-1 text-sm text-ink-muted">
              Available unit
              {opening.vacantUnits === 1 ? '' : 's'}: {opening.vacantUnits}
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
            {error}
          </p>
        )}

        {action === 'resign' && (
          <div className="space-y-3 rounded-[var(--radius-sm)] border border-line p-4">
            <div className="flex items-start gap-2">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
              <div>
                <p className="text-sm font-semibold text-ink">Send re-sign message</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Opens Messages on your phone when a number is on file, and logs the outreach on
                  each tenant profile.
                </p>
              </div>
            </div>
            {canResign ? (
              <>
                <Textarea
                  label="Message"
                  rows={4}
                  value={resignMessage}
                  onChange={(e) => {
                    setResignMessage(e.target.value)
                    setResignDone(false)
                  }}
                />
                <Button type="button" onClick={handleResign} disabled={resignBusy || resignDone}>
                  {resignBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                  {resignDone ? 'Message logged' : resignBusy ? 'Sending…' : 'Send re-sign message'}
                </Button>
              </>
            ) : (
              <p className="text-sm text-ink-muted">
                Re-sign messaging is available when this opening has current tenants on an ending
                lease.
              </p>
            )}
          </div>
        )}

        {action === 'invite' && (
          <div className="space-y-3 rounded-[var(--radius-sm)] border border-line p-4">
            <div className="flex items-start gap-2">
              <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
              <div>
                <p className="text-sm font-semibold text-ink">Generate invite for new tenant</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Creates a one-time connection link and code pre-linked to this property.
                </p>
              </div>
            </div>

            {!inviteUrl ? (
              <Button type="button" onClick={handleGenerateInvite} disabled={inviteBusy}>
                {inviteBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                {inviteBusy ? 'Generating…' : 'Generate connection invite'}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={inviteUrl}
                    className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-2.5 text-sm text-ink"
                    onFocus={(e) => e.target.select()}
                  />
                  <Button type="button" variant="outline" onClick={() => void handleCopy(inviteUrl, 'link')}>
                    {copied === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied === 'link' ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                {connectionCode ? (
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={connectionCode}
                      className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-2.5 font-mono text-sm tracking-widest text-ink"
                      onFocus={(e) => e.target.select()}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleCopy(connectionCode, 'code')}
                    >
                      {copied === 'code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied === 'code' ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
