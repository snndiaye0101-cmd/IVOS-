// ═══════════════════════════════════════════════════════════════
// REUSABLE COMPONENTS FOR ADMIN SYSTEM
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import type { User } from '../../../shared/services/authStore';
import { getAvatarColor } from './adminConstants';
import { Wifi, WifiOff } from 'lucide-react';

// ──────────────────────────────────────────────────────────────
// AVATAR COMPONENT
// ──────────────────────────────────────────────────────────────
interface AvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg';
  online?: boolean;
  showStatus?: boolean;
}

export function Avatar({ user, size = 'md', online, showStatus = true }: AvatarProps) {
  const sizeClasses = { sm: 'w-9 h-9 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-12 h-12 text-sm' };
  const dotClasses = { sm: 'w-2.5 h-2.5', md: 'w-3 h-3', lg: 'w-3.5 h-3.5' };
  const initials = user.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const gradient = getAvatarColor(user.fullName);

  return (
    <div className="relative inline-block">
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white shadow-sm`}
      >
        {initials}
      </div>
      {showStatus && online !== undefined && (
        <div
          className={`absolute bottom-0 right-0 ${dotClasses[size]} rounded-full ${online ? 'bg-green-500' : 'bg-gray-400'} border-2 border-white`}
        ></div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// STATUS BADGE COMPONENT
// ──────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  type:
    | 'online'
    | 'offline'
    | 'approved'
    | 'pending'
    | 'rejected'
    | 'info'
    | 'medium'
    | 'high'
    | 'critical'
    | 'low';
  label: string;
  size?: 'sm' | 'md' | 'lg';
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
};

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
};

export function StatusBadge({ type, label, size = 'md' }: StatusBadgeProps) {
  return (
    <span
      className={`${STATUS_STYLES[type] || STATUS_STYLES.info} ${SIZE_CLASSES[size]} inline-block rounded-full font-semibold`}
    >
      {label}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────
// STAT CARD COMPONENT
// ──────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext: string;
  color: 'blue' | 'green' | 'emerald' | 'violet' | 'red';
}

const COLOR_STYLES = {
  blue: 'bg-blue-50',
  green: 'bg-green-50',
  emerald: 'bg-emerald-50',
  violet: 'bg-violet-50',
  red: 'bg-red-50',
};

const COLOR_ICON = {
  blue: 'text-blue-500',
  green: 'text-green-500',
  emerald: 'text-emerald-500',
  violet: 'text-violet-500',
  red: 'text-red-500',
};

export function StatCard({ icon, label, value, subtext, color }: StatCardProps) {
  return (
    <div className="ivos-kpi">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
        <div
          className={`h-8 w-8 rounded-xl ${COLOR_STYLES[color]} flex items-center justify-center`}
        >
          <div className={COLOR_ICON[color]}>{icon}</div>
        </div>
        {label}
      </div>
      <p className="text-3xl font-extrabold text-gray-900">{value}</p>
      <p className="mt-1.5 text-xs font-medium text-gray-400">{subtext}</p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// ACTION BUTTON COMPONENT
// ──────────────────────────────────────────────────────────────
interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

const VARIANT_STYLES = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
};

export function ActionButton({
  icon,
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-all ${VARIANT_STYLES[variant]} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      {loading ? '⟳' : icon}
      {label}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────
// SEARCH & FILTER COMPONENT
// ──────────────────────────────────────────────────────────────
import { Search, Filter } from 'lucide-react';

interface SearchFilterProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  filters?: Array<{
    label: string;
    value: string;
    options: Array<{ label: string; value: string }>;
  }>;
  onFilterChange?: (filterName: string, value: string) => void;
}

export function SearchFilter({
  searchValue,
  onSearchChange,
  placeholder = 'Rechercher...',
  filters = [],
  onFilterChange,
}: SearchFilterProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* Search Input */}
      <div className="relative min-w-[200px] flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filter Selects */}
      {filters.map((filter) => (
        <select
          key={filter.value}
          onChange={(e) => onFilterChange?.(filter.value, e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// USER ROW COMPONENT
// ──────────────────────────────────────────────────────────────
interface UserRowProps {
  user: User;
  onlineUserIds: string[];
  actions: Array<{ label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }>;
  secondaryInfo?: React.ReactNode;
}

export function UserRow({ user, onlineUserIds, actions, secondaryInfo }: UserRowProps) {
  const isOnline = onlineUserIds.includes(user.id);
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-300 hover:bg-blue-50/30">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Avatar user={user} online={isOnline} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">{user.fullName}</p>
          <p className="truncate text-sm text-gray-500">{user.email}</p>
          {secondaryInfo}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            title={action.label}
            className={`rounded-lg p-2 transition-colors ${action.danger ? 'text-red-600 hover:bg-red-100' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {action.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
