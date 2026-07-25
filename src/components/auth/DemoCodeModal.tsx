import { useId, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { ApiError } from '@/lib/api'
import { prepareViewportForNavigation } from '@/lib/mobileViewport'
import {
  redeemDemoCode,
  setDemoFirstName,
  type DemoAccountCredentials,
} from '@/lib/publicDemo'
import type { WelcomeRole } from '@/lib/welcomeSlides'

interface DemoCodeModalProps {
  open: boolean
  role: WelcomeRole
  onClose: () => void
  onSuccess: (account: DemoAccountCredentials) => void
  /** Welcome carousel: redeem for the chosen role. Homepage routes through /demo/pov instead. */
  variant?: 'welcome' | 'home'
}

export function DemoCodeModal({
  open,
  role,
  onClose,
  onSuccess,
  variant = 'welcome',
}: DemoCodeModalProps) {
  const codeId = useId()
  const firstNameId = useId()
  const [code, setCode] = useState('')
  const [firstName, setFirstName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleClose = () => {
    if (submitting) return
    setCode('')
    setFirstName('')
    setError('')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!code.trim()) {
      setError('Enter the demo access code from your host.')
      return
    }
    setSubmitting(true)
    try {
      const result = await redeemDemoCode(code, role, firstName)
      await prepareViewportForNavigation()
      onSuccess(result.account)
      setDemoFirstName(firstName)
      setCode('')
      setFirstName('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start the demo')
    } finally {
      setSubmitting(false)
    }
  }

  const isHome = variant === 'home'

  return (
    <Modal open={open} onClose={handleClose} title={isHome ? 'Enter demo code' : 'Use Demo Account'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm leading-relaxed text-ink-muted">
          {isHome
            ? 'Enter the access code from your host to unlock the demo. Next you will choose landlord or a specific tenant scenario. Changes are not saved.'
            : `Enter the access code provided by your host. We will open the ${
                role === 'landlord' ? 'landlord' : 'tenant'
              } demo with sample data. Changes you make are not saved.`}
        </p>
        {error && (
          <div className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
            {error}
          </div>
        )}
        <Input
          id={codeId}
          label="Demo access code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          autoFocus
          required
          placeholder="Enter code"
          // 16px — prevents iOS Safari auto-zoom on focus (text-sm is 14px).
          style={{ fontSize: 16 }}
        />
        <Input
          id={firstNameId}
          label="First Name (Optional)"
          hint="Enter your first name to personalize mock messages and documents throughout the demo. You can also skip this step."
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          autoComplete="given-name"
          placeholder="e.g. Christine"
          style={{ fontSize: 16 }}
        />
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Checking…' : isHome ? 'Enter demo' : 'Continue'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
