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
import { openSmsCompose } from '@/lib/tenantMessageTemplates'
import type { Client } from '@/types'

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
  const [selected, setSelected] = useState<PropertyOpening | null>(null)

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
          title="Upcoming Openings"
          subtitle="Available now, opening soon, approaching lease end, or ready for a renewal decision — select a row to re-sign or invite"
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
                  <th className="label-caps px-3 py-2.5 sm:px-4">
                    <span className="sr-only">Select</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {openings.map((opening) => {
                  const isSelected = selected?.id === opening.id
                  return (
                    <tr
                      key={opening.id}
                      className={cn(
                        'cursor-pointer transition-colors',
                        isSelected ? 'bg-brand/10' : 'hover:bg-surface'
                      )}
                      onClick={() => setSelected(opening)}
                    >
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
                      <td className="px-3 py-2.5 align-top sm:px-4">
                        <Button
                          type="button"
                          size="sm"
                          variant={isSelected ? 'primary' : 'outline'}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelected(opening)
                          }}
                        >
                          Select
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <OpeningActionsModal
        opening={selected}
        onClose={() => setSelected(null)}
        landlordName={settings.businessName || settings.ownerName || 'your landlord'}
        getClient={getClient}
        onLogged={refresh}
      />
    </>
  )
}

function OpeningActionsModal({
  opening,
  onClose,
  landlordName,
  getClient,
  onLogged,
}: {
  opening: PropertyOpening | null
  onClose: () => void
  landlordName: string
  getClient: (id: string) => Client | undefined
  onLogged?: () => void
}) {
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [resignMessage, setResignMessage] = useState('')
  const [resignBusy, setResignBusy] = useState(false)
  const [resignDone, setResignDone] = useState(false)

  useEffect(() => {
    if (!opening) {
      setInviteUrl('')
      setCopied(false)
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
    setCopied(false)
    setError('')
    setResignDone(false)
  }, [opening, landlordName, getClient])

  if (!opening) return null

  const canResign = opening.kind === 'lease_ending' && opening.tenantIds.length > 0

  const handleGenerateInvite = async () => {
    setInviteBusy(true)
    setError('')
    setCopied(false)
    try {
      const result = await createTenantInvite(opening.address)
      setInviteUrl(result.inviteUrl)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create invite')
    } finally {
      setInviteBusy(false)
    }
  }

  const handleCopy = async () => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
    } catch {
      setError('Could not copy — select and copy the link manually')
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
    <Modal open={Boolean(opening)} onClose={onClose} title="Opening actions" size="lg">
      <div className="space-y-5">
        <div>
          <p className="break-words font-medium text-ink">{opening.address}</p>
          <p className="mt-1 text-sm text-ink-muted">{opening.label}</p>
          {opening.tenantNames.length > 0 && (
            <p className="mt-1 text-sm text-ink-muted">
              Current tenants: {opening.tenantNames.join(', ')}
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
            {error}
          </p>
        )}

        {canResign && (
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
          </div>
        )}

        <div className="space-y-3 rounded-[var(--radius-sm)] border border-line p-4">
          <div className="flex items-start gap-2">
            <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
            <div>
              <p className="text-sm font-semibold text-ink">Generate invite for new tenant</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                Creates a signup link pre-linked to this property address.
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
              {inviteBusy ? 'Generating…' : 'Generate invite code'}
            </Button>
          ) : (
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteUrl}
                className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-2.5 text-sm text-ink"
                onFocus={(e) => e.target.select()}
              />
              <Button type="button" variant="outline" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
