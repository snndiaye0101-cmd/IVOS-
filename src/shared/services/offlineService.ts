/**
 * Service de Gestion Hors-Ligne (Offline)
 * Utilise IndexedDB pour stocker les données terrain
 * Synchronisation automatique au retour du réseau
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineDataSchema extends DBSchema {
  'bsd-drafts': {
    key: string;
    value: {
      id: string;
      operationId: string;
      data: any;
      createdAt: string;
      updatedAt: string;
      synced: boolean;
    };
  };
  'pending-actions': {
    key: string;
    value: {
      id: string;
      action: 'create' | 'update' | 'delete';
      entity: 'bsd' | 'operation' | 'invoice';
      data: any;
      timestamp: string;
      synced: boolean;
    };
  };
}

class OfflineService {
  private db: IDBPDatabase<OfflineDataSchema> | null = null;
  private syncInProgress = false;

  /**
   * Initialise la base de données IndexedDB
   */
  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<OfflineDataSchema>('ivos-offline-db', 1, {
      upgrade(db) {
        // Store pour les brouillons BSD
        if (!db.objectStoreNames.contains('bsd-drafts')) {
          db.createObjectStore('bsd-drafts', { keyPath: 'id' });
        }

        // Store pour les actions en attente
        if (!db.objectStoreNames.contains('pending-actions')) {
          const store = db.createObjectStore('pending-actions', { keyPath: 'id' });
          // @ts-ignore - IndexedDB type issue with createIndex
          store.createIndex('synced', 'synced', { unique: false });
        }
      },
    });

    // Écouter le retour en ligne
    window.addEventListener('online', () => this.syncAll());
  }

  /**
   * Sauvegarde un brouillon BSD hors-ligne
   */
  async saveBSDDraft(operationId: string, data: any): Promise<void> {
    await this.init();
    if (!this.db) return;

    const draft = {
      id: `draft-${operationId}`,
      operationId,
      data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false,
    };

    await this.db.put('bsd-drafts', draft);
  }

  /**
   * Récupère un brouillon BSD
   */
  async getBSDDraft(operationId: string): Promise<any | null> {
    await this.init();
    if (!this.db) return null;

    const draft = await this.db.get('bsd-drafts', `draft-${operationId}`);
    return draft?.data || null;
  }

  /**
   * Enregistre une action en attente de synchronisation
   */
  async addPendingAction(
    action: 'create' | 'update' | 'delete',
    entity: 'bsd' | 'operation' | 'invoice',
    data: any
  ): Promise<void> {
    await this.init();
    if (!this.db) return;

    const pendingAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      action,
      entity,
      data,
      timestamp: new Date().toISOString(),
      synced: false,
    };

    await this.db.add('pending-actions', pendingAction);

    // Tenter une sync immédiate si en ligne
    if (navigator.onLine) {
      this.syncAll();
    }
  }

  /**
   * Synchronise toutes les données en attente
   */
  async syncAll(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) return;

    await this.init();
    if (!this.db) return;

    this.syncInProgress = true;

    try {
      // Récupérer toutes les actions non synchronisées
      const pendingActions = await this.db.getAllFromIndex(
        'pending-actions',
        // @ts-ignore - IndexedDB type issue with index parameter
        'synced',
        IDBKeyRange.only(false)
      );

      for (const action of pendingActions) {
        try {
          // Exécuter l'action (appel API ou localStorage selon le contexte)
          await this.executeAction(action);

          // Marquer comme synchronisé
          action.synced = true;
          // @ts-ignore - IndexedDB type issue with put
          await this.db.put('pending-actions', action);

        } catch (error) {
          console.error('Erreur sync action:', action.id, error);
          // On continue avec les autres actions
        }
      }

      // Nettoyer les actions synchronisées anciennes (> 7 jours)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const oldActions = await this.db.getAllFromIndex(
        'pending-actions',
        // @ts-ignore - IndexedDB type issue with index parameter
        'synced',
        IDBKeyRange.only(true)
      );

      for (const action of oldActions) {
        if (new Date(action.timestamp) < weekAgo) {
          await this.db.delete('pending-actions', action.id);
        }
      }

      // Événement de synchronisation réussie
      window.dispatchEvent(new CustomEvent('ivos_sync_complete', {
        detail: { syncedCount: pendingActions.length }
      }));

    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Exécute une action (mock pour l'instant, à adapter selon votre API)
   */
  private async executeAction(action: any): Promise<void> {
    // Selon le type d'entité et d'action, appeler l'API appropriée
    // Pour l'instant, on simule avec localStorage

    switch (action.entity) {
      case 'bsd':
        if (action.action === 'update') {
          // Sauvegarder dans localStorage (ou API)
          const operations = JSON.parse(localStorage.getItem('ivos_operations_v1') || '[]');
          const index = operations.findIndex((op: any) => op.id === action.data.operationId);
          if (index >= 0) {
            operations[index].bsdData = { ...operations[index].bsdData, ...action.data.bsdData };
            localStorage.setItem('ivos_operations_v1', JSON.stringify(operations));
          }
        }
        break;

      case 'operation':
        // Similaire pour les opérations
        break;

      case 'invoice':
        // Similaire pour les factures
        break;
    }
  }

  /**
   * Compte le nombre d'actions en attente
   */
  async getPendingCount(): Promise<number> {
    await this.init();
    if (!this.db) return 0;

    const pending = await this.db.getAllFromIndex(
      'pending-actions',
      // @ts-ignore - IndexedDB type issue with index parameter
      'synced',
      IDBKeyRange.only(false)
    );

    return pending.length;
  }

  /**
   * Vérifie si en mode hors-ligne
   */
  isOffline(): boolean {
    return !navigator.onLine;
  }
}

export const offlineService = new OfflineService();

// Initialiser au chargement
if (typeof window !== 'undefined') {
  offlineService.init();
}
