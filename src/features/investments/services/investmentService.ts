import type {
  InvestmentDocument,
  InvestmentDocumentType,
  InvestmentExpense,
  InvestmentInstallment,
  InvestmentProject,
  NewInvestmentExpenseData,
  NewInvestmentProjectData,
} from '../types/investment.types';

const PROJECTS_KEY = 'ivos_investment_projects_v1';
const EXPENSES_KEY = 'ivos_investment_expenses_v1';
const DOCS_KEY = 'ivos_investment_documents_v1';

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Projet';
}

function notifyAll() {
  window.dispatchEvent(new Event('investments:updated'));
}

function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
  notifyAll();
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function nextProjectCode(existing: InvestmentProject[]): string {
  const year = new Date().getFullYear();
  const count = existing.filter(p => p.codeProjet.startsWith(`INV-${year}-`)).length + 1;
  return `INV-${year}-${String(count).padStart(4, '0')}`;
}

export function getInvestmentArchivePath(projectName: string): string {
  return `Archives / Investissements / ${slugify(projectName)}`;
}

export function getInvestmentProjects(options?: { archived?: boolean }): InvestmentProject[] {
  const all = load<InvestmentProject>(PROJECTS_KEY).map(project => ({
    ...project,
    dateDebut: project.dateDebut || project.createdAt.slice(0, 10),
    acomptesPrevus: Array.isArray(project.acomptesPrevus)
      ? project.acomptesPrevus.map((line: Partial<InvestmentInstallment>) => ({
          id: line.id ?? '',
          libelle: line.libelle || '',
          montant: typeof line.montant === 'number' ? line.montant : (line.montantPrevu || 0),
          datePrevisionnelle: line.datePrevisionnelle || project.dateLivraison || project.dateDebut || '',
          decaisse: Boolean(line.decaisse),
        }))
      : [],
  }));
  if (options?.archived === undefined) {
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return all
    .filter(project => project.archived === options.archived)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Syncs installments marked as décaissé to InvestmentExpenses (CAPEX).
 * Creates a 'Paye' expense for each decaissé installment that has no linked expense yet.
 */
function syncDecaisseToExpenses(project: InvestmentProject, userId: string) {
  const expenses = load<InvestmentExpense>(EXPENSES_KEY);
  const now = new Date().toISOString();
  let changed = false;

  project.acomptesPrevus.forEach(installment => {
    if (!installment.decaisse) return;
    const alreadyExists = expenses.some(e => e.acompteId === installment.id);
    if (alreadyExists) return;

    expenses.push({
      id: `inv-exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      projectId: project.id,
      projectName: project.nomProjet,
      acompteId: installment.id,
      factureFournisseur: `Décaissement — ${installment.libelle}`,
      montant: installment.montant,
      dateFacture: installment.datePrevisionnelle || now.slice(0, 10),
      description: `Acompte décaissé : ${installment.libelle}`,
      categorieFinance: 'Investissements (CAPEX)',
      statutPaiement: 'Paye',
      qhseConforme: true,
      superAdminValide: true,
      superAdminBy: userId,
      superAdminAt: now,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    });
    changed = true;
  });

  if (changed) {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
  }
}

export function createInvestmentProject(data: NewInvestmentProjectData, userId: string): InvestmentProject {
  const projects = load<InvestmentProject>(PROJECTS_KEY);
  const now = new Date().toISOString();
  const acomptesPrevus: InvestmentInstallment[] = data.acomptesPrevus.map(line => ({
    id: `inv-acompte-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    libelle: line.libelle,
    montant: line.montant,
    datePrevisionnelle: line.datePrevisionnelle,
    decaisse: line.decaisse ?? false,
  }));
  const project: InvestmentProject = {
    id: `inv-proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    codeProjet: nextProjectCode(projects),
    nomProjet: data.nomProjet,
    prestataire: data.prestataire,
    budgetTotal: data.budgetTotal,
    dateDebut: data.dateDebut,
    dateLivraison: data.dateLivraison,
    acomptesPrevus,
    description: data.description,
    archived: false,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
  };
  projects.push(project);
  save(PROJECTS_KEY, projects);
  syncDecaisseToExpenses(project, userId);
  return project;
}

export function updateInvestmentProject(projectId: string, data: NewInvestmentProjectData, userId: string): InvestmentProject | null {
  const projects = load<InvestmentProject>(PROJECTS_KEY);
  const index = projects.findIndex(project => project.id === projectId);
  if (index < 0) return null;

  const acomptesPrevus: InvestmentInstallment[] = data.acomptesPrevus.map((line, lineIndex) => ({
    id: projects[index].acomptesPrevus?.[lineIndex]?.id || `inv-acompte-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    libelle: line.libelle,
    montant: line.montant,
    datePrevisionnelle: line.datePrevisionnelle,
    decaisse: line.decaisse ?? false,
  }));

  projects[index] = {
    ...projects[index],
    nomProjet: data.nomProjet,
    prestataire: data.prestataire,
    budgetTotal: data.budgetTotal,
    dateDebut: data.dateDebut,
    dateLivraison: data.dateLivraison,
    acomptesPrevus,
    description: data.description,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  };

  save(PROJECTS_KEY, projects);
  syncDecaisseToExpenses(projects[index], userId);
  return projects[index];
}

export function deleteInvestmentProject(projectId: string): boolean {
  const projects = load<InvestmentProject>(PROJECTS_KEY);
  const nextProjects = projects.filter(project => project.id !== projectId);
  if (nextProjects.length === projects.length) return false;

  const nextExpenses = load<InvestmentExpense>(EXPENSES_KEY).filter(expense => expense.projectId !== projectId);
  const nextDocs = load<InvestmentDocument>(DOCS_KEY).filter(doc => doc.projectId !== projectId);

  localStorage.setItem(PROJECTS_KEY, JSON.stringify(nextProjects));
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(nextExpenses));
  localStorage.setItem(DOCS_KEY, JSON.stringify(nextDocs));
  notifyAll();
  return true;
}

export function getInvestmentProjectById(projectId: string): InvestmentProject | null {
  return getInvestmentProjects().find(project => project.id === projectId) || null;
}

export function archiveInvestmentProject(projectId: string, userId: string): boolean {
  const projects = load<InvestmentProject>(PROJECTS_KEY);
  const index = projects.findIndex(project => project.id === projectId);
  if (index < 0) return false;
  projects[index] = {
    ...projects[index],
    archived: true,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  };
  save(PROJECTS_KEY, projects);
  return true;
}

export function getInvestmentExpenses(projectId?: string): InvestmentExpense[] {
  const expenses = load<InvestmentExpense>(EXPENSES_KEY);
  const filtered = projectId ? expenses.filter(expense => expense.projectId === projectId) : expenses;
  return filtered.sort((a, b) => b.dateFacture.localeCompare(a.dateFacture));
}

export function createInvestmentExpense(data: NewInvestmentExpenseData, userId: string): InvestmentExpense {
  const expenses = load<InvestmentExpense>(EXPENSES_KEY);
  const now = new Date().toISOString();
  const expense: InvestmentExpense = {
    id: `inv-exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    projectId: data.projectId,
    projectName: data.projectName,
    acompteId: data.acompteId,
    factureFournisseur: data.factureFournisseur,
    montant: data.montant,
    dateFacture: data.dateFacture,
    description: data.description,
    categorieFinance: 'Investissements (CAPEX)',
    statutPaiement: 'Brouillon',
    qhseConforme: false,
    superAdminValide: false,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
  };
  expenses.push(expense);
  save(EXPENSES_KEY, expenses);
  return expense;
}

export function upsertInvestmentDocument(
  payload:
    | {
        projectId: string;
        projectName: string;
        type: InvestmentDocumentType;
        fileName: string;
        size?: number;
        previewDataUrl?: string;
      }
    | string,
  projectNameOrUploadedBy: string,
  type?: InvestmentDocumentType,
  fileName?: string,
  uploadedBy?: string,
  size?: number,
  previewDataUrl?: string
): InvestmentDocument {
  let projectId: string;
  let projectName: string;
  let docType: InvestmentDocumentType;
  let docFileName: string;
  let by: string;
  let docSize: number | undefined;
  let docPreviewDataUrl: string | undefined;

  if (typeof payload === 'string') {
    projectId = payload;
    projectName = projectNameOrUploadedBy;
    docType = type as InvestmentDocumentType;
    docFileName = fileName || 'document';
    by = uploadedBy || 'system';
    docSize = size;
    docPreviewDataUrl = previewDataUrl;
  } else {
    projectId = payload.projectId;
    projectName = payload.projectName;
    docType = payload.type;
    docFileName = payload.fileName;
    by = projectNameOrUploadedBy;
    docSize = payload.size;
    docPreviewDataUrl = payload.previewDataUrl;
  }

  const docs = load<InvestmentDocument>(DOCS_KEY);
  const doc: InvestmentDocument = {
    id: `inv-doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    projectId,
    projectName,
    type: docType,
    fileName: docFileName,
    archivePath: getInvestmentArchivePath(projectName),
    uploadedAt: new Date().toISOString(),
    uploadedBy: by,
    size: docSize,
    previewDataUrl: docPreviewDataUrl,
  };
  docs.push(doc);
  save(DOCS_KEY, docs);
  return doc;
}

export function getInvestmentDocuments(projectId?: string): InvestmentDocument[] {
  const docs = load<Partial<InvestmentDocument>>(DOCS_KEY).map((doc): InvestmentDocument => {
    const legacyType = String(doc?.type || 'Autre');
    let normalizedType: InvestmentDocumentType;

    if (legacyType === 'Photo avancement') normalizedType = 'Photo site';
    else if (legacyType === 'Photo site') normalizedType = 'Photo site';
    else if (legacyType === 'Contrat sign' || legacyType === 'Contrat') normalizedType = 'Contrat sign';
    else if (legacyType === 'Plan technique' || legacyType === 'Plan') normalizedType = 'Plan technique';
    else if (legacyType === 'Facture') normalizedType = 'Facture';
    else normalizedType = 'Autre';

    return {
      id: String(doc?.id || `inv-doc-${Date.now()}`),
      projectId: String(doc?.projectId || ''),
      projectName: String(doc?.projectName || ''),
      type: normalizedType,
      fileName: String(doc?.fileName || 'document'),
      archivePath: String(doc?.archivePath || ''),
      uploadedAt: String(doc?.uploadedAt || new Date().toISOString()),
      uploadedBy: String(doc?.uploadedBy || 'system'),
      size: typeof doc?.size === 'number' ? doc.size : undefined,
      previewDataUrl: typeof doc?.previewDataUrl === 'string' ? doc.previewDataUrl : undefined,
    };
  });
  const filtered = projectId ? docs.filter(doc => doc.projectId === projectId) : docs;
  return filtered.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export function deleteInvestmentDocument(documentId: string): boolean {
  const docs = load<InvestmentDocument>(DOCS_KEY);
  const nextDocs = docs.filter(doc => doc.id !== documentId);
  if (nextDocs.length === docs.length) return false;

  // The archive folder is virtualized via archivePath metadata in docs.
  // Deleting the document entry removes it from both project view and archive listing.
  localStorage.setItem(DOCS_KEY, JSON.stringify(nextDocs));
  notifyAll();
  return true;
}

export function setExpenseQHSEConform(expenseId: string, qhseConforme: boolean): InvestmentExpense | null {
  const expenses = load<InvestmentExpense>(EXPENSES_KEY);
  const index = expenses.findIndex(expense => expense.id === expenseId);
  if (index < 0) return null;
  expenses[index] = {
    ...expenses[index],
    qhseConforme,
    updatedAt: new Date().toISOString(),
  };
  save(EXPENSES_KEY, expenses);
  return expenses[index];
}

export async function attachVisualProof(expenseId: string, file: File, userId: string): Promise<InvestmentExpense | null> {
  const expenses = load<InvestmentExpense>(EXPENSES_KEY);
  const index = expenses.findIndex(expense => expense.id === expenseId);
  if (index < 0) return null;

  const previewDataUrl = await fileToDataUrl(file);

  const doc = upsertInvestmentDocument(
    expenses[index].projectId,
    expenses[index].projectName,
    'Photo site',
    file.name,
    userId,
    file.size,
    previewDataUrl
  );

  expenses[index] = {
    ...expenses[index],
    preuveVisuelleDocumentId: doc.id,
    updatedAt: new Date().toISOString(),
  };
  save(EXPENSES_KEY, expenses);
  return expenses[index];
}

export function signExpenseAsSuperAdmin(expenseId: string, userId: string, isSuperAdmin: boolean): InvestmentExpense | null {
  if (!isSuperAdmin) return null;

  const expenses = load<InvestmentExpense>(EXPENSES_KEY);
  const index = expenses.findIndex(expense => expense.id === expenseId);
  if (index < 0) return null;

  const current = expenses[index];
  if (!current.preuveVisuelleDocumentId || !current.qhseConforme) {
    return null;
  }

  expenses[index] = {
    ...current,
    superAdminValide: true,
    superAdminBy: userId,
    superAdminAt: new Date().toISOString(),
    statutPaiement: 'Bon a payer',
    updatedAt: new Date().toISOString(),
  };

  save(EXPENSES_KEY, expenses);
  return expenses[index];
}

export function markInvestmentExpensePaid(expenseId: string): InvestmentExpense | null {
  const expenses = load<InvestmentExpense>(EXPENSES_KEY);
  const index = expenses.findIndex(expense => expense.id === expenseId);
  if (index < 0) return null;

  if (!expenses[index].superAdminValide) {
    return null;
  }

  expenses[index] = {
    ...expenses[index],
    statutPaiement: 'Paye',
    updatedAt: new Date().toISOString(),
  };
  save(EXPENSES_KEY, expenses);
  return expenses[index];
}

export function getCapexTotalByYear(year: number): number {
  return getInvestmentExpenses().reduce((sum, expense) => {
    if (!expense.dateFacture.startsWith(String(year))) return sum;
    return sum + expense.montant;
  }, 0);
}
