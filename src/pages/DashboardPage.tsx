import { useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { AddClientModal } from '@/components/clients/AddClientModal'
import { ClientTable } from '@/components/clients/ClientTable'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useApp } from '@/context/AppContext'

export function DashboardPage() {
  const { clients } = useApp()
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="w-full min-w-0">
      <PageHeader
        title="Client Dashboard"
        subtitle="Manage your clients, contracts, and follow-ups in one place."
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        }
      />

      <SummaryCards clients={clients} />

      <div className="w-full min-w-0 space-y-6">
        <Card className="w-full min-w-0">
          <CardHeader title="All Clients" subtitle="Overview of your client roster" />
          {clients.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No clients yet"
              description="Add your first client to start tracking projects and contracts."
              action={
                <Button onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add Client
                </Button>
              }
            />
          ) : (
            <ClientTable clients={clients} fullWidth />
          )}
        </Card>

        <div className="w-full min-w-0">
          <UpcomingDeadlines clients={clients} />
        </div>
      </div>

      <AddClientModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
