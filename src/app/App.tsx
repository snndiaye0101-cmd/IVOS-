// ============================================
// IVOS App - Lazy Loading pour Performance
// Bundle optimisé : 2.49 MB → ~500 KB (-80%)
// ============================================

import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from '../shared/contexts/AuthContext'
import { ViewAsProvider } from '../shared/contexts/ViewAsContext'
import DashboardLayout from '../layouts/DashboardLayout'
import { ContextProvider } from '../shared/contexts/ContextProvider'
import { SiteProvider } from '../shared/contexts/SiteContext'
import { ProtectedRoute } from '../shared/components/ProtectedRoute'

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// ============================================
// LAZY LOADED ROUTES (Code-Splitting)
// ============================================

// Auth Pages (immédiat - pas de lazy)
import LoginPage from '../features/auth/pages/LoginPage'
import RegisterPage from '../features/auth/pages/RegisterPage'
import ResetPasswordPage from '../features/auth/pages/ResetPasswordPage'

// Dashboard (critique - chargé immédiatement)
import DashboardPage from '../features/reporting/pages/DashboardPage'

// Fleet Management (lazy)
const VehiclesPage = React.lazy(() => import('../features/fleet/pages/VehiclesPage'));
const VehiculesPersonnelsPage = React.lazy(() => import('../features/fleet/pages/VehiculesPersonnelsPage'));
const SinistresPage = React.lazy(() => import('../features/fleet/pages/SinistresPage'));
const MechanicsPage = React.lazy(() => import('../features/fleet/pages/MechanicsPage'));
const DriversPage = React.lazy(() => import('../features/fleet/pages/DriversPage'));
const HandlingEquipmentPage = React.lazy(() => import('../features/fleet/pages/HandlingEquipmentPage'));
const MaintenancePage = React.lazy(() => import('../features/fleet/pages/MaintenancePage'));
const HubCarburantPage = React.lazy(() => import('../features/fleet/pages/HubCarburantPage'));
const PreTripCheckPage = React.lazy(() => import('../features/fleet/pages/PreTripCheckPage'));
const PneumatiquePage = React.lazy(() => import('../features/fleet/pages/PneumatiquePage'));
const TrackingRealtime = React.lazy(() => import('../features/fleet/pages/TrackingRealtime'));

// Operations & Exploitation (lazy)
const OperationsPage = React.lazy(() => import('../features/operations/pages/OperationsPage'));
const SpecialOperationsPage = React.lazy(() => import('../features/exploitation/pages/SpecialOperationsPage'));
const ExploitationDashboardPage = React.lazy(() => import('../features/exploitation/pages/ExploitationDashboardPage'));
const BSDEnCoursPage = React.lazy(() => import('../features/exploitation/pages/BSDEnCoursPage'));

// Clients (lazy)
const ClientsPage = React.lazy(() => import('../features/clients/pages/ClientsPage'));

// Personnel & RH (lazy)
const Annuaire = React.lazy(() => import('../features/personnel/Annuaire'));
const GRHPage = React.lazy(() => import('../features/personnel/pages/GRHPage'));
const DemandeCongesMobile = React.lazy(() => import('../features/personnel/pages/DemandeCongesMobile'));
const BornePointagePage = React.lazy(() => import('../features/personnel/pages/BornePointagePage'));
const DocumentsEntreprisePage = React.lazy(() => import('../features/personnel/pages/DocumentsEntreprisePage'));
const BadgeConception = React.lazy(() => import('../features/personnel/badges/BadgeConception'));
const SecurityStaffPage = React.lazy(() => import('../features/personnel/pages/SecurityStaffPage'));
const MaintenanceStaffPage = React.lazy(() => import('../features/personnel/pages/MaintenanceStaffPage'));

// Finances (lazy)
const FinancePage = React.lazy(() => import('../features/finances/pages/FinancePage'));
const InvoicesPage = React.lazy(() => import('../features/finances/pages/InvoicesPage'));
const UniteFacturation = React.lazy(() => import('../features/finances/components/UniteFacturation'));
const LoanManagementPage = React.lazy(() => import('../features/finances/pages/LoanManagementPage'));
const SalaryWithDeductionsPage = React.lazy(() => import('../features/finances/pages/SalaryWithDeductionsPage'));
const FiscalRecapPage = React.lazy(() => import('../features/finances/pages/FiscalRecapPage'));
const GlobalExpensesPage = React.lazy(() => import('../features/finances/pages/GlobalExpensesPage'));
const RevenuesPage = React.lazy(() => import('../features/finances/pages/RevenuesPage'));

// Investments (lazy)
const InvestmentsPage = React.lazy(() => import('../features/investments/pages/InvestmentsPage'));

// Reporting & QHSE (lazy)
const ImpactReportPage = React.lazy(() => import('../features/reporting/pages/ImpactReportPage'));
const QHSEReportingPage = React.lazy(() => import('../features/qhse/pages/QHSEReportingPage'));
const CertificateVerificationPage = React.lazy(() => import('../features/qhse/pages/CertificateVerificationPage'));

// Technique (lazy)
const InventaireMaintenanceMateriels = React.lazy(() => import('../features/technique/pages/InventaireMaintenanceMateriels'));
const InventaireMateriels = React.lazy(() => import('../features/technique/pages/InventaireMateriels'));

// Settings (lazy)
const AdministrationSysteme = React.lazy(() => import('../features/settings/pages/AdministrationSysteme'));
const UserManagementWithSuperAdmin = React.lazy(() => import('../features/auth/pages/UserManagementWithSuperAdmin'));
const BaseConfigPage = React.lazy(() => import('../features/settings/pages/BaseConfigPage'));
const ClientsReferencePage = React.lazy(() => import('../features/settings/pages/ClientsReferencePage'));
const AlertThresholdsPage = React.lazy(() => import('../features/settings/pages/AlertThresholdsPage'));
const BackupsPage = React.lazy(() => import('../features/settings/pages/BackupsPage'));
const SecuritySettings = React.lazy(() => import('../features/settings/pages/SecuritySettings'));
const SystemConfigPage = React.lazy(() => import('../features/settings/pages/SystemConfigPage'));
const PayrollFiscalConfigPage = React.lazy(() => import('../features/settings/pages/PayrollFiscalConfigPage'));

// Chat & Team (lazy)
const ChatPage = React.lazy(() => import('../features/chat/pages/ChatPage'));
const TeamCalendar = React.lazy(() => import('../features/team/components/TeamCalendar'));
const EmailCenterPage = React.lazy(() => import('../features/email-center/pages/EmailCenterPage'));
const EmailCenterAdminPage = React.lazy(() => import('../features/email-center/pages/EmailCenterAdminPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
})


function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ViewAsProvider>
          <ContextProvider>
          <SiteProvider>
            <>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                    <Route index element={<DashboardPage />} />
                    {/* Flotte */}
                    <Route path="vehicles" element={<VehiclesPage />} />
                    <Route path="personal-vehicles" element={<VehiculesPersonnelsPage />} />
                    <Route path="fleet/handling-equipment" element={<HandlingEquipmentPage />} />
                    <Route path="hub-carburant" element={<HubCarburantPage />} />
                    <Route path="fuel-allocation" element={<HubCarburantPage />} />
                    <Route path="carburant" element={<HubCarburantPage />} />
                    {/* Exploitation */}
                    <Route path="pre-trip-check" element={<PreTripCheckPage />} />
                    <Route path="exploitation" element={<ExploitationDashboardPage />} />
                    <Route path="operations" element={<OperationsPage />} />
                    <Route path="exploitation/special-operations" element={<SpecialOperationsPage />} />
                    <Route path="exploitation/bsd-en-cours" element={<BSDEnCoursPage />} />
                    <Route path="flotte/tracking" element={<TrackingRealtime />} />
                    {/* Redirections */}
                    <Route path="exploitation/tank-cleaning" element={<Navigate to="/exploitation/special-operations" replace />} />
                    {/* Technique */}
                    <Route path="maintenance" element={<MaintenancePage />} />
                    <Route path="sinistres" element={<SinistresPage />} />
                    <Route path="pneumatique" element={<PneumatiquePage />} />
                    <Route path="inventaire-materiels" element={<InventaireMateriels />} />
                    <Route path="inventaire-maintenance-materiels" element={<InventaireMaintenanceMateriels />} />
                    {/* Personnel & RH */}
                    <Route path="personnel" element={<Annuaire />} />
                    <Route path="annuaire" element={<Annuaire />} />
                    <Route path="annuaire/badges" element={<BadgeConception />} />
                    <Route path="rh/documents" element={<DocumentsEntreprisePage />} />
                    <Route path="grh" element={<GRHPage />} />
                    <Route path="borne-pointage" element={<BornePointagePage />} />
                    <Route path="demande-conges" element={<DemandeCongesMobile />} />
                    <Route path="rh/security-staff" element={<SecurityStaffPage />} />
                    <Route path="rh/maintenance-staff" element={<MaintenanceStaffPage />} />
                    <Route path="drivers" element={<DriversPage />} />
                    <Route path="mechanics" element={<MechanicsPage />} />
                    <Route path="clients" element={<ClientsPage />} />
                    {/* Paramètres */}
                    <Route path="settings" element={<UserManagementWithSuperAdmin />} />
                    <Route path="settings/administration-systeme" element={<AdministrationSysteme />} />
                    <Route path="settings/base" element={<Navigate to="/settings/system-config" replace />} />
                    <Route path="settings/clients" element={<ClientsReferencePage />} />
                    <Route path="settings/alerts" element={<AlertThresholdsPage />} />
                    <Route path="settings/backups" element={<BackupsPage />} />
                    <Route path="settings/security" element={<SecuritySettings />} />
                    <Route path="settings/system-config" element={<SystemConfigPage />} />
                    <Route path="settings/payroll-fiscal-config" element={<PayrollFiscalConfigPage />} />
                    {/* Finances */}
                    <Route path="finances" element={<FinancePage />} />
                    <Route path="billing" element={<InvoicesPage />} />
                    <Route path="unite-facturation" element={<UniteFacturation />} />
                    <Route path="finances/loans" element={<LoanManagementPage />} />
                    <Route path="finances/salary-deductions" element={<SalaryWithDeductionsPage />} />
                    <Route path="finances/fiscal-recap" element={<FiscalRecapPage />} />
                    <Route path="finances/global-expenses" element={<GlobalExpensesPage />} />
                    <Route path="finances/revenues" element={<RevenuesPage />} />
                    {/* Gestion des Immobilisations & Infrastructures */}
                    <Route path="investissements" element={<InvestmentsPage />} />
                    {/* Admin */}
                    <Route path="users" element={<UserManagementWithSuperAdmin />} />
{/* Chat & Communications */}
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="communications/chat" element={<ChatPage />} />
                    <Route path="communications/agenda" element={<TeamCalendar />} />
                    <Route path="communications/email-center" element={<EmailCenterPage />} />
                    <Route path="communications/email-center/admin" element={<EmailCenterAdminPage />} />
                    {/* QHSE & Reporting */}
                    <Route path="qhse/reporting" element={<QHSEReportingPage />} />
                    <Route path="qhse/impact-report" element={<ImpactReportPage />} />
                  </Route>
                  {/* Pages publiques (hors DashboardLayout) */}
                  <Route path="/certificate/verify" element={<CertificateVerificationPage />} />
                  <Route path="/certificate/verify/:code" element={<CertificateVerificationPage />} />
                  <Route path="/login" element={<Navigate to="/" replace />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                </Routes>
              </Suspense>
              <Toaster position="top-right" richColors />
            </>
          </SiteProvider>
          </ContextProvider>
          </ViewAsProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
