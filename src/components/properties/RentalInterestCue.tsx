import { ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  rentalApplicantsHref,
  type RentalApplicantsFocusTarget,
} from '@/lib/rentalApplicantsFocus'
import { cn } from '@/lib/utils'

type RentalInterestCueProps = {
  propertyId: string
  applicantCount: number
  pendingTenantCount: number
  /** Hide the pointing arrow (e.g. spreadsheet cells). */
  compact?: boolean
  className?: string
}

/**
 * Subtle arrow + breathing tags under the beds occupancy chip when a rental
 * has Waiting-to-Connect applicants and/or Pending Tenants at that address.
 */
export function RentalInterestCue({
  propertyId,
  applicantCount,
  pendingTenantCount,
  compact = false,
  className,
}: RentalInterestCueProps) {
  const navigate = useNavigate()
  const hasApplicants = applicantCount > 0
  const hasPendingTenants = pendingTenantCount > 0

  if (!hasApplicants && !hasPendingTenants) return null

  const goToApplicants = (target: RentalApplicantsFocusTarget) => {
    navigate(rentalApplicantsHref(propertyId, target))
  }

  return (
    <div
      className={cn('rental-interest-cue', compact && 'rental-interest-cue--compact', className)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {!compact ? (
        <span className="rental-interest-cue__arrow" aria-hidden>
          <ChevronDown strokeWidth={2.25} />
        </span>
      ) : null}

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
            onClick={() => goToApplicants('waiting')}
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
                ? 'View 1 applicant in Pending Tenants'
                : `View ${pendingTenantCount} applicants in Pending Tenants`
            }
            onClick={() => goToApplicants('pending')}
          >
            {hasApplicants ? 'Applicants Pending' : 'View Applicants'}
          </button>
        ) : null}
      </div>
    </div>
  )
}
