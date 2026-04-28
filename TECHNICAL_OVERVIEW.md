# IVOS 61.1 - Comprehensive Technical Overview

**Project:** IVOS Fleet & Workflow Management System  
**Type:** Multi-tenant SaaS B2B Platform (Fleet Management + Waste Tracking)  
**Target:** Senegal + International subsidiaries  
**Current Date:** April 22, 2026

---

## 1. KEY CONFIGURATION FILES & BUILD SETTINGS

### 1.1 Package.json - Dependencies & Scripts

**Project Metadata:**
```json
{
  "name": "ivos-fleet-management",
  "version": "1.0.0",
  "type": "module",
  "description": "IVOS - Fleet & Workflow Management SaaS Platform"
}
```

**NPM Scripts:**
| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server (port 3000) |
| `npm run build` | TypeScript check + Vite build (dist/) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint with zero warnings |
| `npm run format` | Prettier code formatting |
| `npm run type-check` | TypeScript no-emit check |
| `npm run test` | Jest with no-test pass |
| `npm run test:watch` | Jest watch mode |
| `npm run test:coverage` | Jest coverage report |
| `npm run analyze` | Bundle size visualization |
| `npm run lighthouse` | Lighthouse audit |
| `npm run supabase:*` | Supabase local dev/reset |

**Core Dependencies (v1.0.0):**

**React Ecosystem:**
- react@18.2.0, react-dom@18.2.0
- react-router-dom@6.22.0 (SPA routing)
- react-hook-form@7.51.0 (form state management)
- @hookform/resolvers@3.3.4 (form validation)

**Database & State:**
- @supabase/supabase-js@2.39.7 (Backend API + Auth)
- @tanstack/react-query@5.25.0 (Server state + caching)
- zustand@4.5.2 (Client state - lightweight alternative to Redux)

**UI Components & Styling:**
- @radix-ui/* (accessibility-first headless UI - 15 component packages)
- tailwindcss-animate@1.0.7 (motion utilities)
- class-variance-authority@0.7.0 (component variant management)
- clsx@2.1.0 (className utility)
- tailwind-merge@2.2.1 (merge Tailwind classes)
- lucide-react@0.344.0 (icon library)
- react-icons@5.6.0 (additional icons)

**Data & Export:**
- jspdf@4.2.0 + jspdf-autotable@5.0.7 (PDF generation with tables)
- html2canvas@1.4.1 (HTML to image for PDF)
- xlsx@0.18.5 (Excel export)
- jszip@3.10.1 (ZIP archive creation)
- recharts@2.15.4 (data visualization - React charts)

**Forms & Validation:**
- zod@3.22.4 (TypeScript-first schema validation)
- react-day-picker@8.10.0 (date picker)

**Specialized Features:**
- @supabase/supabase-js@2.39.7 (real-time DB, storage, auth)
- leaflet@1.9.4 + react-leaflet@5.0.0 (mapping & GPS tracking)
- qrcode@1.5.4 + qrcode.react@4.2.0 (QR code generation)
- signature_pad@4.2.0 (digital signatures)
- @emoji-mart/react@1.1.1 (emoji picker)
- date-fns@3.3.1 (date utilities)
- axios@1.13.6 (HTTP client)
- sonner@1.4.3 (toast notifications)

**Error Tracking & Monitoring:**
- @sentry/react@10.49.0 (error reporting)
- @sentry/vite-plugin@5.2.0

**Offline Support:**
- idb@8.0.3 (IndexedDB wrapper for PWA offline data)

### 1.2 TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "noEmit": true
  }
}
```

**Path Aliases (for clean imports):**
```
@/*              → ./src/*
@app/*           → ./src/app/*
@features/*      → ./src/features/*
@shared/*        → ./src/shared/*
@layouts/*       → ./src/layouts/*
@assets/*        → ./src/assets/*
@styles/*        → ./src/styles/*
```

### 1.3 Vite Configuration (vite.config.ts)

**Development Server:**
- Port: 3000
- Host: true (accessible from mobile)
- Auto-open enabled

**Build Output:**
- Directory: `dist/`
- Target: ES2015
- Minifier: esbuild
- Sourcemaps: enabled
- Warning limit: 1 MB per chunk

**Plugin Stack:**
- `@vitejs/plugin-react` - JSX/Fast Refresh
- `vite-plugin-pwa` - Progressive Web App with Workbox
  - Service worker auto-updates
  - Offline cache strategy for Supabase requests (24-hour expiry)
  - Manifest: PWA display = standalone, theme = #0f172a

**Code-Splitting Strategy (Manual Chunks):**
```
- react-vendor      : react, react-dom, react-router-dom (~163 KB)
- supabase-vendor   : @supabase/supabase-js (~200+ KB)
- ui-vendor         : @radix-ui/* + tailwindcss (~400+ KB)
- query-vendor      : @tanstack/react-query (~50 KB)
- charts-vendor     : recharts, xlsx (~300+ KB)
```
**Optimization Result:** 2.49 MB → ~500 KB (-80% bundle reduction)

### 1.4 Jest Configuration (jest.config.cjs)

```javascript
{
  "preset": "ts-jest",
  "testEnvironment": "jsdom",
  "setupFilesAfterEnv": ["<rootDir>/jest.setup.ts"],
  "testMatch": ["<rootDir>/src/**/*.test.(ts|tsx)"],
  "transformIgnorePatterns": [
    "node_modules/(?!(jspdf|fflate|@babel|fast-png|dompurify)/)"
  ]
}
```

**Path Mapping in Tests:** Supports same alias system as TypeScript  
**CSS Modules:** Mocked via identity-obj-proxy  
**Test Files:** Glob pattern `**/*.test.ts` or `**/*.test.tsx`

---

## 2. MAIN ENTRY POINT & ROUTING STRUCTURE

### 2.1 Entry Point (src/main.tsx)

```tsx
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**HTML Root:** `<div id="root"></div>` in index.html  
**Styles Imported:** Global Tailwind CSS

### 2.2 App Root (src/app/App.tsx) - Routing & Providers

**Provider Hierarchy:**
```
<BrowserRouter>
  ├── <QueryClientProvider>          # TanStack Query setup
  ├── <AuthProvider>                 # Auth state & user session
  ├── <ViewAsProvider>               # Role-based view switching
  ├── <SiteProvider>                 # Site/subsidiary context
  ├── <ContextProvider>              # Global app context
  ├── <Toaster />                    # Sonner toast notifications
  └── <Routes>                       # React Router routes
```

### 2.3 Route Structure

**Authentication Routes (NOT lazy-loaded, immediate):**
- `/login` → LoginPage
- `/register` → RegisterPage
- `/reset-password` → ResetPasswordPage

**Protected Routes (under DashboardLayout):**
| Feature Module | Routes | Page Count |
|---|---|---|
| **Fleet Management** | `/fleet/vehicles`, `/fleet/drivers`, `/fleet/mechanics`, `/fleet/maintenance`, `/fleet/tracking-realtime`, `/fleet/pre-trip-check`, `/fleet/pneumatique`, `/fleet/hub-carburant`, `/fleet/sinistres`, `/fleet/handling-equipment`, `/fleet/personnel-vehicles` | 11 pages |
| **Exploitation** | `/exploitation/dashboard`, `/exploitation/special-ops`, `/exploitation/bsd-en-cours` | 3 pages |
| **Missions** | `/missions/dashboard` | 1 page |
| **Clients** | `/clients` | 1 page |
| **Personnel/HR** | `/personnel/annuaire`, `/personnel/grh`, `/personnel/congestion-demandes`, `/personnel/borne-pointage`, `/personnel/documents`, `/personnel/badge-conception` | 6 pages |
| **Finances** | `/finances`, `/finances/invoices`, `/finances/loans`, `/finances/salaries`, `/finances/expenses` | 5 pages |
| **Investments** | `/investments` | 1 page |
| **Reporting** | `/reporting/dashboard`, `/reporting/impact-report` | 2 pages |
| **QHSE** | `/qhse/reporting`, `/qhse/certificate-verification` | 2 pages |
| **Technique** | `/technique/inventaire-materiels`, `/technique/inventaire-maintenance` | 2 pages |
| **Settings** | `/settings/base-config`, `/settings/clients-reference`, `/settings/alerts`, `/settings/backups`, `/settings/security`, `/settings/system` | 6 pages |
| **Chat & Team** | `/chat`, `/team/calendar` | 2 pages |

**Total Lazy-Loaded Pages:** ~40+ pages using React.lazy() + Suspense

### 2.4 Query Client Setup

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,           // 5 minutes
      gcTime: 10 * 60 * 1000,             // garbage collection 10 min
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: true
    }
  }
})
```

---

## 3. CORE SERVICES & UTILITIES IN src/shared/

### 3.1 Services (/shared/services/)

**Supabase Integration:**
- `supabaseClient.ts` - Central Supabase instance
  - URL & Auth key from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  - Persistent sessions with localStorage
  - Auto token refresh enabled
  - Schema: 'public'

**Authentication & Authorization:**
- `authStore.ts` - Zustand store for user sessions, roles, permissions
- `permissionStore.ts` - RBAC role definitions (super_admin, country_manager, dispatcher, driver, client, supervisor)

**Data Services:**
- `mobileApiService.ts` - Mobile app sync, IoT telemetry (OBD-II, GPS)
- `analyticsService.ts` - Event tracking
- `dataAnalyticsService.ts` - Business analytics
- `auditService.ts` - Audit logging (who did what, when)

**Document & File Management:**
- `documentService.ts` - Polymorphic file handling (vehicles, drivers, missions, waste forms)
- `billingService.ts` - Invoice generation, expense tracking
- `webExportService.ts` - PDF/Excel export utilities
- `certificateService.ts` - QHSE certificate verification

**Operations & Background Tasks:**
- `annualClosureService.ts` - Fiscal year archival (missions, BSD, invoices)
- `autoSaveService.ts` - Auto-save form drafts
- `offlineService.ts` - PWA offline data sync
- `backupService.ts` - Data backup coordination

**Real-time & Notifications:**
- `notificationService.ts` - Toast/alert system
- `sentryService.ts` - Error tracking (DSN from `VITE_SENTRY_DSN`)

**Business Logic:**
- `hrService.ts` - HR operations (leave, attendance)
- `criticalActionService.ts` - Mission approval workflows
- `geolocationService.ts` - GPS tracking, Leaflet integration
- `tenantService.ts` - Multi-tenant operations (subsidiary management)
- `countryStore.ts` - Localization (Senegal: XOF, +221, etc.)

### 3.2 Contexts (/shared/contexts/)

- `AuthContext.tsx` - User auth, login/logout, admin approval flows
- `ViewAsContext.tsx` - Role-based view switching (see dashboard as different role)
- `SiteContext.tsx` - Current subsidiary/site selection
- `YearContext.tsx` - Fiscal year selection for reports
- `ContextProvider.tsx` - Central provider orchestration

### 3.3 Utilities (/shared/utils/)

- `cn.ts` - Tailwind className merger (clsx + tailwind-merge)
- `formatters.ts` - Date, currency, phone formatting
- `id.ts` - ID/UUID utilities
- `fictiveDataGenerator.ts` - Test data generation (for dev/demo)
- `quickTestConsole.ts` - Debug utilities

### 3.4 Shared Components (/shared/components/)

**UI Components (from shadcn/ui):**
- Button, Input, Modal, Dialog, Dropdown Menu
- Form inputs (Select, Checkbox, Radio, Switch)
- Tabs, Accordion, Popover, Tooltip
- Alert, Avatar, Badge, Separator
- Toast system (via sonner)

### 3.5 Shared Types (/shared/types/)

- TypeScript interfaces for database entities
- Request/response types
- Generated types from Supabase schema (via `supabase gen types typescript`)

---

## 4. DATABASE SCHEMA OVERVIEW

### 4.1 Multi-Tenant Architecture

**Core Tables:**

#### 1. `subsidiaries` (Tenants)
- **Purpose:** Country/regional operations (Senegal, other subsidiaries)
- **Key Fields:**
  - `id` (UUID, PK)
  - `country_code` (ISO 3166-1 alpha-3)
  - `currency_code` (default USD, override to XOF for Senegal)
  - `timezone`
  - `settings` (JSONB for customization)
- **Indexes:** country_code, is_active

#### 2. `user_profiles` (Extends Supabase auth.users)
- **Purpose:** User identity + role assignment
- **Roles:** super_admin, country_manager, dispatcher, driver, client, supervisor
- **Status:** active, inactive, suspended
- **Key Fields:**
  - `id` (FK to auth.users)
  - `subsidiary_id` (multi-tenant scoping)
  - `role`
  - `first_name`, `last_name`, `phone`
  - `last_login_at`, `metadata` (JSONB)
- **Indexes:** subsidiary_id, role, status

#### 3. `vehicles` (Fleet Management)
- **Purpose:** Vehicle registry with maintenance tracking
- **Types:** truck, van, tanker, trailer, compactor, other
- **Status:** available, in_mission, maintenance, out_of_service
- **Key Fields:**
  - `registration_number` (UNIQUE)
  - `vin` (Vehicle Identification Number)
  - `capacity_weight_kg`, `capacity_volume_m3`
  - `fuel_type`, `odometer_km`
  - `assigned_agent_id` (service vehicle assignment)
  - `next_maintenance_date`, `last_maintenance_date`
  - Document expiries: insurance, registration, technical_inspection
- **Indexes:** subsidiary_id, status, registration_number

#### 4. `drivers` (Fleet Management)
- **Purpose:** Driver profiles + certifications
- **Key Fields:**
  - `user_id` (FK to user_profiles)
  - `driver_license_number`, `license_type` (A, B, C, D, E)
  - `hazmat_certified`, `hazmat_expiry`
  - `forklift_certified`
  - `status` (available, on_mission, off_duty, suspended)
  - `current_vehicle_id`
- **Unique Constraint:** (user_id, subsidiary_id)

#### 5. `clients` (Client/Partner Registry)
- **Purpose:** Waste producers, receivers, and producers-receivers
- **Types:** producer, receiver, both
- **Key Fields:**
  - `company_name`
  - `tax_id`, `ninea` (local tax ID)
  - `contact_name`, `contact_email`, `contact_phone`
  - `gps_coordinates` (POINT for geolocation)
  - `certification_numbers` (JSONB: ISO, waste_producer_id)
  - `industry_sector`
- **Indexes:** subsidiary_id, type, company_name

#### 6. `missions` (Order Workflow)
- **Purpose:** Mission/order lifecycle
- **Status:** draft → validated → in_progress → completed → closed | cancelled
- **Types:** waste_collection, delivery, transfer, other
- **Key Fields:**
  - `mission_number` (UNIQUE, auto-generated)
  - `vehicle_id`, `driver_id` (resource assignment)
  - `origin_client_id`, `destination_client_id`
  - `planned_start_date`, `actual_start_date`
  - `planned_distance_km`, `actual_distance_km`
  - `created_by`, `validated_by`, `validated_at` (workflow)
  - `archived`, `archived_year` (fiscal year archival)
- **Indexes:** subsidiary_id, status, vehicle_id, driver_id, mission_number, dates

#### 7. `waste_tracking_forms` (BSD - Main Table)
- **Purpose:** Waste manifest (Bordereau de Suivi des Déchets)
- **4-Part Form:**
  - **Section A:** Producer info (producer_client_id, producer_name, address, contact)
  - **Section B:** Waste characterization (description, category_code, state: gaseous/liquid/solid/sludge/mixed, hazmat flag, UN number)
  - **Section C:** Transporter info (company_name, license, vehicle, driver, collection_date)
  - **Section D:** Destination facility (facility_name, reception_date, actual_weight_kg, acceptance_status)

- **Key Fields:**
  - `form_number` (UNIQUE)
  - `form_version`
  - `mission_id` (FK)
  - `packaging_type` (skip, tanker, drum, bag, bulk, container)
  - `is_hazardous`, `danger_class`, `hazard_codes` (JSONB)
  - **Signatures:**
    - `producer_signature_url`, `producer_signed_by`, `producer_signed_at`
    - `transporter_signature_url`, `transporter_signed_by`, `transporter_signed_at`
    - `destination_signature_url`, `destination_signed_by`, `destination_signed_at`
    - `supervisor_signature_url`, `supervisor_signed_by`, `supervisor_signed_at` (final validation)
  - `acceptance_status` (pending, accepted, rejected, partial)
  - `pdf_generated_at`, `pdf_url`, `pdf_webhook_triggered` (n8n integration)
  - `archived`, `archived_year` (fiscal archival)
- **Indexes:** subsidiary_id, mission_id, form_number, producer, destination, status, collection_date

#### 8. `signature_logs` (Audit Trail)
- **Purpose:** Track all signatures with metadata
- **Key Fields:**
  - `waste_tracking_form_id` (FK)
  - `signature_type` (producer, transporter, destination, supervisor)
  - `signed_by` (user_id)
  - `signature_url`
  - `ip_address`, `user_agent`, `gps_location`, `device_info` (JSONB)

#### 9. `documents` (Polymorphic File Storage)
- **Purpose:** Flexible document management
- **Entity Types:** vehicle, driver, mission, waste_form, client
- **Categories:** vehicle_registration, insurance, driver_license, waste_manifest, delivery_note, photo, other
- **Key Fields:**
  - `entity_type`, `entity_id` (polymorphic FK)
  - `file_path` (Supabase Storage path)
  - `expiry_date` (for licenses, insurance)
  - `metadata` (JSONB for custom attributes)

#### 10. `notifications` (User Alerts)
- **Types:** mission_assigned, mission_completed, document_expiring, waste_form_signed, maintenance_due, other
- **Key Fields:**
  - `user_id`
  - `title`, `message`
  - `is_read`, `read_at`
  - `entity_type`, `entity_id` (context link)

#### 11. `webhook_logs` (n8n Integration)
- **Purpose:** Track outbound webhooks
- **Events:** pdf_generation, notification_send, etc.
- **Key Fields:**
  - `event_type`, `entity_type`, `entity_id`
  - `webhook_url`, `payload` (JSONB)
  - `response_status`, `response_body`
  - `success`, `error_message`

### 4.2 Special Functions

**Annual Closure Function:**
```sql
CREATE FUNCTION cloture_annuelle(exercice INT)
-- Archives missions, waste_tracking_forms, invoices by fiscal year
-- Sets archived=TRUE, archived_year=exercice
```

### 4.3 Row Level Security (RLS)

All tables enforce RLS policies in `database/migrations/permissions_rls.sql`:
- Users see only data from their `subsidiary_id`
- Drivers access only their own missions and documents
- Supervisors see team data
- Super admins bypass RLS

### 4.4 Database Relationships Map

```
subsidiaries (1)
├──→ (n) user_profiles
│   ├──→ (n) drivers
│   ├──→ (n) signature_logs
│   └──→ (n) notifications
├──→ (n) vehicles
├──→ (n) clients
├──→ (n) missions
│   ├──→ (1) vehicles
│   ├──→ (1) drivers
│   ├──→ (1) origin_client
│   ├──→ (1) destination_client
│   └──→ (n) waste_tracking_forms
│       ├──→ (1) producer_client
│       ├──→ (1) destination_client
│       └──→ (n) signature_logs
└──→ (n) documents (polymorphic: vehicles, drivers, missions, waste_forms, clients)
```

---

## 5. FEATURES MODULES BREAKDOWN

### 5.1 `/src/features/auth/` - Authentication & User Management
**Pages:**
- `LoginPage` - Email/password authentication
- `RegisterPage` - User self-registration (requires admin approval)
- `ResetPasswordPage` - Password recovery
- `UserManagementWithSuperAdmin` - Admin panel for user approval/role assignment

**Components:** Form validation, OTP verification (if enabled)  
**Services:** Authentication via Supabase Auth, permission checking

---

### 5.2 `/src/features/fleet/` - Fleet Management (11 pages)

**Vehicles Module (`VehiclesPage`):**
- CRUD operations on vehicles
- Real-time vehicle status (available/in_mission/maintenance/out_of_service)
- Document tracking (registration, insurance, technical inspection expirations)
- Maintenance schedule management
- Odometer tracking

**Drivers Module (`DriversPage`):**
- Driver profile management
- License & certification tracking (hazmat, forklift)
- License expiry alerts
- Assignment to vehicles
- Status tracking (available/on_mission/off_duty/suspended)

**Maintenance Module (`MaintenancePage`):**
- Maintenance schedule CRUD
- Cost tracking per vehicle
- Maintenance history

**Pre-Trip Check (`PreTripCheckPage`):**
- Daily vehicle inspection checklist
- Photo documentation
- Driver sign-off

**Mechanics Module (`MechanicsPage`):**
- Maintenance staff management
- Work assignment tracking

**Handling Equipment (`HandlingEquipmentPage`):**
- Forklifts, loaders, attachments inventory
- Certification & maintenance tracking

**Fuel Hub (`HubCarburantPage`):**
- Fuel consumption tracking
- Cost analysis
- Supplier management

**Pneumatics/Tires (`PneumatiquePage`):**
- Tire inventory
- Wear tracking
- Replacement scheduling

**Accidents/Claims (`SinistresPage`):**
- Insurance claim documentation
- Incident reports
- Photo/video evidence

**Personnel Vehicles (`VehiculesPersonnelsPage`):**
- Personal vehicle assignments (service vehicles)
- Agent allocation

**Real-time Tracking (`TrackingRealtime`):**
- Live vehicle GPS tracking (Leaflet map)
- Route history
- Geofencing (zone entry/exit alerts)

---

### 5.3 `/src/features/exploitation/` - Operations & Waste Management

**Exploitation Dashboard (`ExploitationDashboardPage`):**
- KPI overview (missions today, vehicle utilization, waste collected)
- Real-time mission status
- Quick action shortcuts

**BSD En Cours (`BSDEnCoursPage`):**
- Active waste tracking forms
- Multi-step form workflow
- Signature capture (html2canvas + signature_pad)
- PDF generation trigger (webhook to n8n)

**Special Operations (`SpecialOperationsPage`):**
- High-value or hazmat missions
- Approval chains
- Risk assessment

---

### 5.4 `/src/features/waste-tracking/` - Waste Tracking Forms

Detailed BSD (Bordereau de Suivi des Déchets) management:
- 4-section form builder (Producer → Waste → Transporter → Destination)
- Hazmat classification (UN numbers, danger codes)
- Multi-signature workflow
- PDF generation with attachments
- Archive on fiscal year-end

---

### 5.5 `/src/features/clients/` - Client/Partner Management (`ClientsPage`)

- Client registry (producers, receivers, both)
- Contact management
- GPS coordinates for service territories
- Certification tracking (ISO, waste producer IDs)
- Tax ID/NINEA validation (Senegal)
- Industry classification

---

### 5.6 `/src/features/personnel/` - HR & Personnel (6 pages)

**Annuaire (`Annuaire`):**
- Employee directory
- Contact info searchable

**GRH Page (`GRHPage`):**
- Org chart
- Employee records
- Department management

**Leave Requests (`DemandeCongesMobile`):**
- Mobile-optimized leave request form
- Manager approval workflows
- Leave balance tracking
- Accrual calculations

**Time Clock (`BornePointagePage`):**
- Digital time-in/out
- Geo-verification (GPS at clock-in location)
- Attendance dashboard

**Company Documents (`DocumentsEntreprisePage`):**
- Policy documents
- Training materials
- Compliance uploads

**Badge Design (`BadgeConception`):**
- Employee ID badge generation
- Photo integration
- QR code embedding
- Batch printing

---

### 5.7 `/src/features/finances/` - Accounting & Billing (5 pages)

**Finance Dashboard (`FinancePage`):**
- Revenue overview
- Expense summary
- Budget vs. actual

**Invoices (`InvoicesPage`):**
- Invoice generation from missions
- Payment tracking
- Auto-numbering (XOF currency)
- PDF export with jsPDF-autotable

**Billing Unit (`UniteFacturation`):**
- Cost center management
- Project-based billing

**Loan Management (`LoanManagementPage`):**
- Employee/company loans
- Payment schedule tracking
- Interest calculations

**Salaries with Deductions (`SalaryWithDeductionsPage`):**
- Payroll computation
- Deduction management (taxes, insurance, loans)
- Batch payroll export

**Global Expenses (`GlobalExpensesPage`):**
- Expense categorization
- Cost analysis by department/project
- Receipt attachment

---

### 5.8 `/src/features/reporting/` - Analytics & Dashboards (2 pages)

**Main Dashboard (`DashboardPage`):**
- Executive summary with Recharts visualizations
- KPI widgets (missions completed, vehicles utilization, revenue)
- Role-based data filtering

**Impact Report (`ImpactReportPage`):**
- Waste collected by type & quantity
- Environmental impact metrics
- PDF/Excel export

---

### 5.9 `/src/features/qhse/` - Quality, Health, Safety & Environment (2 pages)

**QHSE Reporting (`QHSEReportingPage`):**
- Incident tracking
- Near-miss reporting
- Safety metrics dashboard

**Certificate Verification (`CertificateVerificationPage`):**
- ISO certification validation
- Driver/staff certification expiry tracking
- Renewal reminders

---

### 5.10 `/src/features/technique/` - Technical Equipment (2 pages)

**Equipment Inventory (`InventaireMateriels`):**
- Tools and equipment tracking
- Location assignment
- Maintenance logs

**Maintenance Inventory (`InventaireMaintenanceMateriels`):**
- Spare parts inventory
- Usage tracking
- Low-stock alerts

---

### 5.11 `/src/features/settings/` - System Configuration (6 pages)

**Base Config (`BaseConfigPage`):**
- Company name, logo, timezone
- Multi-language settings
- Default currency

**Clients Reference (`ClientsReferencePage`):**
- Approved client list management
- Category templates

**Alert Thresholds (`AlertThresholdsPage`):**
- Document expiry warning days
- Vehicle maintenance intervals
- Fuel budget limits

**Backups (`BackupsPage`):**
- Manual backup triggering
- Restore points
- Data retention policy

**Security Settings (`SecuritySettings`):**
- Password policy
- 2FA configuration
- Session timeout
- IP whitelist (if applicable)

**System Config (`SystemConfigPage`):**
- Feature flags
- Webhook URL configuration
- Rate limiting

---

### 5.12 `/src/features/team/` - Team & Collaboration

**Team Calendar:**
- Shared team events
- Leave visibility
- Mission assignments
- Real-time synchronization via Supabase

---

### 5.13 `/src/features/chat/` - Messaging (`ChatPage`)

- Real-time team chat (Supabase Realtime)
- File sharing
- Mission notifications
- Mobile-friendly interface

---

### 5.14 `/src/features/direction/` - Executive Dashboards

High-level strategic views:
- Financial dashboards
- KPI trends
- Subsidiary comparisons
- Budget forecasting

---

### 5.15 `/src/features/investments/` - Investment Management (`InvestmentsPage`)

- Capital project tracking
- ROI calculations
- Approval workflows
- Budget allocation

---

### 5.16 `/src/features/assurance/` - Insurance Management

- Policy registry
- Coverage tracking
- Claims management
- Expiry notifications
- Integration with vehicle/driver profiles

---

### 5.17 `/src/features/operations/` - Operations Management

Cross-cutting operational workflows not covered above.

---

## 6. BUILD & DEPLOYMENT SETUP

### 6.1 Development Environment Setup

**Prerequisites:**
```bash
# Node.js 18+ LTS
node --version

# npm 9+
npm --version

# Supabase CLI (for local dev database)
supabase --version
```

**Local Supabase Instance:**
```bash
npm run supabase:start    # Start local PostgreSQL + API emulator
npm run supabase:types   # Generate TypeScript types from schema
npm run supabase:reset   # Reset to schema + seed data
```

**Install Dependencies:**
```bash
npm install
```

**Development Server:**
```bash
npm run dev
# Vite dev server at http://localhost:3000
# Hot module replacement enabled
# Accessible from mobile on local network
```

### 6.2 Environment Variables (.env.local)

**Required Variables:**
```env
# Supabase (Cloud or Local)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Error Tracking (Optional)
VITE_SENTRY_DSN=https://...@sentry.io/...

# Feature Flags (Optional)
VITE_ENABLE_PWA=true
VITE_ENABLE_OFFLINE=true
VITE_API_TIMEOUT_MS=30000

# n8n Webhook Endpoint (for PDF generation, notifications)
VITE_N8N_WEBHOOK_URL=https://n8n.example.com/webhook/...
```

### 6.3 Build Process

**Production Build:**
```bash
npm run build
# 1. TypeScript type-checking (tsc)
# 2. Vite bundling with code-splitting
# 3. Output: dist/ folder ready for deployment
```

**Build Output Structure:**
```
dist/
├── index.html              # Entry point
├── vite.svg
├── assets/
│   ├── index-XXX.js        # Main bundle (code-split)
│   ├── react-vendor-XXX.js # React ecosystem
│   ├── ui-vendor-XXX.js    # Radix UI + Tailwind
│   ├── query-vendor-XXX.js # TanStack Query
│   ├── charts-vendor-XXX.js# Recharts, XLSX
│   └── supabase-vendor-XXX.js
│   └── css/
│       └── index-XXX.css   # Minified Tailwind CSS
└── manifest.json           # PWA manifest
```

### 6.4 Deployment Targets

**Recommended Platforms:**

1. **Vercel (Recommended for SPA):**
   ```bash
   npm install -g vercel
   vercel deploy
   ```
   - Environment variables configured in Vercel dashboard
   - Auto-deploys on git push to main
   - Supports serverless functions for webhooks
   - CDN distribution globally

2. **Netlify:**
   ```bash
   netlify deploy --prod --dir=dist
   ```
   - Similar to Vercel
   - Built-in form handling
   - Edge functions for API proxying

3. **Docker (Self-hosted):**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY . .
   RUN npm ci && npm run build
   FROM nginx:alpine
   COPY --from=builder /app/dist /usr/share/nginx/html
   ```
   - Push to Docker Hub, deploy to Kubernetes/Docker Swarm
   - Environment variables via ConfigMap/Secrets

4. **Direct Server (Linux/Ubuntu):**
   ```bash
   # Build locally or on server
   npm run build
   
   # Serve with Nginx reverse proxy
   # Static files: /var/www/ivos/dist/
   # SSL with Let's Encrypt
   ```

### 6.5 Supabase Deployment (Backend)

**Cloud Deployment:**
1. Create project at supabase.com
2. Run migrations:
   ```bash
   supabase db push  # Applies database/schema.sql
   ```
3. Enable RLS on all tables (automated in migrations)
4. Configure Auth providers (Email, Google OAuth, etc.)
5. Setup Storage buckets (documents, photos, signatures)
6. Deploy Edge Functions for n8n integration

**Hosting Database Backups:**
- Supabase auto-backups daily
- Manual exports available via dashboard
- Point-in-time recovery (PITR) with paid plans

### 6.6 n8n Webhook Integration (PDF & Notifications)

**Webhook Trigger:**
- Event: `waste_tracking_form.completed`
- Endpoint: `https://n8n.example.com/webhook/generate-pdf`
- Payload: Form ID, user info, attachment URLs

**n8n Workflow Steps:**
1. Trigger webhook
2. Fetch form data from Supabase
3. Generate PDF with jsPDF template
4. Upload PDF to Supabase Storage
5. Update `waste_tracking_forms.pdf_url` & `pdf_webhook_triggered`
6. Send notification to stakeholders (email, SMS, push)

---

## 7. CODE ORGANIZATION & CONVENTIONS

### 7.1 Component Structure Example

**Feature Module Pattern:**
```
features/fleet/
├── pages/
│   ├── VehiclesPage.tsx         # Route component
│   ├── DriversPage.tsx
│   └── MaintenancePage.tsx
├── components/
│   ├── VehicleForm.tsx          # Reusable form
│   ├── VehicleCard.tsx
│   ├── MaintenanceSchedule.tsx
│   └── DriverTable.tsx
├── services/
│   ├── vehicleService.ts        # API calls
│   └── driverService.ts
├── types/
│   ├── index.ts                 # Local types
│   └── vehicle.ts
└── hooks/
    ├── useVehicles.ts           # Query hooks
    └── useDrivers.ts
```

### 7.2 API Call Pattern (TanStack Query)

```tsx
// Hook: useVehicles.ts
import { useQuery, useMutation } from '@tanstack/react-query'
import { vehicleService } from '../services/vehicleService'

export function useVehicles(subsidiaryId: string) {
  return useQuery({
    queryKey: ['vehicles', subsidiaryId],
    queryFn: () => vehicleService.getVehicles(subsidiaryId),
    staleTime: 5 * 60 * 1000
  })
}

export function useCreateVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => vehicleService.createVehicle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    }
  })
}

// Component Usage:
function VehiclesPage() {
  const { data: vehicles, isLoading } = useVehicles(subsidiaryId)
  const { mutate: createVehicle } = useCreateVehicle()
  
  return <VehicleList vehicles={vehicles} />
}
```

### 7.3 Form Handling (React Hook Form)

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { vehicleSchema } from '../types'

function VehicleForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { ... }
  })
  
  const onSubmit = async (data) => {
    await vehicleService.createVehicle(data)
    toast.success('Vehicle created')
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('registration_number')} />
      {errors.registration_number && <span>{errors.registration_number.message}</span>}
      <Button type="submit">Save</Button>
    </form>
  )
}
```

### 7.4 Styling Conventions

- **Tailwind Classes:** Use `cn()` utility for merging conditional classes
- **Colors:** Theme color system via CSS variables (--primary, --secondary, etc.)
- **Responsive:** Mobile-first (`md:`, `lg:` prefixes)
- **Dark Mode:** Supported via `darkMode: ['class']` in tailwind.config.js

```tsx
import { cn } from '@shared/utils'

function Button({ variant = 'primary', className, ...props }) {
  return (
    <button className={cn(
      'px-4 py-2 rounded font-medium transition',
      variant === 'primary' && 'bg-primary text-white hover:bg-primary/90',
      variant === 'secondary' && 'bg-gray-200 text-gray-900 hover:bg-gray-300',
      className
    )} {...props} />
  )
}
```

---

## 8. PERFORMANCE OPTIMIZATIONS

### 8.1 Bundle Size Reduction

- **Code-Splitting:** 40+ lazy-loaded route pages
- **Chunk Strategy:** Vendor bundling (React, UI, Query, Charts, Supabase)
- **Result:** 2.49 MB → ~500 KB main bundle (-80%)

### 8.2 Caching Strategy

- **TanStack Query:** 5-minute stale time, 10-minute garbage collection
- **Supabase Storage:** 24-hour cache for documents/signatures
- **Browser Cache:** Service Worker caches static assets + API responses

### 8.3 Image & Asset Optimization

- **Leaflet Maps:** Lazy-load only when needed
- **Signatures:** Stored as data URLs, synced to Supabase Storage
- **Photos:** Compress before upload (via html2canvas)

### 8.4 Database Query Optimization

- **Indexes:** On all FK, status, and search fields
- **Pagination:** Implement for large lists (waste forms, missions)
- **Aggregation:** Use PostgreSQL for complex analytics

---

## 9. TESTING STRATEGY

### 9.1 Test Types

- **Unit Tests:** Component logic, utilities, services
- **Integration Tests:** API calls with Supabase emulator
- **E2E Tests:** User workflows (login, create mission, sign form)

### 9.2 Running Tests

```bash
npm run test                # Jest single run
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### 9.3 Test File Location & Pattern

```
src/
├── features/fleet/pages/
│   ├── VehiclesPage.tsx
│   └── VehiclesPage.test.tsx    # Co-located test
├── shared/services/
│   ├── vehicleService.ts
│   └── vehicleService.test.ts
```

---

## 10. KEY PROJECT FEATURES & HIGHLIGHTS

| Feature | Implementation |
|---------|---|
| **Multi-Tenant SaaS** | Subsidiary-based isolation, RLS at DB level |
| **RBAC** | 6 roles (super_admin, country_manager, dispatcher, driver, client, supervisor) |
| **Waste Tracking** | 4-section BSD with digital signatures, PDF generation |
| **Fleet Management** | Vehicle + driver + maintenance + fuel + real-time tracking (Leaflet) |
| **Reporting** | KPI dashboards, Recharts, PDF/Excel export |
| **Offline-First** | PWA with IndexedDB sync, Workbox cache strategy |
| **Mobile-Optimized** | Responsive design, Touch-friendly forms, GPS integration |
| **Real-time** | Supabase Realtime for chat, notifications, mission updates |
| **Integrations** | n8n webhooks for PDF generation, email notifications |
| **Localization** | Senegal focus: XOF currency, +221 phone, French UI |
| **Security** | RLS, RBAC, Sentry error tracking, 2FA ready |
| **Accessibility** | Radix UI (headless a11y), color contrast, keyboard navigation |

---

## 11. QUICK START CHECKLIST FOR NEW DEVELOPERS

- [ ] Clone repository
- [ ] `npm install` to install dependencies
- [ ] Create `.env.local` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [ ] `npm run supabase:start` to start local database
- [ ] `npm run supabase:types` to generate DB types
- [ ] `npm run dev` to start dev server at http://localhost:3000
- [ ] Explore routes in `src/app/App.tsx`
- [ ] Check feature module structure in `src/features/`
- [ ] Review database schema in `database/schema.sql`
- [ ] Read relevant `.md` files (DEVELOPER_GUIDE.md, ARCHITECTURE_VISUELLE.md, etc.)

---

## 12. USEFUL DOCUMENTATION FILES IN REPO

- `DEVELOPER_GUIDE.md` - Development guidelines and best practices
- `ARCHITECTURE_VISUELLE.md` - Visual system architecture
- `README.md` - Project overview
- `database/DATABASE_RELATIONS.md` - ER diagrams and relationships
- `docs/ACCESSIBILITE_GUIDE.md` - Accessibility standards
- `docs/SECURITE_CONFORMITE.md` - Security & compliance policies

---

**Generated:** April 22, 2026  
**Status:** IVOS 61.1 Complete Technical Overview
