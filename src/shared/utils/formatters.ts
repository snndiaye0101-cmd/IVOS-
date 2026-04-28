// ============================================
// Utilitaires de formatage
// ============================================

import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

// Formatage de dates
export const formatDate = (date: string | Date, pattern = 'dd/MM/yyyy'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, pattern, { locale: fr })
}

export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, 'dd/MM/yyyy HH:mm')
}

export const formatTime = (date: string | Date): string => {
  return formatDate(date, 'HH:mm')
}

// Formatage de nombres
export const formatNumber = (value: number, decimals = 0): string => {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export const formatCurrency = (value: number, currency = 'XOF'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(value)
}

export const formatWeight = (kg: number): string => {
  if (kg >= 1000) {
    return `${formatNumber(kg / 1000, 2)} t`
  }
  return `${formatNumber(kg, 2)} kg`
}

export const formatVolume = (m3: number): string => {
  return `${formatNumber(m3, 2)} m³`
}

export const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${formatNumber(km * 1000, 0)} m`
  }
  return `${formatNumber(km, 2)} km`
}

// Formatage de texte
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export const capitalize = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

export const upperCase = (text: string): string => {
  return text.toUpperCase()
}

// Formatage de numéros de téléphone
export const formatPhone = (phone: string): string => {
  // Format: +221 XX XXX XX XX
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 9) {
    return `+221 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7)}`
  }
  return phone
}

// Formatage de pourcentages
export const formatPercentage = (value: number, decimals = 1): string => {
  return `${formatNumber(value, decimals)}%`
}

// Génération d'initiales
export const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}
