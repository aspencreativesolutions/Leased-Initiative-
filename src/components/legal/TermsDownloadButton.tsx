import { Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { downloadTermsOfServicePdf } from '@/lib/termsOfServicePdf'
import { cn } from '@/lib/utils'

interface TermsDownloadButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/** Clear control to save the current Terms of Service as a PDF. */
export function TermsDownloadButton({
  variant = 'outline',
  size = 'sm',
  className,
}: TermsDownloadButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={() => downloadTermsOfServicePdf()}
      aria-label="Download Terms of Service PDF"
    >
      <Download className="h-4 w-4" aria-hidden />
      Download
    </Button>
  )
}
