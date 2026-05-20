/**
 * AutoSaveIndicator
 * Indicateur visuel d'auto-sauvegarde en haut à droite
 */

import React from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { SyncStatus } from '@/shared/services/autoSaveService';

interface AutoSaveIndicatorProps {
  status: SyncStatus;
  lastSaved?: string;
  error?: string;
}

export default function AutoSaveIndicator({ status, lastSaved, error }: AutoSaveIndicatorProps) {
  if (status === 'idle' && !lastSaved) return null;

  const formatLastSaved = (isoDate: string): string => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 10) return "À l'instant";
    if (diffSec < 60) return `Il y a ${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Il y a ${diffMin}min`;
    const diffHour = Math.floor(diffMin / 60);
    return `Il y a ${diffHour}h`;
  };

  return (
    <>
      <div
        className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-xl border px-4 py-2 shadow-lg backdrop-blur-sm transition-all duration-300"
        style={{
          background:
            status === 'error'
              ? '#fee2e2'
              : status === 'saving'
                ? '#fef3c7'
                : status === 'saved'
                  ? '#d1fae5'
                  : '#f3f4f6',
          borderColor:
            status === 'error'
              ? '#fca5a5'
              : status === 'saving'
                ? '#fcd34d'
                : status === 'saved'
                  ? '#6ee7b7'
                  : '#d1d5db',
        }}
      >
        {status === 'saving' && (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
            <span className="text-xs font-semibold text-yellow-800">
              Enregistrement en cours...
            </span>
          </>
        )}

        {status === 'saved' && (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-xs font-semibold text-green-800">Modifications enregistrées</span>
            {lastSaved && (
              <span className="ml-1 text-[10px] text-green-600">
                ({formatLastSaved(lastSaved)})
              </span>
            )}
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="h-4 w-4 text-red-600" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-red-800">Erreur de sauvegarde</span>
              {error && <span className="text-[10px] text-red-600">{error}</span>}
            </div>
          </>
        )}
      </div>
    </>
  );
}
