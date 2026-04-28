import * as XLSX from 'xlsx';
import { Operation } from './operation.types';

export function exportOperationsToExcel(operations: Operation[]) {
  const site: null = null;
  const year: null = null;
  const filtered = operations;
  const ws = XLSX.utils.json_to_sheet(
    filtered.map(m => ({
      ID: m.id,
      Client: m.client,
      Type: m.type,
      Responsable: m.responsable,
      Statut: m.status,
      'Heure début': m.heureDebut || '',
      'Heure fin': m.heureFin || ''
    }))
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Opérations');
  XLSX.writeFile(wb, 'operations.xlsx');
}
