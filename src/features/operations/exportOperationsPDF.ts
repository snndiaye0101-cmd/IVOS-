import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Operation } from './operation.types';

export function exportOperationsToPDF(operations: Operation[]) {
  const site: null = null;
  const year: null = null;
  const filtered = operations;
  const doc = new jsPDF();
  doc.text('Liste des Opérations', 14, 14);
  autoTable(doc, {
    head: [['ID', 'Client', 'Type', 'Responsable', 'Statut', 'Début', 'Fin']],
    body: filtered.map((m) => [
      m.id,
      m.client ?? '',
      m.type ?? '',
      m.responsable ?? '',
      m.status,
      m.heureDebut || '',
      m.heureFin || '',
    ]),
  });
  doc.save('operations.pdf');
}
