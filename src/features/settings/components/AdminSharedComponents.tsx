// ═══════════════════════════════════════════════════════════════
// REUSABLE COMPONENTS FOR ADMIN SYSTEM
// ═══════════════════════════════════════════════════════════════

import React from 'react'
import type { User } from '../../../shared/services/authStore'
import { getAvatarColor } from './adminConstants'
import { Wifi, WifiOff } from 'lucide-react'

// ──────────────────────────────────────────────────────────────
// AVATAR COMPONENT
// ──────────────────────────────────────────────────────────────
interface AvatarProps {
  user: User
  size?: 'sm' | 'md' | 'lg'
  online?: boolean
  showStatus?: boolean
}

export function Avatar({ user, size = 'md', online, showStatus = true }: AvatarProps) {
  const sizeClasses = { sm: 'w-9 h-9 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-12 h-12 text-sm' }
  const dotClasses = { sm: 'w-2.5 h-2.5', md: 'w-3 h-3', lg: 'w-3.5 h-3.5' }
  const initials = user.fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const gradient = getAvatarColor(user.fullName)

  return (
    <div className="relative inline-block">
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold shadow-sm`}>
        {initials}
      </div>
      {showStatus && online !== undefined && (
        <div className={`absolute bottom-0 right-0 ${dotClasses[size]} rounded-full ${online ? 'bg-green-500' : 'bg-gray-400'} border-2 border-white`}></div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// STATUS BADGE COMPONENT
// ──────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  type: 'online' | 'offline' | 'approved' | 'pending' | 'rejected' | 'info' | 'medium' | 'high' | 'critical' | 'low'
  label: string
  size?: 'sm' | 'md' | 'lg'
}

const STATUS_STYLES: Record<string, string> = {
  online: 'bg-green-100 text-green-700',
  offline: 'bg-gray-100 text-gray-700',
  approved: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-700',
  info: 'bg-gray-100 text-gray-700',
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
}

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
}

export function StatusBadge({ type, label, size = 'md' }: StatusBadgeProps) {
  return (
    <span className={`${STATUS_STYLES[type] || STATUS_STYLES.info} ${SIZE_CLASSES[size]} rounded-full font-semibold inline-block`}>
      {label}
    </span>
  )
}

// ──────────────────────────────────────────────────────────────
// STAT CARD COMPONENT
// ──────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  subtext: string
  color: 'blue' | 'green' | 'emerald' | 'violet' | 'red'
}

const COLOR_STYLES = {
  blue: 'bg-blue-50',
  green: 'bg-green-50',
  emerald: 'bg-emerald-50',
  violet: 'bg-violet-50',
  red: 'bg-red-50',
}

const COLOR_ICON = {
  blue: 'text-blue-500',
  green: 'text-green-500',
  emerald: 'text-emerald-500',
  violet: 'text-violet-500',
  red: 'text-red-500',
}

export function StatCard({ icon, label, value, subtext, color }: StatCardProps) {
  return (
    <div className="ivos-kpi">
      <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
        <div className={`w-8 h-8 rounded-xl ${COLOR_STYLES[color]} flex items-center justify-center`}>
          <div className={COLOR_ICON[color]}>{icon}</div>
        </div>
        {label}
      </div>
      <p className="text-3xl font-extrabold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1.5 font-medium">{subtext}</p>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// ACTION BUTTON COMPONENT
// ──────────────────────────────────────────────────────────────
interface ActionButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  loading?: boolean
}

const VARIANT_STYLES = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
}

export function ActionButton({ icon, label, onClick, variant = 'primary', disabled = false, loading = false }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${VARIANT_STYLES[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? '⟳' : icon}
      {label}
    </button>
  )
}

// ──────────────────────────────────────────────────────────────
// SEARCH & FILTER COMPONENT
// ──────────────────────────────────────────────────────────────
import { Search, Filter } from 'lucide-react'

interface SearchFilterProps {
  searchValue: string
  onSearchChange: (value: string) => void
  placeholder?: string
  filters?: Array<{ label: string; value: string; options: Array<{ label: string; value: string }> }>
  onFilterChange?: (filterName: string, value: string) => void
}

export function SearchFilter({ searchValue, onSearchChange, placeholder = 'Rechercher...', filters = [], onFilterChange }: SearchFilterProps) {
  return (
    <div className="flex gap-3 flex-wrap">
      {/* Search Input */}
      <div className="flex-1 min-w-[200px] relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filter Selects */}
      {filters.map(filter => (
        <select
          key={filter.value}
          onChange={e => onFilterChange?.(filter.value, e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {filter.options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// USER ROW COMPONENT
// ──────────────────────────────────────────────────────────────
interface UserRowProps {
  user: User
  onlineUserIds: string[]
  actions: Array<{ label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }>
  secondaryInfo?: React.ReactNode
}

export function UserRow({ user, onlineUserIds, actions, secondaryInfo }: UserRowProps) {
  const isOnline = onlineUserIds.includes(user.id)
  return (
    <div className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Avatar user={user} online={isOnline} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{user.fullName}</p>
          <p className="text-sm text-gray-500 truncate">{user.email}</p>
          {secondaryInfo}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            title={action.label}
            className={`p-2 rounded-lg transition-colors ${action.danger ? 'hover:bg-red-100 text-red-600' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            {action.icon}
          </button>
        ))}
      </div>
    </div>
  )
}
