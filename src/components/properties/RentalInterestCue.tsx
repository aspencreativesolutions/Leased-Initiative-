import { ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

type RentalInterestCueProps = {
  applicantCount: number
  pendingTenantCount: number
  className?: string
}

/**
 * Subtle arrow + breathing tags under the beds occupancy chip when a rental
 * has Waiting-to-Connect applicants and/or Pending Tenants at that address.
 */
export function RentalInterestCue({
  applicantCount,
  pendingTenantCount,
  className,
}: RentalInterestCueProps) {
  const navigate = useNavigate()
  const hasApplicants = applicantCount > 0
  const hasPendingTenants = pendingTenantCount > 0

  if (!hasApplicants && !hasPendingTenants) return null

  return (
    <div
      className={cn('rental-interest-cue', className)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <span className="rental-interest-cue__arrow" aria-hidden>
        <ChevronDown strokeWidth={2.25} />
      </span>

      <div className="rental-interest-cue__tags">
        {hasApplicants ? (
          <button
            type="button"
            className="rental-interest-cue__tag rental-interest-cue__tag--applicants"
            aria-label={
              applicantCount === 1
                ? 'View 1 applicant in Waiting to Connect'
                : `View ${applicantCount} applicants in Waiting to Connect`
            }
            onClick={() => navigate('/studio/clients#tenants-waiting-connect')}
          >
            View Applicants
          </button>
        ) : null}

        {hasPendingTenants ? (
          <button
            type="button"
            className="rental-interest-cue__tag rental-interest-cue__tag--pending"
            aria-label={
              pendingTenantCount === 1
                ? '1 applicant pending a signed lease'
                : `${pendingTenantCount} applicants pending a signed lease`
            }
            onClick={() => navigate('/studio/clients#tenants-waiting-lease')}
          >
            Applicants Pending
          </button>
        ) : null}
      </div>
    </div>
  )
}
