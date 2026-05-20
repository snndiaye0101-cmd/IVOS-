// ============================================================
// Document Store — Stockage local des documents RH
// Simulation Supabase Storage avec localStorage + base64
// ============================================================

export type DocumentCategory =
  | 'Contrats & Avenants'
  | 'Parcours Disciplinaire'
  | 'Pièces Administratives';

export type CompanyDocCategory =
  | 'Juridique & Statuts'
  | 'Modèles de Documents'
  | 'Assurances & Taxes'
  | 'Dossiers Employés';

export type EmployeeDossierSection = 'État Civil' | 'Administratif & RH' | 'Paie' | 'Discipline';

export interface HRDocument {
  id: string;
  name: string;
  category: DocumentCategory;
  employeeId: string;
  fileType: string; // 'application/pdf' | 'image/...'
  fileSize: number; // bytes
  dataUrl: string; // base64 data URL
  uploadedBy: string; // userId
  uploadedAt: string; // ISO date
  description?: string;
}

export interface CompanyDocument {
  id: string;
  name: string;
  category: CompanyDocCategory;
  employeeId?: string;
  employeeName?: string;
  section?: EmployeeDossierSection;
  fileType: string;
  fileSize: number;
  dataUrl: string;
  uploadedBy: string;
  uploadedAt: string;
  description?: string;
}

const EMPLOYEE_DOCS_KEY = 'ivos_hr_employee_docs_v1';
const COMPANY_DOCS_KEY = 'ivos_hr_company_docs_v1';

function generateId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readFromStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeToStorage<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Storage quota exceeded — fichier trop volumineux', e);
    throw new Error('Le fichier est trop volumineux pour être stocké localement.');
  }
}

// ─── Employee Documents ───────────────────────────────────────
export const employeeDocStore = {
  getAll(): HRDocument[] {
    return readFromStorage<HRDocument>(EMPLOYEE_DOCS_KEY);
  },

  getByEmployee(employeeId: string): HRDocument[] {
    return this.getAll().filter((d) => d.employeeId === employeeId);
  },

  getByCategory(employeeId: string, category: DocumentCategory): HRDocument[] {
    return this.getByEmployee(employeeId).filter((d) => d.category === category);
  },

  add(doc: Omit<HRDocument, 'id' | 'uploadedAt'>): HRDocument {
    const newDoc: HRDocument = {
      ...doc,
      id: generateId(),
      uploadedAt: new Date().toISOString(),
    };
    const all = this.getAll();
    all.push(newDoc);
    writeToStorage(EMPLOYEE_DOCS_KEY, all);
    return newDoc;
  },

  remove(docId: string): void {
    const all = this.getAll().filter((d) => d.id !== docId);
    writeToStorage(EMPLOYEE_DOCS_KEY, all);
  },

  update(docId: string, updates: Partial<Pick<HRDocument, 'name' | 'description'>>): void {
    const all = this.getAll().map((d) => (d.id === docId ? { ...d, ...updates } : d));
    writeToStorage(EMPLOYEE_DOCS_KEY, all);
  },
};

// ─── Company Documents ────────────────────────────────────────
export const companyDocStore = {
  getAll(): CompanyDocument[] {
    return readFromStorage<CompanyDocument>(COMPANY_DOCS_KEY);
  },

  getByCategory(category: CompanyDocCategory): CompanyDocument[] {
    return this.getAll().filter((d) => d.category === category);
  },

  getEmployeeDocs(employeeId: string): CompanyDocument[] {
    return this.getAll().filter(
      (d) => d.category === 'Dossiers Employés' && d.employeeId === employeeId
    );
  },

  getEmployeeDocsBySection(employeeId: string, section: EmployeeDossierSection): CompanyDocument[] {
    return this.getAll().filter(
      (d) =>
        d.category === 'Dossiers Employés' && d.employeeId === employeeId && d.section === section
    );
  },

  add(doc: Omit<CompanyDocument, 'id' | 'uploadedAt'>): CompanyDocument {
    const newDoc: CompanyDocument = {
      ...doc,
      id: generateId(),
      uploadedAt: new Date().toISOString(),
    };
    const all = this.getAll();
    all.push(newDoc);
    writeToStorage(COMPANY_DOCS_KEY, all);
    return newDoc;
  },

  remove(docId: string): void {
    const all = this.getAll().filter((d) => d.id !== docId);
    writeToStorage(COMPANY_DOCS_KEY, all);
  },
};

export function archivePayslipToEmployeeDossier(params: {
  employeeId: string;
  employeeName: string;
  fileName: string;
  dataUrl: string;
  fileSize: number;
  uploadedBy: string;
}): CompanyDocument {
  return companyDocStore.add({
    name: params.fileName,
    category: 'Dossiers Employés',
    employeeId: params.employeeId,
    employeeName: params.employeeName,
    section: 'Paie',
    fileType: 'application/pdf',
    fileSize: params.fileSize,
    dataUrl: params.dataUrl,
    uploadedBy: params.uploadedBy,
  });
}

// ─── File helpers ─────────────────────────────────────────────
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function downloadDocument(doc: HRDocument | CompanyDocument): void {
  const a = document.createElement('a');
  a.href = doc.dataUrl;
  a.download = doc.name;
  a.click();
}
