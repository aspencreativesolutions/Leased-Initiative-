import { Modal } from '@/components/ui/Modal'
import { TermsOfServiceContent } from '@/components/legal/TermsOfServiceContent'

interface TermsOfServiceModalProps {
  open: boolean
  onClose: () => void
}

/** Full Terms of Service in a modal — homepage quick access, profile, and onboarding. */
export function TermsOfServiceModal({ open, onClose }: TermsOfServiceModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Terms of Service" size="lg">
      <TermsOfServiceContent />
    </Modal>
  )
}
