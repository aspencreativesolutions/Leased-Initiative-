import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from '@/context/AppContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { ClientsPage } from '@/pages/ClientsPage'
import { ClientProfilePage } from '@/pages/ClientProfilePage'
import { ContractPage } from '@/pages/ContractPage'
import { ContractsPage } from '@/pages/ContractsPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { SchedulerPage } from '@/pages/SchedulerPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { PaymentSuccessPage } from '@/pages/PaymentSuccessPage'

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/clients/:id" element={<ClientProfilePage />} />
            <Route path="/clients/:id/contract" element={<ContractPage />} />
            <Route path="/clients/:id/payment/success" element={<PaymentSuccessPage />} />
            <Route path="/contracts" element={<ContractsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/scheduler" element={<SchedulerPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  )
}
