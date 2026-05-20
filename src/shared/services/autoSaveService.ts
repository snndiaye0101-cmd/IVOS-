/**
 * Service de Synchronisation Temps Réel
 * Auto-save avec indicateur visuel + WebSockets/Supabase Realtime
 */

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AutoSaveState {
  status: SyncStatus;
  lastSaved?: string;
  error?: string;
}

const DEBOUNCE_DELAY = 1500; // 1.5s après la dernière modification

class AutoSaveService {
  private saveTimers: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Map<string, (state: AutoSaveState) => void> = new Map();

  /**
   * Enregistre un callback pour suivre l'état de sauvegarde
   */
  subscribe(key: string, callback: (state: AutoSaveState) => void): () => void {
    this.listeners.set(key, callback);
    return () => this.listeners.delete(key);
  }

  /**
   * Notifie les listeners
   */
  private notify(key: string, state: AutoSaveState): void {
    this.listeners.get(key)?.(state);

    // Event global pour composants externes
    window.dispatchEvent(
      new CustomEvent('ivos_autosave_status', {
        detail: { key, state },
      })
    );
  }

  /**
   * Auto-save avec debounce
   */
  autoSave(
    key: string,
    data: any,
    saveFn: (data: any) => Promise<void> | void,
    options: { debounce?: number } = {}
  ): void {
    const delay = options.debounce ?? DEBOUNCE_DELAY;

    // Annuler le timer précédent
    if (this.saveTimers.has(key)) {
      clearTimeout(this.saveTimers.get(key)!);
    }

    // Indiquer qu'on attend pour sauvegarder
    this.notify(key, { status: 'idle' });

    // Nouveau timer
    const timer = setTimeout(async () => {
      try {
        this.notify(key, { status: 'saving' });

        await saveFn(data);

        this.notify(key, {
          status: 'saved',
          lastSaved: new Date().toISOString(),
        });

        // Retour à idle après 2s
        setTimeout(() => {
          this.notify(key, { status: 'idle' });
        }, 2000);
      } catch (error) {
        this.notify(key, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Erreur de sauvegarde',
        });
      } finally {
        this.saveTimers.delete(key);
      }
    }, delay);

    this.saveTimers.set(key, timer);
  }

  /**
   * Sauvegarde immédiate (force save)
   */
  async forceSave(
    key: string,
    data: any,
    saveFn: (data: any) => Promise<void> | void
  ): Promise<void> {
    // Annuler le timer de debounce
    if (this.saveTimers.has(key)) {
      clearTimeout(this.saveTimers.get(key)!);
      this.saveTimers.delete(key);
    }

    try {
      this.notify(key, { status: 'saving' });
      await saveFn(data);
      this.notify(key, {
        status: 'saved',
        lastSaved: new Date().toISOString(),
      });

      setTimeout(() => {
        this.notify(key, { status: 'idle' });
      }, 2000);
    } catch (error) {
      this.notify(key, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Erreur de sauvegarde',
      });
      throw error;
    }
  }

  /**
   * Annule toutes les sauvegardes en attente
   */
  cancelAll(): void {
    this.saveTimers.forEach((timer) => clearTimeout(timer));
    this.saveTimers.clear();
  }
}

export const autoSaveService = new AutoSaveService();

/**
 * Hook React pour auto-save
 */
export function useAutoSave<T>(
  key: string,
  data: T,
  saveFn: (data: T) => Promise<void> | void,
  options: { enabled?: boolean; debounce?: number } = {}
): AutoSaveState {
  const [state, setState] = React.useState<AutoSaveState>({ status: 'idle' });

  React.useEffect(() => {
    if (!options.enabled) return;

    const unsubscribe = autoSaveService.subscribe(key, setState);
    return unsubscribe;
  }, [key, options.enabled]);

  React.useEffect(() => {
    if (!options.enabled) return;

    autoSaveService.autoSave(key, data, saveFn, { debounce: options.debounce });
  }, [key, data, saveFn, options.enabled, options.debounce]);

  return state;
}

// Import React pour le hook
import React from 'react';
