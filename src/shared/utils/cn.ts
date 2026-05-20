// ============================================
// Utilitaire pour fusionner des classes Tailwind
// Utilisé par Shadcn/UI
// ============================================

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
