/**
 * Service de gestion des operations (CRUD local, workflow, affectations)
 * Toutes les méthodes utilisent un tableau local comme backend.
 * Sécurisation : à implémenter si besoin.
 */

export type Operation = {
  id: string;
  name: string;
  status?: string;
  // autres champs nécessaires
};

const operations: Operation[] = [];

export class OperationService {
  createOperation(operation: Omit<Operation, 'id'>): Operation {
    const newOperation = { ...operation, id: Date.now().toString() } as Operation;
    operations.push(newOperation);
    return newOperation;
  }

  getOperation(id: string): Operation | null {
    return operations.find(m => m.id === id) || null;
  }

  getOperations(): Operation[] {
    return operations;
  }

  updateOperation(id: string, operation: Partial<Operation>): Operation | null {
    const idx = operations.findIndex(m => m.id === id);
    if (idx === -1) return null;
    operations[idx] = { ...operations[idx], ...operation };
    return operations[idx];
  }

  deleteOperation(id: string): void {
    const idx = operations.findIndex(m => m.id === id);
    if (idx !== -1) operations.splice(idx, 1);
  }
}