import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { AppProvider } from '@/context/AppContext'
import { AppearanceProvider } from '@/context/AppearanceContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { PortalThemeProvider } from '@/context/PortalThemeContext'
import { RouteThemeSync } from '@/components/settings/RouteThemeSync'
import { PortalThemeSync } from '@/components/portal/PortalThemeSync'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { AdminModeFab } from '@/components/admin/AdminModeFab'
import { RoleSelectPage } from '@/pages/auth/RoleSelectPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { StudioLoginPage } from '@/pages/auth/StudioLoginPage'
import { StudioRegisterPage } from '@/pages/auth/StudioRegisterPage'
import { CheckEmailPage } from '@/pages/auth/CheckEmailPage'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage'
import { PortalLoginPage } from '@/pages/portal/PortalLoginPage'
import { PortalRegisterPage } from '@/pages/portal/PortalRegisterPage'
import { PortalDashboardPage } from '@/pages/portal/PortalDashboardPage'
import { PortalTimelinePage } from '@/pages/portal/PortalTimelinePage'
import { PortalContractPage } from '@/pages/portal/PortalContractPage'
import { PortalPaymentSuccessPage } from '@/pages/portal/PortalPaymentSuccessPage'
import { PortalProfilePage } from '@/pages/portal/PortalProfilePage'
import { DashboardPage } from '@/pages/DashboardPage'
import { TenantAlertsPage } from '@/pages/TenantAlertsPage'
import { ClientsPage } from '@/pages/ClientsPage'
import { UsersPage } from '@/pages/UsersPage'
import { ClientProfilePage } from '@/pages/ClientProfilePage'
import { ContractPage } from '@/pages/ContractPage'
import { ContractsPage } from '@/pages/ContractsPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { PaymentsPage } from '@/pages/PaymentsPage'
import { OverdueRentPage } from '@/pages/OverdueRentPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { PaymentSuccessPage } from '@/pages/PaymentSuccessPage'

export default function App() {
  return (
    <AppearanceProvider>
      <ThemeProvider>
        <PortalThemeProvider>
          <AuthProvider>
            <AppProvider>
              <BrowserRouter>
                <RouteThemeSync />
                <PortalThemeSync />
                <AdminModeFab />
                <Routes>
              <Route path="/" element={<RoleSelectPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage mode="client" />} />
              <Route path="/check-email" element={<CheckEmailPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/studio/login" element={<StudioLoginPage />} />
              <Route path="/studio/register" element={<StudioRegisterPage />} />
              <Route path="/portal/login" element={<PortalLoginPage />} />
              <Route path="/portal/register" element={<PortalRegisterPage />} />

              <Route element={<ProtectedRoute role="client" />}>
                <Route element={<PortalLayout />}>
                  <Route path="/portal" element={<PortalDashboardPage />} />
                  <Route path="/portal/profile" element={<PortalProfilePage />} />
                  <Route path="/portal/timeline" element={<PortalTimelinePage />} />
                  <Route path="/portal/contracts/:contractId" element={<PortalContractPage />} />
                  <Route path="/portal/payment/success" element={<PortalPaymentSuccessPage />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute role="admin" />}>
                <Route element={<AppLayout />}>
                  <Route path="/studio" element={<DashboardPage />} />
                  <Route path="/studio/alerts" element={<TenantAlertsPage />} />
                  <Route path="/studio/users" element={<UsersPage />} />
                  <Route path="/studio/clients" element={<ClientsPage />} />
                  <Route path="/studio/clients/:id" element={<ClientProfilePage />} />
                  <Route path="/studio/clients/:id/contract" element={<ContractPage />} />
                  <Route path="/studio/clients/:id/payment/success" element={<PaymentSuccessPage />} />
                  <Route path="/studio/contracts" element={<ContractsPage />} />
                  <Route path="/studio/payments" element={<PaymentsPage />} />
                  <Route path="/studio/payments/overdue" element={<OverdueRentPage />} />
                  <Route path="/studio/calendar" element={<CalendarPage />} />
                  <Route path="/studio/scheduler" element={<Navigate to="/studio/calendar" replace />} />
                  <Route path="/studio/settings" element={<SettingsPage />} />
                  <Route path="/studio/profile" element={<ProfilePage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AppProvider>
        </AuthProvider>
      </PortalThemeProvider>
    </ThemeProvider>
    </AppearanceProvider>
  )
}
