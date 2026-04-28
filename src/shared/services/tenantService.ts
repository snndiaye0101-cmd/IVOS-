// src/shared/services/tenantService.ts
export type Tenant = {
  id: string
  name: string
  contactEmail: string
  subscriptionStatus: 'active' | 'trial' | 'suspended'
}

export function createTenant(tenant: Tenant) {
  // TODO: Créer un nouveau tenant (multi-entreprise)
  console.log('[SaaS] Création tenant', tenant)
}

export function updateTenant(tenant: Tenant) {
  // TODO: Mettre à jour les infos du tenant
  console.log('[SaaS] Update tenant', tenant)
}

export function suspendTenant(tenantId: string) {
  // TODO: Suspendre l’accès d’un tenant
  console.log('[SaaS] Suspend tenant', tenantId)
}
