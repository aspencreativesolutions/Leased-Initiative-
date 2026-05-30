import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'

export function AppLayout() {
  return (
    <div className="min-h-screen w-full bg-surface font-sans text-ink">
      <Navbar />
      <main className="w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-10 xl:px-12">
        <div className="mx-auto w-full min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
