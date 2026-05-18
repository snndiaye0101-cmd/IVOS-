import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FilePlus2,
  FileText,
  PenLine,
  Plus,
  ShieldCheck,
  Table,
  Trash2,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { formatCleanAmount } from '@/shared/utils/formatAmount';
import { useAuth } from '../../../shared/contexts/AuthContext';
import {
  attachVisualProof,
  createInvestmentExpense,
  createInvestmentProject,
  deleteInvestmentDocument,
  deleteInvestmentProject,
  fileToDataUrl,
  getInvestmentDocuments,
  getInvestmentExpenses,
  getInvestmentProjects,
  markInvestmentExpensePaid,
  setExpenseQHSEConform,
  signExpenseAsSuperAdmin,
  updateInvestmentProject,
  upsertInvestmentDocument,
} from '../services/investmentService';
import type {
  InvestmentDocument,
  InvestmentDocumentType,
  InvestmentExpense,
  InvestmentInstallment,
  InvestmentProject,
  NewInvestmentProjectData,
} from '../types/investment.types';

/** Form state for a single installment row */
interface DraftInstallment {
  id: string;
  libelle: string;
  montant: number;
  datePrevisionnelle: string;
  decaisse: boolean;
}

interface ProjectFormState {
  nomProjet: string;
  prestataire: string;
  budgetTotal: number;
  dateDebut: string;
  dateLivraison: string;
  acomptesPrevus: DraftInstallment[];
}

/** Pending file to be uploaded when the form is submitted (Section C) */
interface PendingDoc {
  id: string;
  type: InvestmentDocumentType;
  file: File;
  previewDataUrl: string;
}

type BillingRow = {
  key: string;
  libelle: string;
  montantPrevu: number;
  datePrevisionnelle: string;
  facture?: InvestmentExpense;
  couleur: 'blue' | 'orange' | 'green';
  statutLabel: string;
};

function buildEmptyForm(): ProjectFormState {
  return {
    nomProjet: '',
    prestataire: '',
    budgetTotal: 0,
    dateDebut: '',
    dateLivraison: '',
    acomptesPrevus: [{ id: `draft-${Date.now()}`, libelle: '', montant: 0, datePrevisionnelle: '', decaisse: false }],
  };
}

function mapProjectToForm(project: InvestmentProject): ProjectFormState {
  return {
    nomProjet: project.nomProjet,
    prestataire: project.prestataire,
    budgetTotal: project.budgetTotal,
    dateDebut: project.dateDebut,
    dateLivraison: project.dateLivraison,
    acomptesPrevus: project.acomptesPrevus.length > 0
      ? project.acomptesPrevus.map(line => ({
          id: line.id,
          libelle: line.libelle,
          montant: line.montant,
          datePrevisionnelle: line.datePrevisionnelle,
          decaisse: line.decaisse ?? false,
        }))
      : [{ id: `draft-${Date.now()}`, libelle: '', montant: 0, datePrevisionnelle: '', decaisse: false }],
  };
}


export default function InvestmentsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [projects, setProjects] = useState<InvestmentProject[]>([]);
  const [allExpenses, setAllExpenses] = useState<InvestmentExpense[]>([]);
  const [allDocuments, setAllDocuments] = useState<InvestmentDocument[]>([]);

  const [activeProjectId, setActiveProjectId] = useState('');
  const [previewProjectId, setPreviewProjectId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  /** Active tab in the create/edit modal: A = Identité, B = Plan Décaissement, C = Pièces Jointes */
  const [modalSection, setModalSection] = useState<'A' | 'B' | 'C'>('A');
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [pendingDocType, setPendingDocType] = useState<InvestmentDocumentType>('Contrat signé');
  const [documentPreview, setDocumentPreview] = useState<{ title: string; url: string; isPdf: boolean } | null>(null);

  const [projectForm, setProjectForm] = useState<ProjectFormState>(buildEmptyForm());

  const [selectedAcompteId, setSelectedAcompteId] = useState('');
  const [factureFournisseur, setFactureFournisseur] = useState('');
  const [montant, setMontant] = useState(0);
  const [dateFacture, setDateFacture] = useState('');
  const [description, setDescription] = useState('');

  const activeProject = useMemo(
    () => projects.find(p => p.id === activeProjectId) || null,
    [projects, activeProjectId]
  );
  const previewProject = useMemo(
    () => projects.find(p => p.id === previewProjectId) || null,
    [projects, previewProjectId]
  );

  useEffect(() => {
    refreshAll();
    const handler = () => refreshAll();
    window.addEventListener('investments:updated', handler);
    return () => window.removeEventListener('investments:updated', handler);
  }, []);

  useEffect(() => {
    if (projects.length === 0) { setActiveProjectId(''); return; }
    if (!activeProjectId || !projects.some(p => p.id === activeProjectId)) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId]);

  function refreshAll() {
    setProjects(getInvestmentProjects({ archived: false }));
    setAllExpenses(getInvestmentExpenses());
    setAllDocuments(getInvestmentDocuments());
  }

  function formatMoney(value: number) {
    return formatCleanAmount(value, 'FCFA');
  }

  function getProjectExpenses(projectId: string) {
    return allExpenses.filter(e => e.projectId === projectId);
  }

  function getProjectDocuments(projectId: string) {
    return allDocuments.filter(d => d.projectId === projectId);
  }

  function getValidatedAmount(projectId: string) {
    return getProjectExpenses(projectId)
      .filter(e => e.superAdminValide || e.statutPaiement === 'Paye')
      .reduce((sum, e) => sum + e.montant, 0);
  }

  function getPaidAmount(projectId: string) {
    return getProjectExpenses(projectId)
      .filter(e => e.statutPaiement === 'Paye')
      .reduce((sum, e) => sum + e.montant, 0);
  }

  /** Décaissé réel = sum of installments marked as decaisse */
  function getDecaisseReel(project: InvestmentProject) {
    return project.acomptesPrevus
      .filter(a => a.decaisse)
      .reduce((sum, a) => sum + a.montant, 0);
  }

  function getRemainingToPay(project: InvestmentProject) {
    return Math.max(0, project.budgetTotal - getDecaisseReel(project));
  }

  /* ── KPI bar ── */
  const budgetEngage = useMemo(
    () => projects.reduce((sum, p) => sum + p.budgetTotal, 0),
    [projects]
  );
  const decaisseReelTotal = useMemo(
    () => projects.reduce((sum, p) => sum + getDecaisseReel(p), 0),
    [projects]
  );
  const resteAPayerTotal = Math.max(0, budgetEngage - decaisseReelTotal);

  const activeProjectExpenses = useMemo(
    () => (activeProject ? getProjectExpenses(activeProject.id) : []),
    [activeProject, allExpenses]
  );
  const activeProjectDocuments = useMemo(
    () => (activeProject ? getProjectDocuments(activeProject.id) : []),
    [activeProject, allDocuments]
  );
  const activePhotoDocuments = useMemo(
    () => activeProjectDocuments.filter(d => d.type === 'Photo site'),
    [activeProjectDocuments]
  );

  const previewProjectExpenses = useMemo(
    () => (previewProject ? getProjectExpenses(previewProject.id) : []),
    [previewProject, allExpenses]
  );
  const previewProjectDocuments = useMemo(
    () => (previewProject ? getProjectDocuments(previewProject.id) : []),
    [previewProject, allDocuments]
  );
  const editingProjectDocuments = useMemo(
    () => (editingProjectId ? getProjectDocuments(editingProjectId) : []),
    [editingProjectId, allDocuments]
  );

  const activeInstallmentMap = useMemo(() => {
    const map = new Map<string, InvestmentInstallment>();
    activeProject?.acomptesPrevus.forEach(line => map.set(line.id, line));
    return map;
  }, [activeProject]);

  const previewInstallmentMap = useMemo(() => {
    const map = new Map<string, InvestmentInstallment>();
    previewProject?.acomptesPrevus.forEach(line => map.set(line.id, line));
    return map;
  }, [previewProject]);

  function buildBillingRows(project: InvestmentProject | null, expenses: InvestmentExpense[]): BillingRow[] {
    if (!project) return [];
    const byInstallment = new Map<string, InvestmentExpense>();
    const extraRows: BillingRow[] = [];

    expenses.forEach(expense => {
      if (expense.acompteId) { byInstallment.set(expense.acompteId, expense); return; }
      extraRows.push({
        key: `extra-${expense.id}`,
        libelle: expense.description || expense.factureFournisseur,
        montantPrevu: 0,
        datePrevisionnelle: '-',
        facture: expense,
        couleur: expense.statutPaiement === 'Paye' ? 'green' : 'orange',
        statutLabel: expense.statutPaiement === 'Paye' ? 'Paye' : 'Facture recue / En attente',
      });
    });

    const plannedRows = project.acomptesPrevus.map(line => {
      const linkedExpense = byInstallment.get(line.id);
      if (!linkedExpense) {
        return {
          key: `planned-${line.id}`,
          libelle: line.libelle,
          montantPrevu: line.montant,
          datePrevisionnelle: line.datePrevisionnelle,
          couleur: line.decaisse ? 'green' : 'blue',
          statutLabel: line.decaisse ? 'Décaissé' : 'Acompte prévu',
        } as BillingRow;
      }
      return {
        key: `expense-${linkedExpense.id}`,
        libelle: line.libelle,
        montantPrevu: line.montant,
        datePrevisionnelle: line.datePrevisionnelle,
        facture: linkedExpense,
        couleur: linkedExpense.statutPaiement === 'Paye' ? 'green' : 'orange',
        statutLabel: linkedExpense.statutPaiement === 'Paye' ? 'Paye' : 'Facture recue / En attente',
      } as BillingRow;
    });

    return [...plannedRows, ...extraRows];
  }

  const activeBillingRows = useMemo(
    () => buildBillingRows(activeProject, activeProjectExpenses),
    [activeProject, activeProjectExpenses]
  );
  const previewBillingRows = useMemo(
    () => buildBillingRows(previewProject, previewProjectExpenses),
    [previewProject, previewProjectExpenses]
  );

  function badgeClass(color: BillingRow['couleur']) {
    if (color === 'green') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (color === 'orange') return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  }

  /* ── Modal helpers ── */
  function openCreateModal() {
    setEditingProjectId(null);
    setProjectForm(buildEmptyForm());
    setPendingDocs([]);
    setModalSection('A');
    setIsProjectModalOpen(true);
  }

  function openEditModal(project: InvestmentProject) {
    setEditingProjectId(project.id);
    setProjectForm(mapProjectToForm(project));
    setPendingDocs([]);
    setModalSection('A');
    setIsProjectModalOpen(true);
  }

  function closeProjectModal() {
    setIsProjectModalOpen(false);
    setEditingProjectId(null);
    setProjectForm(buildEmptyForm());
    setPendingDocs([]);
    setModalSection('A');
  }

  function updateProjectFormField(field: keyof Omit<ProjectFormState, 'acomptesPrevus'>, value: string | number) {
    setProjectForm(prev => ({ ...prev, [field]: value }));
  }

  function addInstallmentLine() {
    setProjectForm(prev => ({
      ...prev,
      acomptesPrevus: [
        ...prev.acomptesPrevus,
        { id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, libelle: '', montant: 0, datePrevisionnelle: '', decaisse: false },
      ],
    }));
  }

  function removeInstallmentLine(lineId: string) {
    setProjectForm(prev => ({
      ...prev,
      acomptesPrevus: prev.acomptesPrevus.length === 1
        ? [{ id: prev.acomptesPrevus[0].id, libelle: '', montant: 0, datePrevisionnelle: '', decaisse: false }]
        : prev.acomptesPrevus.filter(l => l.id !== lineId),
    }));
  }

  function updateInstallmentLine(lineId: string, field: 'libelle' | 'montant' | 'datePrevisionnelle' | 'decaisse', value: string | number | boolean) {
    setProjectForm(prev => ({
      ...prev,
      acomptesPrevus: prev.acomptesPrevus.map(l => l.id === lineId ? { ...l, [field]: value } : l),
    }));
  }

  /** Computed live values for Section B summary */
  const draftDecaisseTotal = useMemo(
    () => projectForm.acomptesPrevus.filter(l => l.decaisse).reduce((s, l) => s + (l.montant || 0), 0),
    [projectForm.acomptesPrevus]
  );
  const draftResteAPayer = Math.max(0, (projectForm.budgetTotal || 0) - draftDecaisseTotal);

  function buildProjectPayload(): NewInvestmentProjectData | null {
    const validLines = projectForm.acomptesPrevus.filter(l => l.libelle.trim() && l.montant > 0 && l.datePrevisionnelle);

    if (!projectForm.nomProjet.trim() || !projectForm.prestataire.trim() || projectForm.budgetTotal <= 0 || !projectForm.dateDebut || !projectForm.dateLivraison) {
      alert('Renseignez tous les champs obligatoires (Section A).');
      setModalSection('A');
      return null;
    }
    if (validLines.length === 0) {
      alert('Ajoutez au moins une ligne d\'acompte avec montant et date (Section B).');
      setModalSection('B');
      return null;
    }

    return {
      nomProjet: projectForm.nomProjet.trim(),
      prestataire: projectForm.prestataire.trim(),
      budgetTotal: projectForm.budgetTotal,
      dateDebut: projectForm.dateDebut,
      dateLivraison: projectForm.dateLivraison,
      acomptesPrevus: validLines.map(l => ({
        libelle: l.libelle.trim(),
        montant: l.montant,
        datePrevisionnelle: l.datePrevisionnelle,
        decaisse: l.decaisse,
      })),
    };
  }

  async function submitProjectForm(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;

    const payload = buildProjectPayload();
    if (!payload) return;

    let savedProject: InvestmentProject | null = null;
    if (editingProjectId) {
      savedProject = updateInvestmentProject(editingProjectId, payload, user.id);
    } else {
      savedProject = createInvestmentProject(payload, user.id);
    }

    if (!savedProject) { alert('Erreur lors de l\'enregistrement du projet.'); return; }

    /* Upload pending documents (Section C) */
    for (const pending of pendingDocs) {
      const dataUrl = await fileToDataUrl(pending.file);
      upsertInvestmentDocument(
        {
          projectId: savedProject.id,
          projectName: savedProject.nomProjet,
          type: pending.type,
          fileName: pending.file.name,
          size: pending.file.size,
          previewDataUrl: dataUrl,
        },
        user.id
      );
    }

    setActiveProjectId(savedProject.id);
    closeProjectModal();
  }

  /* ── Section C: file picker ── */
  async function handleFilesPicked(files: FileList | null) {
    if (!files) return;
    const newDocs: PendingDoc[] = [];
    for (const file of Array.from(files)) {
      const previewDataUrl = file.type.startsWith('image/') ? await fileToDataUrl(file) : '';
      newDocs.push({ id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, type: pendingDocType, file, previewDataUrl });
    }
    setPendingDocs(prev => [...prev, ...newDocs]);
  }

  function removePendingDoc(id: string) {
    setPendingDocs(prev => prev.filter(d => d.id !== id));
  }

  function downloadPendingDoc(doc: PendingDoc) {
    const url = doc.previewDataUrl || URL.createObjectURL(doc.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.file.name;
    a.click();
  }

  function hasPreviewSupport(fileName: string, url?: string) {
    const lower = fileName.toLowerCase();
    const isKnownImage = lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp');
    const isPdf = lower.endsWith('.pdf');
    const isPreviewDataUrl = Boolean(url && (url.startsWith('data:image/') || url.startsWith('data:application/pdf')));
    return isKnownImage || isPdf || isPreviewDataUrl;
  }

  function openPreview(title: string, fileName: string, url?: string) {
    if (!url) {
      alert('Aperçu indisponible pour ce document.');
      return;
    }
    if (!hasPreviewSupport(fileName, url)) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    setDocumentPreview({
      title,
      url,
      isPdf: fileName.toLowerCase().endsWith('.pdf') || url.startsWith('data:application/pdf'),
    });
  }

  function previewExistingDocument(doc: InvestmentDocument) {
    openPreview(doc.fileName, doc.fileName, doc.previewDataUrl);
  }

  function previewPendingDocument(doc: PendingDoc) {
    const fallbackUrl = URL.createObjectURL(doc.file);
    openPreview(doc.file.name, doc.file.name, doc.previewDataUrl || fallbackUrl);
  }

  function downloadExistingDocument(doc: InvestmentDocument) {
    if (!doc.previewDataUrl) {
      alert('Téléchargement indisponible pour ce document.');
      return;
    }
    const a = document.createElement('a');
    a.href = doc.previewDataUrl;
    a.download = doc.fileName;
    a.click();
  }

  function removeExistingDocument(doc: InvestmentDocument) {
    const confirmed = window.confirm(`Supprimer le document ${doc.fileName} ?`);
    if (!confirmed) return;
    const ok = deleteInvestmentDocument(doc.id);
    if (!ok) alert('Suppression impossible.');
  }

  function deleteProject(project: InvestmentProject) {
    const confirmed = window.confirm(`Supprimer définitivement le projet ${project.nomProjet} et son historique financier ?`);
    if (!confirmed) return;
    const removed = deleteInvestmentProject(project.id);
    if (!removed) { alert('Suppression impossible.'); return; }
    if (activeProjectId === project.id) setActiveProjectId('');
    if (previewProjectId === project.id) setPreviewProjectId(null);
  }

  function createExpense(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !activeProject) return;
    if (!factureFournisseur.trim() || !dateFacture || montant <= 0) {
      alert('Renseignez les champs facture prestataire.');
      return;
    }
    createInvestmentExpense(
      {
        projectId: activeProject.id,
        projectName: activeProject.nomProjet,
        acompteId: selectedAcompteId || undefined,
        factureFournisseur: factureFournisseur.trim(),
        montant,
        dateFacture,
        description: description.trim() || undefined,
      },
      user.id
    );
    setSelectedAcompteId('');
    setFactureFournisseur('');
    setMontant(0);
    setDateFacture('');
    setDescription('');
  }

  async function updateProof(expenseId: string, file?: File) {
    if (!file || !user) return;
    const result = await attachVisualProof(expenseId, file, user.id);
    if (!result) alert('Ajout de la preuve visuelle impossible.');
  }

  const docItemClass = 'flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-colors hover:bg-slate-100/80';
  const docActionBtnClass = 'rounded-lg p-2 text-slate-600 hover:bg-slate-200';
  const docDeleteBtnClass = 'rounded-lg p-2 text-rose-600 hover:bg-rose-100';


  return (
    <>
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 p-4 md:p-6">
        <div className="w-full space-y-6">

          {/* ── Header + KPIs ── */}
          <section className="w-full rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-800 p-6 text-white shadow-xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Gestion des Immobilisations & Infrastructures</h1>
                <p className="mt-2 text-sm text-cyan-100">
                  Gestion par liste référencée, suivi CAPEX et validation Bon à Payer par projet interne.
                </p>
              </div>
              <button type="button" onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg">
                <Plus className="h-4 w-4" />
                Nouveau Projet d'Investissement
              </button>
            </div>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
                <p className="text-xs uppercase tracking-wide text-cyan-100">Budget engagé</p>
                <p className="mt-1 text-2xl font-bold">{formatMoney(budgetEngage)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
                <p className="text-xs uppercase tracking-wide text-cyan-100">Décaissé réel</p>
                <p className="mt-1 text-2xl font-bold">{formatMoney(decaisseReelTotal)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
                <p className="text-xs uppercase tracking-wide text-cyan-100">Reste à payer</p>
                <p className="mt-1 text-2xl font-bold">{formatMoney(resteAPayerTotal)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
                <p className="text-xs uppercase tracking-wide text-cyan-100">Projets actifs</p>
                <p className="mt-1 text-2xl font-bold">{projects.length}</p>
              </div>
            </div>
          </section>

          {/* ── Project list table ── */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Table className="h-5 w-5 text-cyan-700" />
              <h2 className="text-lg font-semibold text-slate-900">Liste des projets d'investissement</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-4 py-3 font-semibold">ID</th>
                    <th className="px-4 py-3 font-semibold">Nom du Projet</th>
                    <th className="px-4 py-3 font-semibold">Prestataire</th>
                    <th className="px-4 py-3 font-semibold">Budget Total</th>
                    <th className="px-4 py-3 font-semibold">Décaissé Réel</th>
                    <th className="px-4 py-3 font-semibold">Reste à Payer</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                        Aucun projet d'investissement enregistré.
                      </td>
                    </tr>
                  ) : (
                    projects.map(project => {
                      const decaisse = getDecaisseReel(project);
                      const reste = getRemainingToPay(project);
                      return (
                        <tr
                          key={project.id}
                          className={`border-b border-slate-100 transition hover:bg-slate-50 cursor-pointer ${activeProjectId === project.id ? 'bg-cyan-50/70' : ''}`}
                          onClick={() => setActiveProjectId(project.id)}
                        >
                          <td className="px-4 py-4 font-medium text-slate-700">{project.codeProjet}</td>
                          <td className="px-4 py-4 text-slate-900 font-semibold">{project.nomProjet}</td>
                          <td className="px-4 py-4 text-slate-700">{project.prestataire}</td>
                          <td className="px-4 py-4 text-slate-700">{formatMoney(project.budgetTotal)}</td>
                          <td className="px-4 py-4">
                            <span className="font-semibold text-emerald-700">{formatMoney(decaisse)}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`font-semibold ${reste > 0 ? 'text-orange-700' : 'text-slate-500'}`}>{formatMoney(reste)}</span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={e => { e.stopPropagation(); setPreviewProjectId(project.id); }} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100" title="Aperçu">
                                <Eye className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={e => { e.stopPropagation(); openEditModal(project); }} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100" title="Modifier">
                                <PenLine className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={e => { e.stopPropagation(); deleteProject(project); }} className="rounded-xl border border-rose-200 p-2 text-rose-600 hover:bg-rose-50" title="Supprimer">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Active project panel ── */}
          {activeProject && (
            <section className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-5 w-5 text-cyan-700" />
                  <h2 className="text-lg font-semibold text-slate-900">Projet actif</h2>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900">{activeProject.nomProjet}</h3>
                  <p className="mt-1 text-sm text-slate-600">{activeProject.codeProjet} • {activeProject.prestataire}</p>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-white border border-slate-200 p-3">
                      <p className="text-slate-500">Budget total</p>
                      <p className="mt-1 font-semibold text-slate-900">{formatMoney(activeProject.budgetTotal)}</p>
                    </div>
                    <div className="rounded-xl bg-white border border-slate-200 p-3">
                      <p className="text-slate-500">Reste à payer</p>
                      <p className="mt-1 font-semibold text-slate-900">{formatMoney(getRemainingToPay(activeProject))}</p>
                    </div>
                    <div className="rounded-xl bg-white border border-slate-200 p-3">
                      <p className="text-slate-500">Signature contrat</p>
                      <p className="mt-1 font-semibold text-slate-900">{new Date(activeProject.dateDebut).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="rounded-xl bg-white border border-slate-200 p-3">
                      <p className="text-slate-500">Livraison prévue</p>
                      <p className="mt-1 font-semibold text-slate-900">{new Date(activeProject.dateLivraison).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="h-5 w-5 text-cyan-700" />
                    <h3 className="text-lg font-semibold text-slate-900">Factures prestataire</h3>
                  </div>
                  <form onSubmit={createExpense} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <select value={selectedAcompteId} onChange={e => setSelectedAcompteId(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      <option value="">Acompte associé (optionnel)</option>
                      {activeProject.acomptesPrevus.map(line => (
                        <option key={line.id} value={line.id}>
                          {line.libelle} — {formatMoney(line.montant)}{line.decaisse ? ' ✓' : ''}
                        </option>
                      ))}
                    </select>
                    <input value={factureFournisseur} onChange={e => setFactureFournisseur(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="N° facture fournisseur" />
                    <input type="number" value={montant || ''} onChange={e => setMontant(parseFloat(e.target.value) || 0)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Montant" />
                    <input type="date" value={dateFacture} onChange={e => setDateFacture(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white">
                      <FilePlus2 className="h-4 w-4" />
                      Enregistrer
                    </button>
                    <input value={description} onChange={e => setDescription(e.target.value)} className="md:col-span-5 rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Description / lot facture" />
                  </form>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Table className="h-5 w-5 text-cyan-700" />
                  <h2 className="text-lg font-semibold text-slate-900">Suivi prévisionnel / réel</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="px-3 py-2">Statut</th>
                        <th className="px-3 py-2">Libellé</th>
                        <th className="px-3 py-2">Prévisionnel</th>
                        <th className="px-3 py-2">Réel</th>
                        <th className="px-3 py-2">Date prévue</th>
                        <th className="px-3 py-2">Date facture</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeBillingRows.length === 0 ? (
                        <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Aucun acompte ou facture enregistré.</td></tr>
                      ) : (
                        activeBillingRows.map(row => (
                          <tr key={row.key} className="bg-slate-50">
                            <td className="px-3 py-3">
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(row.couleur)}`}>{row.statutLabel}</span>
                            </td>
                            <td className="px-3 py-3 font-medium text-slate-900">
                              {row.libelle}
                              {row.facture && <p className="mt-1 text-xs font-normal text-slate-500">{row.facture.factureFournisseur}</p>}
                            </td>
                            <td className="px-3 py-3 text-slate-700">{formatMoney(row.montantPrevu)}</td>
                            <td className="px-3 py-3 text-slate-700">{formatMoney(row.facture?.montant || 0)}</td>
                            <td className="px-3 py-3 text-slate-700">{row.datePrevisionnelle === '-' ? '-' : new Date(row.datePrevisionnelle).toLocaleDateString('fr-FR')}</td>
                            <td className="px-3 py-3 text-slate-700">{row.facture?.dateFacture ? new Date(row.facture.dateFacture).toLocaleDateString('fr-FR') : '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 space-y-3">
                  {activeProjectExpenses.map(expense => (
                    <div key={expense.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-semibold text-slate-900">{expense.factureFournisseur}</p>
                          <p className="text-xs text-slate-500">{formatMoney(expense.montant)} • {new Date(expense.dateFacture).toLocaleDateString('fr-FR')}</p>
                          {expense.acompteId && activeInstallmentMap.get(expense.acompteId) && (
                            <p className="mt-1 text-xs text-cyan-700">Acompte: {activeInstallmentMap.get(expense.acompteId)?.libelle}</p>
                          )}
                        </div>
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${expense.statutPaiement === 'Paye' ? badgeClass('green') : badgeClass('orange')}`}>
                          {expense.statutPaiement}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        <label className={`flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer ${expense.preuveVisuelleDocumentId ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                          <Camera className="h-4 w-4" />
                          <span className="text-xs font-semibold">Preuve visuelle</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => updateProof(expense.id, e.target.files?.[0])} />
                          <span className="ml-auto text-[11px] underline">{expense.preuveVisuelleDocumentId ? 'Remplacer' : 'Ajouter'}</span>
                        </label>
                        <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 ${expense.qhseConforme ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                          <input type="checkbox" checked={expense.qhseConforme} onChange={e => setExpenseQHSEConform(expense.id, e.target.checked)} />
                          <ShieldCheck className="h-4 w-4" />
                          <span className="text-xs font-semibold">Validation QHSE</span>
                        </label>
                        <button
                          type="button"
                          disabled={!isSuperAdmin}
                          onClick={() => {
                            if (!user) return;
                            const signed = signExpenseAsSuperAdmin(expense.id, user.id, isSuperAdmin);
                            if (!signed) alert('Validation impossible: preuve visuelle + conformité QHSE requises.');
                          }}
                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${expense.superAdminValide ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700 disabled:opacity-40'}`}
                        >
                          <PenLine className="h-4 w-4" />
                          Signature Super Admin
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={expense.statutPaiement !== 'Bon a payer'}
                          onClick={() => { const paid = markInvestmentExpensePaid(expense.id); if (!paid) alert('Paiement impossible sans validation finale Super Admin.'); }}
                          className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:bg-slate-300"
                        >
                          Déclencher paiement
                        </button>
                      </div>
                    </div>
                  ))}
                  {activeProjectExpenses.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                      Aucune facture prestataire sur ce projet.
                    </div>
                  )}
                  {activePhotoDocuments.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <h3 className="text-sm font-semibold text-slate-900">Dernières photos chantier</h3>
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                        {activePhotoDocuments.slice(0, 3).map(doc => (
                          <div key={doc.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            {doc.previewDataUrl ? (
                              <img src={doc.previewDataUrl} alt={doc.fileName} className="h-32 w-full object-cover" />
                            ) : (
                              <div className="flex h-32 items-center justify-center bg-slate-100 text-xs text-slate-500">Aperçu indisponible</div>
                            )}
                            <div className="p-3 text-xs text-slate-600">{doc.fileName}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          PROJECT CREATE / EDIT MODAL  (3 sections A / B / C)
      ══════════════════════════════════════════════════ */}
      <Modal
        isOpen={isProjectModalOpen}
        onClose={closeProjectModal}
        title={editingProjectId ? 'Modifier le projet d\'investissement' : 'Nouveau projet d\'investissement'}
        size="full"
      >
        {/* Tab navigator */}
        <div className="flex items-center gap-1 border-b border-slate-200 px-6 pb-0 -mt-2">
          {(['A', 'B', 'C'] as const).map((s, idx) => {
            const labels = ['A — Identité', 'B — Décaissement', 'C — Pièces Jointes'];
            return (
              <button
                key={s}
                type="button"
                onClick={() => setModalSection(s)}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${modalSection === s ? 'border-cyan-600 text-cyan-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                {labels[idx]}
              </button>
            );
          })}
        </div>

        <form onSubmit={submitProjectForm}>
          <div className="p-6 overflow-y-auto max-h-[60vh] space-y-5">

            {/* ── Section A: Identité ── */}
            {modalSection === 'A' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Informations du projet</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nom du projet *</label>
                    <input
                      value={projectForm.nomProjet}
                      onChange={e => updateProjectFormField('nomProjet', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none"
                      placeholder="Ex: Construction Siège Social Phase 2"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Prestataire / Constructeur *</label>
                    <input
                      value={projectForm.prestataire}
                      onChange={e => updateProjectFormField('prestataire', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none"
                      placeholder="Nom de l'entreprise ou du constructeur"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Budget total estimé (FCFA) *</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={projectForm.budgetTotal || ''}
                      onChange={e => updateProjectFormField('budgetTotal', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none"
                      placeholder="0"
                    />
                  </div>
                  <div />
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Date de signature du contrat *</label>
                    <input
                      type="date"
                      value={projectForm.dateDebut}
                      onChange={e => updateProjectFormField('dateDebut', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Date de livraison estimée *</label>
                    <input
                      type="date"
                      value={projectForm.dateLivraison}
                      onChange={e => updateProjectFormField('dateLivraison', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Section B: Plan de Décaissement ── */}
            {modalSection === 'B' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Plan de décaissement</h3>
                  <button type="button" onClick={addInstallmentLine} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter une ligne
                  </button>
                </div>

                {/* Column headers */}
                <div className="hidden md:grid md:grid-cols-12 gap-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <div className="col-span-4">Échéance</div>
                  <div className="col-span-3">Montant (FCFA)</div>
                  <div className="col-span-3">Date prévue</div>
                  <div className="col-span-1 text-center">Décaissé</div>
                  <div className="col-span-1" />
                </div>

                <div className="space-y-2">
                  {projectForm.acomptesPrevus.map(line => (
                    <div key={line.id} className={`grid grid-cols-1 md:grid-cols-12 gap-2 rounded-xl border p-2 transition-colors ${line.decaisse ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'}`}>
                      <input
                        value={line.libelle}
                        onChange={e => updateInstallmentLine(line.id, 'libelle', e.target.value)}
                        className="md:col-span-4 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm focus:border-cyan-500 focus:outline-none"
                        placeholder="Ex: Acompte 1 — Fondations"
                      />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={line.montant || ''}
                        onChange={e => updateInstallmentLine(line.id, 'montant', parseFloat(e.target.value) || 0)}
                        className="md:col-span-3 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm focus:border-cyan-500 focus:outline-none"
                        placeholder="Montant"
                      />
                      <input
                        type="date"
                        value={line.datePrevisionnelle}
                        onChange={e => updateInstallmentLine(line.id, 'datePrevisionnelle', e.target.value)}
                        className="md:col-span-3 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm focus:border-cyan-500 focus:outline-none"
                      />
                      <label className="md:col-span-1 flex items-center justify-center gap-1.5 cursor-pointer" title="Marquer comme décaissé">
                        <input
                          type="checkbox"
                          checked={line.decaisse}
                          onChange={e => updateInstallmentLine(line.id, 'decaisse', e.target.checked)}
                          className="h-4 w-4 accent-emerald-600"
                        />
                        {line.decaisse && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                      </label>
                      <button
                        type="button"
                        onClick={() => removeInstallmentLine(line.id)}
                        className="md:col-span-1 flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 py-2"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Live summary */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Budget total</p>
                    <p className="font-bold text-slate-900">{formatMoney(projectForm.budgetTotal || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Décaissé (✓ cochés)</p>
                    <p className="font-bold text-emerald-700">{formatMoney(draftDecaisseTotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Reste à payer</p>
                    <p className={`font-bold ${draftResteAPayer > 0 ? 'text-orange-700' : 'text-slate-500'}`}>{formatMoney(draftResteAPayer)}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  ✓ Chaque acompte coché comme "Décaissé" sera automatiquement intégré dans le Dashboard Finance (CAPEX).
                </p>
              </div>
            )}

            {/* ── Section C: Pièces Jointes ── */}
            {modalSection === 'C' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Pièces jointes</h3>

                {/* Upload zone */}
                <div className="flex items-center gap-3 flex-wrap">
                  <select
                    value={pendingDocType}
                    onChange={e => setPendingDocType(e.target.value as InvestmentDocumentType)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="Contrat signé">Contrat signé</option>
                    <option value="Plan technique">Plan technique</option>
                    <option value="Photo site">Photo site</option>
                    <option value="Facture">Facture</option>
                    <option value="Autre">Autre</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl border border-dashed border-cyan-400 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-cyan-700 hover:bg-cyan-100"
                  >
                    <Upload className="h-4 w-4" />
                    Sélectionner des fichiers
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={e => handleFilesPicked(e.target.files)}
                  />
                </div>

                {/* Pending file list */}
                <div className="space-y-3">
                  {editingProjectId && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Documents déjà archivés</p>
                      {editingProjectDocuments.length === 0 ? (
                        <p className="text-sm text-slate-500">Aucun document enregistré sur ce projet.</p>
                      ) : (
                        <div className="space-y-2">
                          {editingProjectDocuments.map(doc => (
                            <div key={doc.id} className={docItemClass}>
                              <FileText className="h-4 w-4 text-slate-500" />
                              <button type="button" onClick={() => previewExistingDocument(doc)} className="min-w-0 flex-1 truncate text-left text-sm font-medium text-cyan-700 hover:underline">
                                {doc.fileName}
                              </button>
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={() => previewExistingDocument(doc)} className={docActionBtnClass} title="Aperçu">
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button type="button" onClick={() => downloadExistingDocument(doc)} className={docActionBtnClass} title="Télécharger">
                                  <Download className="h-4 w-4" />
                                </button>
                                <button type="button" onClick={() => removeExistingDocument(doc)} className={docDeleteBtnClass} title="Supprimer">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Fichiers en attente d'enregistrement</p>
                    {pendingDocs.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                        Aucun fichier sélectionné.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pendingDocs.map(doc => (
                          <div key={doc.id} className={docItemClass}>
                            <FileText className="h-4 w-4 text-slate-500" />
                            <button type="button" onClick={() => previewPendingDocument(doc)} className="min-w-0 flex-1 truncate text-left text-sm font-medium text-cyan-700 hover:underline">
                              {doc.file.name}
                            </button>
                            <span className="hidden md:inline text-xs text-slate-500">{doc.type} · {(doc.file.size / 1024).toFixed(0)} Ko</span>
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => previewPendingDocument(doc)} className={docActionBtnClass} title="Aperçu">
                                <Eye className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => downloadPendingDoc(doc)} className={docActionBtnClass} title="Télécharger">
                                <Download className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => removePendingDoc(doc.id)} className={docDeleteBtnClass} title="Supprimer">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Formats acceptés : images (JPG, PNG…), PDF, Word, Excel. Les fichiers sont stockés localement.
                </p>
              </div>
            )}
          </div>

          {/* Modal footer */}
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2">
              {modalSection !== 'A' && (
                <button
                  type="button"
                  onClick={() => setModalSection(prev => prev === 'C' ? 'B' : 'A')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
                </button>
              )}
              {modalSection !== 'C' && (
                <button
                  type="button"
                  onClick={() => setModalSection(prev => prev === 'A' ? 'B' : 'C')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={closeProjectModal} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                Annuler
              </button>
              <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                {editingProjectId ? 'Enregistrer les modifications' : 'Créer le projet'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ── Preview modal ── */}
      <Modal
        isOpen={Boolean(previewProject)}
        onClose={() => setPreviewProjectId(null)}
        title={previewProject ? `Aperçu — ${previewProject.nomProjet}` : 'Aperçu'}
        size="full"
      >
        {previewProject && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Budget total</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(previewProject.budgetTotal)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Validé</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(getValidatedAmount(previewProject.id))}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Décaissé réel</p>
                <p className="mt-1 text-lg font-semibold text-emerald-700">{formatMoney(getDecaisseReel(previewProject))}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Reste à payer</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(getRemainingToPay(previewProject))}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Plan de décaissement</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="px-3 py-2">Échéance</th>
                      <th className="px-3 py-2">Montant</th>
                      <th className="px-3 py-2">Date prévue</th>
                      <th className="px-3 py-2">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewProject.acomptesPrevus.map(line => (
                      <tr key={line.id} className="border-b border-slate-100">
                        <td className="px-3 py-3 text-slate-900 font-medium">{line.libelle}</td>
                        <td className="px-3 py-3 text-slate-700">{formatMoney(line.montant)}</td>
                        <td className="px-3 py-3 text-slate-700">{new Date(line.datePrevisionnelle).toLocaleDateString('fr-FR')}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${line.decaisse ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                            {line.decaisse ? 'Décaissé ✓' : 'Prévu'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Historique des factures</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="px-3 py-2">Facture</th>
                      <th className="px-3 py-2">Acompte</th>
                      <th className="px-3 py-2">Montant</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewProjectExpenses.length === 0 ? (
                      <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Aucune facture sur ce projet.</td></tr>
                    ) : (
                      previewProjectExpenses.map(expense => (
                        <tr key={expense.id} className="border-b border-slate-100">
                          <td className="px-3 py-3 text-slate-900 font-medium">{expense.factureFournisseur}</td>
                          <td className="px-3 py-3 text-slate-700">{expense.acompteId ? previewInstallmentMap.get(expense.acompteId)?.libelle || '-' : '-'}</td>
                          <td className="px-3 py-3 text-slate-700">{formatMoney(expense.montant)}</td>
                          <td className="px-3 py-3 text-slate-700">{new Date(expense.dateFacture).toLocaleDateString('fr-FR')}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${expense.statutPaiement === 'Paye' ? badgeClass('green') : expense.statutPaiement === 'Bon a payer' ? badgeClass('blue') : badgeClass('orange')}`}>
                              {expense.statutPaiement}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Documents du projet</h3>
              {previewProjectDocuments.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  Aucun document disponible.
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {previewProjectDocuments.map(doc => (
                    <div key={doc.id} className={docItemClass}>
                      <FileText className="h-4 w-4 text-slate-500" />
                      <button type="button" onClick={() => previewExistingDocument(doc)} className="min-w-0 flex-1 truncate text-left text-sm font-medium text-cyan-700 hover:underline">
                        {doc.fileName}
                      </button>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => previewExistingDocument(doc)} className={docActionBtnClass} title="Aperçu">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => downloadExistingDocument(doc)} className={docActionBtnClass} title="Télécharger">
                          <Download className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => removeExistingDocument(doc)} className={docDeleteBtnClass} title="Supprimer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(documentPreview)}
        onClose={() => setDocumentPreview(null)}
        title={documentPreview ? `Aperçu — ${documentPreview.title}` : 'Aperçu document'}
        size="full"
      >
        {documentPreview && (
          <div className="h-[80vh] w-full rounded-xl border border-slate-200 bg-white overflow-hidden">
            {documentPreview.isPdf ? (
              <iframe src={documentPreview.url} title={documentPreview.title} className="h-full w-full" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-50 p-4">
                <img src={documentPreview.url} alt={documentPreview.title} className="max-h-full max-w-full object-contain" />
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
