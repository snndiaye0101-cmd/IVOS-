// ═══════════════════════════════════════════════════════════════
// ADMIN ICONS HELPER
// ═══════════════════════════════════════════════════════════════

import {
  BarChart3, Truck, Activity, CreditCard, Wrench, Users, Settings, MessageSquare, FileText,
} from 'lucide-react'
import type { AppModule } from '../../../shared/services/permissionStore'

export const MODULE_ICONS: Record<AppModule, React.ComponentType<{ className?: string }>> = {
  dashboard: BarChart3,
  fleet: Truck,
  exploitation: Activity,
  finances: CreditCard,
  technique: Wrench,
  rh: Users,
  parametres: Settings,
  chat: MessageSquare,
  hub_carburant: FileText,
}

export function getTabIcon(iconName: keyof typeof MODULE_ICONS, className = 'w-4 h-4') {
  const Icon = MODULE_ICONS[iconName as AppModule]
  return Icon ? <Icon className={className} /> : null
}
