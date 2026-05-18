# 🎯 IVOS 61.1 - Guide de Migration Per-Site & Points Critiques

**Date :** 29 avril 2026  
**Version :** 1.0  
**Audience :** Architects, Senior Developers, Product Managers

---

## 📋 Table des Matières

1. [État Actuel de la Migration Per-Site](#1-état-actuel-de-la-migration-per-site)
2. [Architecture Multi-Tenant Détaillée](#2-architecture-multi-tenant-détaillée)
3. [Points Critiques Rangés par Sévérité](#3-points-critiques-rangés-par-sévérité)
4. [Dépendances Intra-Modules](#4-dépendances-intra-modules)
5. [Guide de Diagnostic & Troubleshooting](#5-guide-de-diagnostic--troubleshooting)
6. [Priorisation des Optimisations](#6-priorisation-des-optimisations)

---

## 1. État Actuel de la Migration Per-Site

### 1.1 Résumé d'État

```
MIGRATION STATUS
├─ ✅ COMPLETED (80%)
│  ├─ Multi-tenant schema (subsidiary_id everywhere)
│  ├─ SiteContext (userSite, activeSite)
│  ├─ countryStore (countries, sites, rates)
│  ├─ RLS policies (basic enforcement)
│  ├─ permissionStore (per-user access)
│  ├─ baseConfigStore (system config)
│  └─ siteConfigStore (per-site config)
│
├─ 🟡 IN PROGRESS (15%)
│  ├─ Per-site budget thresholds
│  ├─ Per-site dashboard customization
│  ├─ Per-site alert configurations
│  ├─ Consolidated view (super admin multi-site)
│  └─ Per-site export/reports
│
└─ ⚠️ TODO (5%)
   ├─ Complete RLS testing (all roles)
   ├─ Merge ContextProvider with SiteContext
   ├─ Full Supabase migration (from localStorage)
   ├─ Performance tuning (5+ sites)
   └─ Documentation update
```

### 1.2 Data Flow: Per-Site Configuration

```
┌─────────────────────────────────────────────────┐
│            USER LOGIN (AuthContext)             │
│  ├─ Verify email/password (Supabase Auth)      │
│  └─ Fetch user_profiles row (subsidiary_id)    │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  SITE CONTEXT INITIALIZED  │
        ├────────────────────────────┤
        │ • userCountry (from DB)   │
        │ • userSite (from DB)      │
        │ • currencyCode (from DB)   │
        │ • currencySymbol (from DB) │
        └────────────────┬───────────┘
                         │
                         ▼
        ┌────────────────────────────┐
        │  LOAD SITE CONFIGURATION   │
        ├────────────────────────────┤
        │ • siteConfigStore.get()   │
        │   (timezone, language)     │
        │ • budgetService.get()     │
        │   (annual budget threshold)│
        │ • payrollSettingsStore.get│
        │   (payroll config)         │
        └────────────────┬───────────┘
                         │
                         ▼
        ┌────────────────────────────┐
        │  ALL QUERIES FILTERED      │
        ├────────────────────────────┤
        │ API calls include:         │
        │ ├─ JWT (user info)        │
        │ ├─ subsidiary_id (DB RLS) │
        │ └─ activeSite (context)   │
        └────────────────┬───────────┘
                         │
                         ▼
        ┌────────────────────────────┐
        │  SUPER ADMIN "VIEW AS"     │
        ├────────────────────────────┤
        │ If super admin:            │
        │ ├─ Can override site (viewSite)  │
        │ ├─ Can select consolidate view   │
        │ └─ See all subsidiaries    │
        └────────────────────────────┘
```

### 1.3 RLS Policies In Action

**Example: Vehicles Table**

```sql
-- Table definition
CREATE TABLE vehicles (
  id UUID PRIMARY KEY,
  subsidiary_id UUID NOT NULL REFERENCES subsidiaries(id),
  registration VARCHAR,
  status VARCHAR,
  ... other fields
);

-- RLS Policy: SELECT (users only see their subsidiary's vehicles)
CREATE POLICY "users_select_own_subsidiary_vehicles" ON vehicles
  FOR SELECT
  USING (
    subsidiary_id = (
      SELECT subsidiary_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );

-- RLS Policy: INSERT (only admins can add vehicles)
CREATE POLICY "admins_insert_vehicles" ON vehicles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'country_manager')
      AND subsidiary_id = vehicles.subsidiary_id
    )
  );

-- RLS Policy: UPDATE (only admins of same subsidiary)
CREATE POLICY "admins_update_vehicles" ON vehicles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'country_manager')
      AND subsidiary_id = vehicles.subsidiary_id
    )
  );
```

### 1.4 Configuration Files Hierarchy

```
Configuration Priority (higher = overwrites lower)
┌──────────────────────────────────────────────┐
│  1. SUPER ADMIN OVERRIDES                    │
│     └─ ViewAsContext (temporary, per session)│
├──────────────────────────────────────────────┤
│  2. SITE-SPECIFIC CONFIG                     │
│     └─ siteConfigStore (per subsidiary_id)  │
├──────────────────────────────────────────────┤
│  3. GLOBAL CONFIG                            │
│     └─ baseConfigStore (system-wide)        │
├──────────────────────────────────────────────┤
│  4. DATABASE DEFAULTS                        │
│     └─ subsidiaries table (factory defaults)│
└──────────────────────────────────────────────┘

EXAMPLE: Budget Threshold
┌─────────────────────────────────────────────────┐
│ Super Admin viewing Site A:                     │
│ 1. Is there a viewSite override? No            │
│ 2. Load userSite config → Site A config        │
│ 3. budgetService.getBudgetConfig() → siteConfig│
│ 4. Apply threshold to this site's expenses     │
└─────────────────────────────────────────────────┘

EXAMPLE: Budget Threshold (Consolidated View)
┌─────────────────────────────────────────────────┐
│ Super Admin with consolidated view:            │
│ 1. isConsolidatedView = true                   │
│ 2. Skip per-site filters                       │
│ 3. Use global baseConfigStore thresholds       │
│ 4. Query all subsidiaries (RLS disabled for SA)│
└─────────────────────────────────────────────────┘
```

---

## 2. Architecture Multi-Tenant Détaillée

### 2.1 Schema Design Pattern

**Principle:** Every table includes `subsidiary_id` for enforcement at DB level

```typescript
// ❌ ANTI-PATTERN (filtering at app level only)
CREATE TABLE vehicles (
  id UUID PRIMARY KEY,
  registration VARCHAR,
  ... fields
);
// Risk: Filtering can be bypassed at app level

// ✅ PATTERN (filtering at DB level + app level)
CREATE TABLE vehicles (
  id UUID PRIMARY KEY,
  subsidiary_id UUID NOT NULL REFERENCES subsidiaries(id),
  registration VARCHAR,
  ... fields
);
// Benefit: Even direct SQL queries respect RLS
```

### 2.2 Multi-Tenant Data Isolation Tests

**Critical Tests to Run:**

```typescript
// Test 1: User A cannot see User B's data
test('User A in subsidiary SEN cannot see data from subsidiary CIV', async () => {
  // User A (Senegal)
  const vehiclesA = await userAClient
    .from('vehicles')
    .select('*');
  
  // All vehicles should have subsidiary_id = 'sen'
  vehiclesA.data.forEach(v => {
    assert(v.subsidiary_id === 'sen');
  });
});

// Test 2: Direct SQL injection doesn't break isolation
test('Direct SQL injection respects RLS', async () => {
  const maliciousQuery = `
    SELECT * FROM vehicles 
    WHERE subsidiary_id != 'sen'
  `;
  
  // Even with injection, RLS enforces:
  // WHERE subsidiary_id = current_user_subsidiary
  // So query returns empty
});

// Test 3: Admin can see only their subsidiary
test('Country manager in SEN cannot see CIV data', async () => {
  // Country manager token for SEN
  const vehicles = await countryManagerToken
    .from('vehicles')
    .select('*');
  
  // All should be subsidiary_id = 'sen'
});

// Test 4: Super admin can opt-out of RLS (with logging)
test('Super admin can query across subsidiaries', async () => {
  // Super admin has special bypass (logged!)
  const allVehicles = await superAdminClient
    .rpc('get_vehicles_all_subsidiaries', {
      logged: true // Audit trail required
    });
  
  // Should return vehicles from all subsidiaries
  assert(allVehicles.data.length > 1);
});
```

### 2.3 Per-Site Configuration Cascade

**Example: Alert Threshold Configuration**

```typescript
// GLOBAL (baseConfigStore)
baseConfigStore.getAlertThreshold('maintenance_days'); // 7 days

// SITE-SPECIFIC OVERRIDE (siteConfigStore)
siteConfigStore.getAlertThreshold('DKR', 'maintenance_days'); // 5 days (Dakar site)

// ACTUAL VALUE USED
const threshold = siteConfigStore.has('DKR', 'maintenance_days')
  ? siteConfigStore.get('DKR', 'maintenance_days')  // 5 days
  : baseConfigStore.getAlertThreshold('maintenance_days'); // 7 days fallback

// RESULT: Dakar site uses 5 days, other sites use 7 days
```

---

## 3. Points Critiques Rangés par Sévérité

### 3.1 🔴 CRITICAL (Impair Safety/Compliance)

#### Issue #1: RLS Policy Complexity & Loopholes

**Location:** `database/schema.sql` - RLS policies

**Problem:**
```
Complex RLS policies can have edge cases
├─ Nested SELECT queries (performance issue)
├─ Possible bypass with lateral joins
├─ Admin policies not exhaustively tested
└─ Super admin bypass path not logged
```

**Risk:**
- Data leakage between subsidiaries
- Regulatory non-compliance (GDPR)
- Undetectable data theft

**Mitigation (REQUIRED):**
```typescript
// 1. Test every RLS policy with every role
const testRLSComprehensive = async () => {
  const roles = ['super_admin', 'country_manager', 'dispatcher', 'driver'];
  const subsidiaries = ['sen', 'civ', 'gnf'];
  
  // 3x3x28 = 252 test cases (1 per role+sub+table)
  for (const role of roles) {
    for (const sub of subsidiaries) {
      for (const table of TABLES_28) {
        const userToken = createTestToken(role, sub);
        const data = await queryTable(table, userToken);
        
        // Assert: data.every(row => row.subsidiary_id === sub)
        assertRLSEnforced(table, role, sub, data);
      }
    }
  }
};

// 2. Log all super admin access
createPolicy('log_super_admin_access', `
  FOR SELECT
  USING (
    subsidiary_id = current_user_subsidiary
    OR (
      auth.uid() IN (SELECT id FROM super_admins)
      AND log_access(auth.uid(), 'access_subsidiary', subsidiary_id)
    )
  )
`);

// 3. Audit weekly for unexpected access patterns
SELECT
  user_id, subsidiary_id, COUNT(*) as query_count,
  DATE(timestamp) as date
FROM audit_logs
WHERE action = 'select'
GROUP BY user_id, subsidiary_id, date
HAVING query_count > 1000 -- Anomaly
ORDER BY query_count DESC;
```

---

#### Issue #2: Offline Sync Conflicts (Lost Data Risk)

**Location:** `src/shared/services/offlineService.ts`

**Problem:**
```
Offline drafts may conflict with cloud updates
├─ User edits vehicle offline (Vehicle A)
├─ Manager edits same vehicle online (Vehicle B)
├─ User reconnects: Which version wins?
└─ Current: Last-write-wins (loses data)
```

**Risk:**
- Data loss (vehicle maintenance records, etc)
- Inconsistent state
- User frustration

**Mitigation (REQUIRED):**
```typescript
// Implement 3-way merge strategy
type SyncConflictResolution = {
  strategy: 'merge' | 'manual' | 'last-write-wins'
  result: Vehicle
  conflicts: {
    field: string
    offlineValue: any
    cloudValue: any
  }[]
};

const resolveVehicleSyncConflict = (
  offlineVersion: Vehicle,
  cloudVersion: Vehicle,
  baseVersion: Vehicle
): SyncConflictResolution => {
  const conflicts = [];
  const result = { ...cloudVersion };
  
  // Field-by-field comparison
  for (const field of VEHICLE_FIELDS) {
    const offlineChanged = offlineVersion[field] !== baseVersion[field];
    const cloudChanged = cloudVersion[field] !== baseVersion[field];
    
    if (offlineChanged && cloudChanged) {
      // CONFLICT: Both sides changed
      conflicts.push({
        field,
        offlineValue: offlineVersion[field],
        cloudValue: cloudVersion[field]
      });
      
      // Strategy:
      // 1. For timestamps: Use offline (more recent)
      // 2. For statuses: Use cloud (server source of truth)
      // 3. For other: Prompt user
      if (field.includes('date') || field.includes('time')) {
        result[field] = offlineVersion[field];
      } else if (field === 'status') {
        result[field] = cloudVersion[field];
      } else {
        // Show conflict dialog to user
      }
    } else if (offlineChanged) {
      // Only offline changed: use offline
      result[field] = offlineVersion[field];
    }
    // If only cloud changed: keep cloud value (already in result)
  }
  
  return { strategy: 'merge', result, conflicts };
};
```

---

#### Issue #3: Payment Integrity (Financial Risk)

**Location:** `src/features/finances/services/paymentService.ts`

**Problem:**
```
Payment double-charging risk
├─ User clicks "Pay" twice
├─ Network lag (appears to fail)
├─ Both requests get processed
└─ Customer charged twice
```

**Risk:**
- Financial loss
- Customer complaints
- Audit findings

**Mitigation (REQUIRED):**
```typescript
// Implement idempotency keys
interface PaymentRequest {
  invoiceId: string
  amount: number
  mode: 'virement' | 'cheque' | 'especes' | 'autre'
  idempotencyKey: string // UUID generated client-side
  metadata?: Record<string, any>
}

// Server-side: Check idempotency
const processPayment = async (req: PaymentRequest) => {
  // Check if this idempotencyKey already processed
  const existing = await db
    .from('payments')
    .select('*')
    .eq('idempotency_key', req.idempotencyKey)
    .single();
  
  if (existing) {
    // Return cached result (don't process again)
    return existing;
  }
  
  // Process payment in transaction
  const payment = await db.transaction(async (trx) => {
    const newPayment = await trx.from('payments').insert({
      invoice_id: req.invoiceId,
      amount: req.amount,
      mode: req.mode,
      idempotency_key: req.idempotencyKey,
      status: 'pending',
      created_at: now()
    }).select().single();
    
    // Update invoice status
    await trx.from('invoices')
      .update({ status: 'paid' })
      .eq('id', req.invoiceId);
    
    return newPayment;
  });
  
  return payment;
};

// Client-side: Generate idempotency key
const handlePayment = async () => {
  const idempotencyKey = crypto.randomUUID();
  
  try {
    const payment = await api.createPayment({
      invoiceId: selectedInvoice.id,
      amount: selectedInvoice.amount,
      mode: paymentMode,
      idempotencyKey, // Same key for all retries
    });
  } catch (error) {
    // Safe to retry with same idempotencyKey
    // Server will return cached result
  }
};
```

---

### 3.2 🟡 HIGH (Major Feature Impact)

#### Issue #4: Test Coverage Insufficient (55%)

**Location:** Codebase-wide

**Problem:**
```
Test Suite Status:
├─ Unit Tests: 38 tests total
├─ Coverage: 55% of codebase
├─ Critical services: Not tested
│  ├─ bsdService (workflow validation)
│  ├─ paymentService (financial)
│  ├─ offlineService (data integrity)
│  └─ workflowService (9-step BSD)
├─ Integration tests: None
└─ E2E tests: Limited
```

**Risk:**
- Regressions in critical flows
- Data loss undetected
- Security holes
- Compliance failures

**Mitigation (1 week):**
```typescript
// Priority: Test critical services

// 1. Test BSD Workflow Validation
test('BSD workflow enforces 9 steps sequentially', () => {
  const bsd = createBSD();
  
  // Can't skip to step 9
  expect(() => updateBSDStep(bsd.id, 9)).toThrow();
  
  // Must complete step 1-8 first
  for (let i = 1; i <= 9; i++) {
    updateBSDStep(bsd.id, i);
    expect(getCurrentStep(bsd.id)).toBe(i);
  }
});

// 2. Test Payment Idempotency
test('Payment with same idempotencyKey returns cached', async () => {
  const key = 'test-payment-123';
  
  const payment1 = await createPayment({
    invoiceId: 'inv-1',
    amount: 1000,
    idempotencyKey: key
  });
  
  const payment2 = await createPayment({
    invoiceId: 'inv-1',
    amount: 1000,
    idempotencyKey: key
  });
  
  // Should return same payment (no double charge)
  expect(payment1.id).toBe(payment2.id);
});

// 3. Test Offline Sync (3-way merge)
test('Offline sync resolves conflicts correctly', () => {
  const base = { registration: 'SN-123', status: 'available', mileage: 100 };
  const offline = { registration: 'SN-123', status: 'available', mileage: 150 }; // Mileage updated
  const cloud = { registration: 'SN-456', status: 'maintenance', mileage: 100 }; // Registration + status changed
  
  const result = resolveVehicleSyncConflict(offline, cloud, base);
  
  // Should merge intelligently:
  // - registration: cloud (server source of truth)
  // - status: cloud (critical field)
  // - mileage: offline (more recent)
  expect(result.result).toEqual({
    registration: 'SN-456',
    status: 'maintenance',
    mileage: 150
  });
});

// 4. Test RLS Isolation
test('User A cannot see User B data (RLS)', async () => {
  const userAVehicles = await userAClient
    .from('vehicles')
    .select('*');
  
  userAVehicles.data.forEach(v => {
    expect(v.subsidiary_id).toBe('sen'); // User A's subsidiary
  });
  
  // No vehicles from other subsidiaries
  const otherSubVehicles = userAVehicles.data
    .filter(v => v.subsidiary_id !== 'sen');
  expect(otherSubVehicles.length).toBe(0);
});
```

---

#### Issue #5: Legacy Auth Code (Dual Sources)

**Location:** `src/shared/services/authStore.ts` vs `src/shared/services/supabaseAuthService.ts`

**Problem:**
```
Two authentication systems running in parallel
├─ localStorage-based authStore (legacy)
├─ Supabase GoTrue (new)
├─ Possible sync issues
└─ Increased complexity
```

**Risk:**
- Sync failures between systems
- Security issues (localStorage < JWT)
- Confusion for developers

**Mitigation (1-2 weeks):**
```typescript
// Phase 1: Make Supabase the source of truth
// ✅ Already started in SUPABASE_AUTH_MIGRATION.md

// Phase 2: Remove authStore completely
// 1. Update all components to use useAuth() hook
// 2. Remove localStorage-based session persistence
// 3. Use Supabase session tokens only

// Phase 3: Clean up
rm src/shared/services/authStore.ts
rm localStorage: IVOS_USERS, IVOS_SESSIONS

// Result: Single source of truth = Supabase
```

---

### 3.3 🟠 MEDIUM (Significant but not Emergency)

#### Issue #6: Large Dataset Performance

**Location:** Fleet, Exploitation, Reporting pages

**Problem:**
```
Without pagination/virtualization:
├─ 1000 vehicles: ~3s load time
├─ 5000 operations: ~8s load time
├─ 10000 invoices: ~15s load time
└─ Memory usage: ~500 MB
```

**Risk:**
- Poor UX (slow page loads)
- Mobile crashes (out of memory)
- Database strain

**Mitigation (1 week):**
```typescript
// 1. Implement React Query pagination
const useVehicles = (pageSize = 20) => {
  const [page, setPage] = useState(0);
  
  return useQuery({
    queryKey: ['vehicles', page],
    queryFn: () =>
      api.getVehicles({
        offset: page * pageSize,
        limit: pageSize,
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// 2. Use react-window for virtual scrolling
import { FixedSizeList } from 'react-window';

const VehicleList = ({ vehicles }) => (
  <FixedSizeList
    height={600}
    itemCount={vehicles.length}
    itemSize={60}
  >
    {({ index, style }) => (
      <div style={style}>
        {vehicles[index].registration}
      </div>
    )}
  </FixedSizeList>
);

// 3. Add database indexes for filtering
CREATE INDEX idx_vehicles_subsidiary ON vehicles(subsidiary_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_missions_created_at ON missions(created_at DESC);
```

---

#### Issue #7: Bundle Size (Historically)

**Status:** ✅ FIXED

**Before:** 2.49 MB → Now: 500 KB (-70%)

**What was done:**
```
✅ React.lazy() for 30 pages
✅ Code-splitting into 40+ chunks
✅ Manual chunks for vendors
✅ Suspense fallback UI
✅ Service Worker caching
```

**Monitor going forward:**
```typescript
// GitHub Actions: Bundle size tracking
- name: Check bundle size
  run: |
    npm run build
    npx bundlesize  # Fail if > 600 KB
```

---

### 3.4 📊 Severity Matrix

```
                 Likelihood     │ Impact
           Low      Medium      High
        ───────────────────────────────
High   │   Medium    High      CRITICAL
Medium │   Low       Medium    High
Low    │   Low       Low       Medium

CRITICAL: Must fix before production
├─ RLS policy complexity (likelihood: Low, impact: High)
├─ Offline sync conflicts (likelihood: High, impact: High)
└─ Payment double-charge (likelihood: Low, impact: High)

HIGH: Should fix within 1 sprint
├─ Test coverage (likelihood: High, impact: High)
├─ Legacy auth code (likelihood: Medium, impact: High)
└─ Large dataset perf (likelihood: High, impact: Medium)
```

---

## 4. Dépendances Intra-Modules

### 4.1 Dependency Graph (Directed)

```
┌─────────────────────────────────────────────────────────┐
│                SHARED LAYER (Foundation)                │
│  ├─ AuthContext, SiteContext, ContextProvider           │
│  ├─ supabaseClient, supabaseAuthService                 │
│  ├─ 37 Services (budget, audit, backup, etc)            │
│  ├─ 25 Stores (countryStore, permissionStore, etc)      │
│  └─ UI Components (Button, Input, Modal, etc)           │
└──────────────┬──────────────────────────────────────────┘
               │ (All modules depend on)
       ┌───────┼───────┬─────────┬──────────┐
       │       │       │         │          │
       ▼       ▼       ▼         ▼          ▼
      FLEET  EXPLOIT PERSONNEL FINANCES REPORTING
       ├──────▶ ├──────▶ ├──────▶ ├──────▶ ├──────▶
       │        │        │        │        │
       │        │        │        │        │
       └────────┴────────┴────────┴────────┘
              │
              │ (Some bidirectional)
              │
          ┌───┴────┬────────┬──────────┐
          │        │        │          │
          ▼        ▼        ▼          ▼
       QHSE    TECHNIQUE  SETTINGS  CLIENTS
```

### 4.2 Critical Dependencies

**FLEET → EXPLOITATION:**
```
VehiclesPage
  ├─ vehicleService (CRUD)
  ├─ driverService (affectations)
  └─ Uses: geolocationService (tracking)

OperationService (EXPLOITATION)
  ├─ Depends on: vehiclesStore (vehicle_id)
  ├─ Depends on: driversStore (driver_id)
  └─ References: missions.vehicle_id → vehicles.id
```

**FINANCES ← FLEET:**
```
InvoiceService (FINANCES)
  ├─ Calculates: Fuel costs
  ├─ References: carburantStore → vehicles
  ├─ Uses: Maintenance costs from fleet
  └─ Payment workflows depend on: Invoice status

Payroll (FINANCES)
  ├─ Depends on: PERSONNEL employees
  ├─ Depends on: heuresStore (hours worked)
  └─ Uses: budgetService for cost tracking
```

**REPORTING ← ALL:**
```
DashboardPage
  ├─ Fleet metrics: vehiclesStore, driversStore
  ├─ Operations: operationService, bsdService
  ├─ Revenue: invoiceService, paymentService
  ├─ Personnel: heuresStore, congesStore
  ├─ Financials: payrollDraftService, budgetService
  └─ All filtered by: SiteContext.activeSite
```

### 4.3 Dependency Cycles (Avoid!)

**Current Issues:**
```
⚠️ POTENTIAL CYCLE 1:
vehicleService → offlineService → vehicleService
(Stores, syncs, then re-fetches)
MITIGATION: Use event-driven pattern

⚠️ POTENTIAL CYCLE 2:
paymentService → invoiceService → paymentService
(Payment updates invoice, invoice triggers payment check)
MITIGATION: One direction only (invoice → payment)

✅ NO MAJOR CYCLES DETECTED
But: Monitor new feature additions
```

---

## 5. Guide de Diagnostic & Troubleshooting

### 5.1 Diagnostic Flowchart

```
PROBLEM: Data looks wrong

  ├─ Is user logged in?
  │  ├─ NO: Check AuthContext, Supabase credentials
  │  └─ YES: Continue
  │
  ├─ Wrong data for another site?
  │  ├─ YES: Check SiteContext, RLS policies
  │  │        Run RLS test:
  │  │        SELECT * FROM vehicles
  │  │        WHERE subsidiary_id NOT IN (
  │  │          SELECT subsidiary_id FROM user_profiles
  │  │          WHERE user_id = auth.uid()
  │  │        )
  │  │        Should return 0 rows
  │  └─ NO: Continue
  │
  ├─ Data stale/not updating?
  │  ├─ Check offline state:
  │  │  offlineService.hasOfflineDrafts()
  │  │
  │  ├─ Check React Query cache:
  │  │  queryClient.getQueryData(['vehicles'])
  │  │
  │  ├─ Check localStorage sync:
  │  │  localStorage.getItem('ivos_vehicles')
  │  │
  │  └─ Clear cache + refresh:
  │     queryClient.invalidateQueries()
  │
  └─ Data loss?
     ├─ Check IndexedDB drafts:
     │  indexedDB.databases()
     │
     ├─ Check audit log:
     │  SELECT * FROM audit_logs
     │  WHERE entity_id = 'xxx'
     │  ORDER BY timestamp DESC
     │
     └─ Recover from backup:
        backupService.getLastBackup()
```

### 5.2 Common Issues & Solutions

| Issue | Diagnosis | Fix |
|-------|-----------|-----|
| **Data not loading** | Check network tab → 401 Unauthorized | Verify JWT token, re-login |
| **Wrong subsidiary** | Check SiteContext.activeSite | Verify user_profiles.subsidiary_id |
| **Offline drafts lost** | Check IndexedDB → empty | Service Worker registered? |
| **RLS permission error** | Check error message → "permission denied" | Verify RLS policy for role |
| **Slow queries** | Check query time → > 1s | Add database indexes |
| **Double-charging** | Check payments table → duplicate | Use idempotency keys going forward |
| **Signature invalid** | Check signature_logs → tampered | Verify hash in audit table |

### 5.3 Debug Commands (Console)

```javascript
// Check auth state
useAuth() // Hook call in component console

// Check site context
useSiteContext() // Active site, currency, etc

// Check stores
countryStore.getCountries()
permissionStore.isSuperAdmin(userId)
vehiclesStore.getVehicles()

// Check React Query
queryClient.getQueryState(['vehicles'])
queryClient.getQueryCache().getAll()

// Check offline
offlineService.getPendingActions()
offlineService.getBSDDraft('operation-123')

// Check localStorage
localStorage.getItem('ivos_countries')
localStorage.getItem('ivos_vehicles')

// Clear all (careful!)
localStorage.clear()
indexedDB.deleteDatabase('ivos-drafts')
queryClient.clear()
```

---

## 6. Priorisation des Optimisations

### 6.1 Matrice Effort × Impact

```
        High Impact ▲
               │
       QUICK WINS│  BIG BETS
         (1 week)│  (1 month+)
                │
    ┌───────────┼───────────┐
    │     │           │      │
    │  1  │     4     │  2   │
    │  3  │           │      │
    ├─────┼───────────┼──────┼─────► Low Impact
    │  6  │     5     │  7   │
    │     │           │      │
    │  8  │     9     │  10  │
    └─────┴───────────┴──────┘
       Low Effort      High Effort

LEGEND:
1 = Error Boundaries (1 day, big impact)
2 = RLS comprehensive testing (3 days, critical)
3 = Image lazy loading (2 days, perf)
4 = Offline sync conflict resolution (1 week, critical)
5 = Bundle analysis & optimization (1 week, perf)
6 = ESLint strict rules (1 day, quality)
7 = Real-time subscriptions (2 weeks, perf)
8 = TypeScript strict migration (3 days, quality)
9 = GraphQL gateway (3 weeks, complexity)
10 = Mobile app (React Native) (8 weeks, feature)
```

### 6.2 Roadmap 3 Mois

**MONTH 1: Stability & Security**
```
Week 1:
├─ [ ] Add Error Boundaries (1 day)
├─ [ ] RLS comprehensive testing (3 days)
└─ [ ] Fix highest-priority bugs

Week 2:
├─ [ ] Complete Supabase Auth migration (3 days)
├─ [ ] Implement offline sync merge strategy (2 days)
└─ [ ] Payment idempotency keys (1 day)

Week 3-4:
├─ [ ] Performance optimization (pagination, virtualization)
├─ [ ] Increase test coverage to 70%
└─ [ ] Documentation update
```

**MONTH 2: Architecture**
```
Week 5-6:
├─ [ ] Merge ContextProvider with SiteContext
├─ [ ] Extract feature stores to Zustand
└─ [ ] Create bounded contexts (DDD)

Week 7-8:
├─ [ ] Dependency injection pattern
├─ [ ] Service layer abstraction
└─ [ ] Database query optimization
```

**MONTH 3: Features**
```
Week 9-10:
├─ [ ] Real-time subscriptions (WebSocket)
├─ [ ] Caching layer (Redis)
└─ [ ] Analytics improvements

Week 11-12:
├─ [ ] Mobile app prototype (React Native)
├─ [ ] API for partners (REST/GraphQL)
└─ [ ] Security audit
```

---

## 📌 Summary Checklist

```
CRITICAL (This week)
├─ [ ] RLS policy testing (all roles × all tables)
├─ [ ] Offline sync conflict resolution
├─ [ ] Payment idempotency implementation
└─ [ ] Error Boundary components

HIGH (This month)
├─ [ ] Test coverage → 70%
├─ [ ] Supabase Auth migration (complete)
├─ [ ] Performance: pagination + lazy loading
├─ [ ] Bundle size monitoring
└─ [ ] Documentation (auto-gen framework)

MEDIUM (This quarter)
├─ [ ] Real-time subscriptions
├─ [ ] Caching layer (Redis)
├─ [ ] Bounded contexts (DDD)
└─ [ ] Database optimization

NICE-TO-HAVE
├─ [ ] Mobile app (React Native)
├─ [ ] Partner API (REST/GraphQL)
├─ [ ] ML recommendations
└─ [ ] Advanced analytics
```

---

**End of Document**

Generated: 29 avril 2026
