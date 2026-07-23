import { HelpCircle, Mail, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { PORTAL_FILE_TYPES_LABEL } from '@/lib/allowedFileTypes'
import type { PortalSupportContact } from '@/types'

interface PortalAssistanceModalProps {
  open: boolean
  onClose: () => void
  supportContact?: PortalSupportContact
}

export function PortalAssistanceModal({
  open,
  onClose,
  supportContact,
}: PortalAssistanceModalProps) {
  const contactEmail = supportContact?.email?.trim()
  const contactPhone = supportContact?.phone?.trim()
  const businessName = supportContact?.businessName?.trim() || 'your landlord'

  return (
    <Modal open={open} onClose={onClose} title="Assistance" size="lg">
      <div className="space-y-6 text-sm text-ink">
        <section>
          <h3 className="flex items-center gap-2 font-bold text-ink">
            <HelpCircle className="h-4 w-4 text-brand" />
            Project steps
          </h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-ink-muted">
            <li>Review and sign your lease agreement when it appears under Lease Agreements.</li>
            <li>Open the invoice payment link to pay your deposit.</li>
            <li>
              Once your landlord activates your lease, upload files and add notes here in the
              portal.
            </li>
            <li>Track lease status on your dashboard — your landlord updates it as things progress.</li>
          </ol>
        </section>

        <section>
          <h3 className="font-bold text-ink">Accepted file types</h3>
          <p className="mt-2 text-ink-muted">
            Upload {PORTAL_FILE_TYPES_LABEL}. Each file can be up to 25 MB. Drag and drop
            multiple files at once, or use Choose files.
          </p>
        </section>

        <section>
          <h3 className="flex items-center gap-2 font-bold text-ink">
            <MessageSquare className="h-4 w-4 text-brand" />
            Using notes
          </h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-muted">
            <li>
              Add an optional note before uploading to explain what you&apos;re sending (e.g.
              &quot;Final logo files&quot; or &quot;Homepage copy draft&quot;).
            </li>
            <li>
              Use <strong className="text-ink">Add Note</strong> on any uploaded file to add
              more context — paste as much detail as you need.
            </li>
            <li>Notes stay linked to that file so your landlord can review them together.</li>
          </ul>
        </section>

        <section className="rounded-sm border-2 border-brand/30 bg-brand/5 px-4 py-4">
          <h3 className="font-bold text-ink">Need more help?</h3>
          <p className="mt-1 text-ink-muted">
            {businessName} is here to support you. Reach out anytime with questions about
            uploads, payments, or your project timeline.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {contactEmail ? (
              <a href={`mailto:${contactEmail}`}>
                <Button size="sm">
                  <Mail className="h-4 w-4" />
                  Contact us directly
                </Button>
              </a>
            ) : (
              <p className="text-xs text-ink-muted">
                Contact details will appear here once your landlord adds them in landlord settings.
              </p>
            )}
            {contactPhone && (
              <a href={`tel:${contactPhone.replace(/\s/g, '')}`}>
                <Button size="sm" variant="outline">
                  Call {contactPhone}
                </Button>
              </a>
            )}
          </div>
        </section>
      </div>
    </Modal>
  )
}
