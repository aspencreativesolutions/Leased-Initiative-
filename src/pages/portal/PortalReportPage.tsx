import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { PortalReportProblemSection } from '@/components/portal/PortalReportProblemSection'

export function PortalReportPage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Request Maintenance"
        subtitle="Attach a required photo of the issue so your landlord can review it under Tenant Alerts. A note is optional."
      />
      <PortalReportProblemSection
        hideHeading
        onSubmitted={() => {
          navigate('/portal')
        }}
      />
    </div>
  )
}
