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
import { LiveUpdateIndicator } from '@/components/admin/LiveUpdateIndicator'
import { PublicDemoPovFab } from '@/components/auth/PublicDemoPovFab'
import { DemoIdleLockHost } from '@/components/auth/DemoIdleLockHost'
import { DemoGuideCueHost } from '@/components/auth/DemoGuideCueHost'
import { DemoTourNoticeHost } from '@/components/auth/DemoTourNoticeHost'
import { PaymentPartnerLogos } from '@/components/auth/PaymentPartnerLogos'
import { isAccountCreationEnabled } from '@/lib/accountCreation'
import { HomePage } from '@/pages/HomePage'
import { TermsOfServicePage } from '@/pages/TermsOfServicePage'
import { AccountSetupUnavailablePage } from '@/pages/AccountSetupUnavailablePage'
import { DemoPovPage } from '@/pages/demo/DemoPovPage'
import { CompanyDemoLinkPage } from '@/pages/demo/CompanyDemoLinkPage'
import { RoleSelectPage } from '@/pages/auth/RoleSelectPage'
import { InviteClaimPage } from '@/pages/auth/InviteClaimPage'
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
import { PortalReportPage } from '@/pages/portal/PortalReportPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { TenantAlertsPage } from '@/pages/TenantAlertsPage'
import { PropertiesPage } from '@/pages/PropertiesPage'
import { ClientProfilePage } from '@/pages/ClientProfilePage'
import { ContractPage } from '@/pages/ContractPage'
import { ContractsPage } from '@/pages/ContractsPage'
import { PaymentsPage } from '@/pages/PaymentsPage'
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
                <LiveUpdateIndicator />
                <AdminModeFab />
                <PublicDemoPovFab />
                <DemoIdleLockHost />
                <DemoGuideCueHost />
                <DemoTourNoticeHost />
                {/* Main column fills the viewport so the in-flow footer stays below the fold. */}
                <div className="flex min-h-dvh flex-col">
                  <div className="flex min-h-dvh flex-1 flex-col">
                    <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/terms" element={<TermsOfServicePage />} />
                  <Route path="/demo/pov" element={<DemoPovPage />} />
                  <Route path="/demo/company/:token" element={<CompanyDemoLinkPage />} />
                  <Route path="/welcome" element={<RoleSelectPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/account-setup" element={<AccountSetupUnavailablePage />} />
                  <Route
                    path="/invite/:token"
                    element={
                      isAccountCreationEnabled() ? (
                        <InviteClaimPage />
                      ) : (
                        <AccountSetupUnavailablePage />
                      )
                    }
                  />
                  <Route
                    path="/invite"
                    element={
                      isAccountCreationEnabled() ? (
                        <InviteClaimPage />
                      ) : (
                        <AccountSetupUnavailablePage />
                      )
                    }
                  />
                  <Route
                    path="/register"
                    element={
                      isAccountCreationEnabled() ? (
                        <RegisterPage mode="client" />
                      ) : (
                        <Navigate to="/" replace />
                      )
                    }
                  />
                  <Route path="/check-email" element={<CheckEmailPage />} />
                  <Route path="/verify-email" element={<VerifyEmailPage />} />
                  <Route path="/studio/login" element={<StudioLoginPage />} />
                  <Route
                    path="/studio/register"
                    element={
                      isAccountCreationEnabled() ? (
                        <StudioRegisterPage />
                      ) : (
                        <Navigate to="/" replace />
                      )
                    }
                  />
                  <Route path="/portal/login" element={<PortalLoginPage />} />
                  <Route
                    path="/portal/register"
                    element={
                      isAccountCreationEnabled() ? (
                        <PortalRegisterPage />
                      ) : (
                        <Navigate to="/" replace />
                      )
                    }
                  />

                  <Route element={<ProtectedRoute role="client" />}>
                    <Route element={<PortalLayout />}>
                      <Route path="/portal" element={<PortalDashboardPage />} />
                      <Route path="/portal/profile" element={<PortalProfilePage />} />
                      <Route path="/portal/timeline" element={<PortalTimelinePage />} />
                      <Route path="/portal/report" element={<PortalReportPage />} />
                      <Route path="/portal/contracts/:contractId" element={<PortalContractPage />} />
                      <Route path="/portal/payment/success" element={<PortalPaymentSuccessPage />} />
                    </Route>
                  </Route>

                  <Route element={<ProtectedRoute role="admin" />}>
                    <Route element={<AppLayout />}>
                      <Route path="/studio" element={<DashboardPage />} />
                      <Route path="/studio/openings" element={<Navigate to="/studio/properties" replace />} />
                      <Route path="/studio/rentals" element={<Navigate to="/studio/properties" replace />} />
                      <Route path="/studio/properties" element={<PropertiesPage />} />
                      <Route path="/studio/alerts" element={<TenantAlertsPage />} />
                      <Route path="/studio/users" element={<Navigate to="/studio" replace />} />
                      <Route path="/studio/clients" element={<Navigate to="/studio" replace />} />
                      <Route path="/studio/clients/:id" element={<ClientProfilePage />} />
                      <Route path="/studio/clients/:id/contract" element={<ContractPage />} />
                      <Route path="/studio/clients/:id/payment/success" element={<PaymentSuccessPage />} />
                      <Route path="/studio/contracts" element={<ContractsPage />} />
                      <Route path="/studio/payments" element={<PaymentsPage />} />
                      <Route
                        path="/studio/payments/overdue"
                        element={<Navigate to="/studio/payments?status=overdue" replace />}
                      />
                      <Route path="/studio/calendar" element={<Navigate to="/studio/properties" replace />} />
                      <Route path="/studio/scheduler" element={<Navigate to="/studio/properties" replace />} />
                      <Route path="/studio/settings" element={<SettingsPage />} />
                      <Route path="/studio/profile" element={<ProfilePage />} />
                    </Route>
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </div>
                  <PaymentPartnerLogos />
                </div>
            </BrowserRouter>
          </AppProvider>
        </AuthProvider>
      </PortalThemeProvider>
    </ThemeProvider>
    </AppearanceProvider>
  )
}
