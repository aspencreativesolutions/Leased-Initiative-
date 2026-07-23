import { ExternalLink, MapPinned } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import {
  googleMapsEmbedUrl,
  googleMapsExternalUrl,
  isMappableAddress,
} from '@/lib/addressMap'
import { cn } from '@/lib/utils'

interface AddressMapModalProps {
  open: boolean
  onClose: () => void
  address: string | null
  tenantName?: string
}

export function AddressMapModal({
  open,
  onClose,
  address,
  tenantName,
}: AddressMapModalProps) {
  const mappable = isMappableAddress(address)
  const resolved = address?.trim() ?? ''

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={resolved || 'Property map'}
      size="full"
    >
      <div className="flex flex-col gap-3">
        {(tenantName || mappable) && (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              {tenantName && (
                <p className="text-sm text-ink-muted">{tenantName}</p>
              )}
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-faint">
                <MapPinned className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
                Google Map pin on this exact address
              </p>
            </div>
            {mappable && (
              <a
                href={googleMapsExternalUrl(resolved)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'btn-ui inline-flex shrink-0 items-center justify-center gap-2 rounded-sm border-[length:var(--border-width)] border-ink',
                  'bg-transparent px-3 py-1.5 text-[11px] font-semibold text-ink',
                  'transition-colors hover:bg-ink hover:text-surface-paper'
                )}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in Google Maps
              </a>
            )}
          </div>
        )}

        {mappable ? (
          <div className="relative overflow-hidden rounded-[var(--radius-sm)] border-2 border-ink bg-surface shadow-[2px_2px_0_0_rgba(17,17,17,0.85)]">
            <iframe
              title={`Map of ${resolved}`}
              src={googleMapsEmbedUrl(resolved)}
              className="block h-[min(75vh,40rem)] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        ) : (
          <p className="rounded-[var(--radius-sm)] border border-line bg-surface px-4 py-8 text-center text-sm text-ink-muted">
            This lease does not have a mappable address yet.
          </p>
        )}
      </div>
    </Modal>
  )
}
