import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { AppProvider } from '@/context/AppContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { PortalThemeProvider } from '@/context/PortalThemeContext'
import { RouteThemeSync } from '@/components/settings/RouteThemeSync'
import { PortalThemeSync } from '@/components/portal/PortalThemeSync'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { PortalLoginPage } from '@/pages/portal/PortalLoginPage'
import { PortalRegisterPage } from '@/pages/portal/PortalRegisterPage'
import { PortalDashboardPage } from '@/pages/portal/PortalDashboardPage'
import { PortalTimelinePage } from '@/pages/portal/PortalTimelinePage'
import { PortalContractPage } from '@/pages/portal/PortalContractPage'
import { PortalPaymentSuccessPage } from '@/pages/portal/PortalPaymentSuccessPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ClientsPage } from '@/pages/ClientsPage'
import { ClientProfilePage } from '@/pages/ClientProfilePage'
import { ContractPage } from '@/pages/ContractPage'
import { ContractsPage } from '@/pages/ContractsPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { SchedulerPage } from '@/pages/SchedulerPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { PaymentSuccessPage } from '@/pages/PaymentSuccessPage'

export default function App() {
  return (
    <ThemeProvider>
      <PortalThemeProvider>
        <AuthProvider>
          <AppProvider>
            <BrowserRouter>
              <RouteThemeSync />
              <PortalThemeSync />
              <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/portal/login" element={<PortalLoginPage />} />
              <Route path="/portal/register" element={<PortalRegisterPage />} />

              <Route element={<ProtectedRoute role="client" />}>
                <Route element={<PortalLayout />}>
                  <Route path="/portal" element={<PortalDashboardPage />} />
                  <Route path="/portal/timeline" element={<PortalTimelinePage />} />
                  <Route path="/portal/contracts/:contractId" element={<PortalContractPage />} />
                  <Route path="/portal/payment/success" element={<PortalPaymentSuccessPage />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute role="admin" />}>
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
                  <Route path="/profile" element={<ProfilePage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </BrowserRouter>
          </AppProvider>
        </AuthProvider>
      </PortalThemeProvider>
    </ThemeProvider>
  )
}
