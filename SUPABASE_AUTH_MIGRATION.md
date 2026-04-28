# IVOS 61.1 - Supabase Auth Migration Guide

## Overview

The authentication system has been migrated from insecure localStorage-based auth to **Supabase Auth** with server-side password hashing and Row-Level Security (RLS) integration.

**Benefits:**
- ✅ Server-side password hashing (bcrypt)
- ✅ Session management with Supabase
- ✅ RLS (Row-Level Security) enforcement
- ✅ Audit trail for all auth events
- ✅ Password reset via email
- ✅ Multi-device session support

---

## New Services & Hooks

### 1. `supabaseAuthService.ts`
Core authentication service using Supabase Auth.

**Functions:**
```typescript
// Sign up
signUp(email, password, fullName, subsidiaryId): Promise<AuthResponse>

// Sign in
signIn(email, password): Promise<AuthResponse<{ user, session }>>

// Sign out
signOut(): Promise<AuthResponse>

// Password reset
resetPassword(email): Promise<AuthResponse>

// Get current user
getCurrentUser(): Promise<AuthUser | null>

// Listen for changes
onAuthStateChange(callback): () => void
```

### 2. `useAuth()` Hook
React hook for easy auth state management.

**Example:**
```typescript
import { useAuth } from '@/shared/hooks/useAuth'

function MyComponent() {
  const { user, isLoading, isAuthenticated, signIn, signOut, error } = useAuth()

  const handleLogin = async () => {
    const result = await signIn('user@example.com', 'password123')
    if (result.success) {
      // Redirect to dashboard
    }
  }

  if (isLoading) return <Loading />
  if (!isAuthenticated) return <LoginForm />

  return <Dashboard />
}
```

### 3. `ProtectedRoute` Component
Protect pages with authentication and role-based access.

**Example:**
```typescript
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'

<ProtectedRoute requiredRole="country_manager">
  <AdminPanel />
</ProtectedRoute>
```

---

## Migration Steps for Developers

### Step 1: Update Login Page
**Before (Legacy):**
```typescript
const result = authStore.login(email, password)
```

**After (Supabase):**
```typescript
import { useAuth } from '@/shared/hooks/useAuth'

export function LoginPage() {
  const { signIn } = useAuth()

  const handleSubmit = async (email: string, password: string) => {
    const result = await signIn(email, password)
    if (result.success) {
      navigate('/dashboard')
    } else {
      toast.error(result.error)
    }
  }

  return <LoginForm onSubmit={handleSubmit} />
}
```

### Step 2: Update Protected Pages
**Before (Legacy):**
```typescript
if (!authStore.isLoggedIn()) {
  return <Navigate to="/login" />
}
```

**After (Supabase):**
```typescript
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
```

### Step 3: Update User Profile Components
**Before (Legacy):**
```typescript
const user = authStore.currentUser()
```

**After (Supabase):**
```typescript
import { useAuth } from '@/shared/hooks/useAuth'

export function UserProfile() {
  const { user } = useAuth()

  return (
    <div>
      <h1>{user?.fullName}</h1>
      <p>{user?.email}</p>
      <p>Role: {user?.role}</p>
    </div>
  )
}
```

### Step 4: Role-Based Access Control
**Example:**
```typescript
<ProtectedRoute requiredRole={['country_manager', 'super_admin']}>
  <AdminSettings />
</ProtectedRoute>
```

---

## Database Schema Requirements

The `app_users` table must be created with RLS policies:

```sql
CREATE TABLE public.app_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client',
  status TEXT NOT NULL DEFAULT 'pending',
  subsidiary_id UUID NOT NULL REFERENCES public.subsidiaries(id),
  site_access_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  system_access_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.app_users
  FOR SELECT USING (auth.uid() = id);

-- Admins can view all users in their subsidiary
CREATE POLICY "Admins view subsidiary users" ON public.app_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'country_manager')
      AND subsidiary_id = public.app_users.subsidiary_id
    )
  );
```

### Authentication Events Table (Audit Trail)
```sql
CREATE TABLE public.auth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- No RLS needed - admin only view
```

---

## Environment Variables

Ensure `.env` contains Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Deprecation Timeline

### Phase 1: Current (v61.1)
- ✅ New Supabase Auth service available
- ✅ Legacy `authStore` still works
- 🔄 Migrate login/signup pages first
- 🔄 Update protected routes

### Phase 2: v61.2 (Next Sprint)
- ⚠️ Deprecate legacy `authStore`
- 🔄 Migrate all components to `useAuth()`
- 🔄 Remove localStorage auth code

### Phase 3: v62.0
- ❌ Remove `authStore.ts`
- ❌ Remove localStorage auth
- 🔐 Full Supabase Auth only

---

## Testing

### Unit Tests
```typescript
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '@/shared/hooks/useAuth'

describe('useAuth', () => {
  it('should load current user on mount', async () => {
    const { result } = renderHook(() => useAuth())
    
    expect(result.current.isLoading).toBe(true)
    
    await act(async () => {
      // Wait for hook to initialize
      await new Promise(resolve => setTimeout(resolve, 100))
    })
    
    expect(result.current.isLoading).toBe(false)
  })
})
```

### E2E Tests
```typescript
describe('Authentication Flow', () => {
  it('should sign up and log in successfully', () => {
    cy.visit('/auth/signup')
    cy.get('input[name="email"]').type('test@example.com')
    cy.get('input[name="password"]').type('password123')
    cy.get('input[name="fullName"]').type('Test User')
    cy.get('button[type="submit"]').click()
    
    cy.get('[role="alert"]').should('contain', 'Check your email')
    
    // Verify email and sign in...
    cy.visit('/auth/login')
    cy.get('input[name="email"]').type('test@example.com')
    cy.get('input[name="password"]').type('password123')
    cy.get('button[type="submit"]').click()
    
    cy.location('pathname').should('eq', '/dashboard')
  })
})
```

---

## Troubleshooting

### "Invalid login credentials"
- Check Supabase URL and key are correct
- Verify user exists in `auth.users`
- Check user is approved (status = 'approved')

### "User not found in profile"
- Ensure user profile was created in `app_users` table
- Check RLS policies aren't blocking access
- Verify subsidiary_id is correct

### "RLS policy violation"
- Check user has permission to access subsidiary
- Verify auth.uid() is correctly set in policies
- Check role is appropriate for the query

### Password Reset Not Working
- Verify email configuration in Supabase
- Check redirect URL is correct
- Ensure SMTP settings are configured

---

## Security Best Practices

1. ✅ **Never store passwords in localStorage**
2. ✅ **Always use HTTPS in production**
3. ✅ **Enable RLS on all user tables**
4. ✅ **Validate inputs server-side**
5. ✅ **Log auth events for audit trail**
6. ✅ **Rotate keys regularly**
7. ✅ **Use strong password policies**
8. ✅ **Enable MFA for admin accounts**

---

## FAQ

**Q: Can users authenticate with Google/GitHub?**
A: Yes! Supabase supports OAuth. Update `signInWithOAuth()` in supabaseAuthService.ts

**Q: What about offline support?**
A: Session persists in localStorage (secure). Implement service worker for offline API calls.

**Q: How do I implement SSO?**
A: Supabase supports SAML. See Supabase docs for enterprise setup.

**Q: Is this GDPR compliant?**
A: Yes. User data is encrypted at rest. Implement deletion/export endpoints using Supabase admin API.

---

## Related Documentation

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [React Authentication](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Security Best Practices](https://supabase.com/docs/guides/security)

---

**Last Updated:** April 28, 2026  
**Status:** In Progress (Phase 1 - Foundation)  
**Maintainer:** IVOS Dev Team
