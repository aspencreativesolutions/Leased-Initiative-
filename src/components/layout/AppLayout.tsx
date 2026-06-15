import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'

export function AppLayout() {
  return (
    <div className="min-h-screen w-full max-w-full bg-surface font-sans text-ink">
      <Navbar />
      <main className="w-full min-w-0 max-w-full overflow-x-clip px-4 pt-5 pb-10 sm:px-6 sm:pt-6 sm:pb-12 lg:px-10 xl:px-12">
        <div className="mx-auto w-full min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
