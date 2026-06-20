import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { OnboardingTour } from '@/components/onboarding/OnboardingTour'
import { DashboardNavActionsProvider } from '@/context/DashboardNavActionsContext'

export function AppLayout() {
  const [tourStart, setTourStart] = useState(false)

  return (
    <DashboardNavActionsProvider>
      <div className="min-h-screen w-full max-w-full bg-surface font-sans text-ink">
        <Navbar onStartTour={() => setTourStart(true)} />
        <main className="w-full min-w-0 max-w-full overflow-x-clip px-4 pt-5 pb-10 sm:px-6 sm:pt-6 sm:pb-12 lg:px-10 xl:px-12">
          <div className="mx-auto w-full min-w-0">
            <Outlet />
          </div>
        </main>
        <OnboardingTour
          role="admin"
          forceStart={tourStart}
          onForceStartHandled={() => setTourStart(false)}
        />
      </div>
    </DashboardNavActionsProvider>
  )
}
