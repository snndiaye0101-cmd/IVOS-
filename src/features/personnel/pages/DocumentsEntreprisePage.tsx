import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  FileText,
  Folder,
  FolderOpen,
  Lock,
  Plus,
  Scale,
  ShieldCheck,
  Search,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import {
  companyDocStore,
  readFileAsDataUrl,
  type CompanyDocCategory,
  type CompanyDocument,
  type EmployeeDossierSection,
} from '../services/documentStore';
import { UploadZone, DocumentRow } from '../components/HRDocuments';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { personnelStore, type PersonnelAgent } from '../../fleet/services/personnelStore';
import { auditService } from '../../../shared/services/auditService';

interface FolderDef {
  id: CompanyDocCategory;
  label: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  iconBg: string;
  icon: React.ReactNode;
  adminOnly: boolean;
  sensitiveOnly?: boolean;
  subFolders?: string[];
}

const EMPLOYEE_SECTIONS: Array<{
  id: EmployeeDossierSection;
  label: string;
  description: string;
}> = [
  {
    id: 'État Civil',
    label: 'État Civil',
    description: "Pièces d'identité, permis, mariage, naissances, CNI conjoint",
  },
  {
    id: 'Administratif & RH',
    label: 'Administratif & RH',
    description: 'Contrat de travail, DMT, attestations RH',
  },
  {
    id: 'Paie',
    label: 'Paie',
    description: 'Archive des bulletins de salaire PDF',
  },
  {
    id: 'Discipline',
    label: 'Discipline',
    description: 'Sanctions, avertissements, mises a pied, explications',
  },
];

const FOLDERS: FolderDef[] = [
  {
    id: 'Juridique & Statuts',
    label: 'Juridique & Statuts',
    description: 'RCCM, NINEA, statuts de la societe, actes notaries',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    iconBg: 'bg-purple-100',
    icon: <Scale className="h-6 w-6 text-purple-600" />,
    adminOnly: true,
    subFolders: ['RCCM', 'NINEA', 'Statuts', 'Actes'],
  },
  {
    id: 'Modèles de Documents',
    label: 'Modèles de Documents',
    description: 'Modeles de contrats, fiches operation, attestations',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    iconBg: 'bg-green-100',
    icon: <BookOpen className="h-6 w-6 text-green-600" />,
    adminOnly: false,
    subFolders: ['Contrats', 'Fiches Operation', 'Attestations', 'Courriers'],
  },
  {
    id: 'Assurances & Taxes',
    label: 'Assurances & Taxes',
    description: "Quittances, contrats d'assurance flotte, declarations fiscales",
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    iconBg: 'bg-orange-100',
    icon: <ShieldCheck className="h-6 w-6 text-orange-600" />,
    adminOnly: true,
    subFolders: ['Quittances', 'Assurance Flotte', 'Declarations', 'Taxes'],
  },
  {
    id: 'Dossiers Employés',
    label: 'Dossiers Employes',
    description: 'Dossiers personnels sensibles generes automatiquement par employe',
    color: 'text-sky-700',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    iconBg: 'bg-sky-100',
    icon: <Users className="h-6 w-6 text-sky-600" />,
    adminOnly: true,
    sensitiveOnly: true,
    subFolders: EMPLOYEE_SECTIONS.map((s) => s.label),
  },
];

function toDisplayName(agent: PersonnelAgent): string {
  return `${agent.firstName} ${agent.lastName}`.trim();
}

function asHRRole(role: string, fonction: string): boolean {
  const scope = `${role} ${fonction}`.toLowerCase();
  return (
    scope.includes('rh') ||
    scope.includes('ressources humaines') ||
    scope.includes('human resources')
  );
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function DocumentsEntreprisePage() {
  const { user, isAdmin } = useAuth();
  const isManager = isAdmin || user?.role === 'Manager' || user?.role === 'country_manager';
  const hasSensitiveAccess = isAdmin || asHRRole(user?.role || '', user?.fonction || '');

  const [activeFolder, setActiveFolder] = useState<CompanyDocCategory | null>(null);
  const [docs, setDocs] = useState<CompanyDocument[]>(() => companyDocStore.getAll());
  const [employees, setEmployees] = useState<PersonnelAgent[]>(() => personnelStore.load());
  const [showUpload, setShowUpload] = useState(false);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<EmployeeDossierSection>('État Civil');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [documentSearch, setDocumentSearch] = useState('');

  const reloadDocs = () => setDocs(companyDocStore.getAll());

  useEffect(() => {
    const onPersonnelUpdated = () => setEmployees(personnelStore.load());
    window.addEventListener('personnel:updated', onPersonnelUpdated);
    return () => window.removeEventListener('personnel:updated', onPersonnelUpdated);
  }, []);

  useEffect(() => {
    if (activeFolder !== 'Dossiers Employés') return;
    if (employees.length === 0) {
      setSelectedEmployeeId('');
      return;
    }
    if (!selectedEmployeeId || !employees.some((e) => e.id === selectedEmployeeId)) {
      setSelectedEmployeeId(employees[0].id);
    }
  }, [activeFolder, employees, selectedEmployeeId]);

  const folderDef = activeFolder ? FOLDERS.find((f) => f.id === activeFolder) : null;

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedEmployeeId) || null,
    [employees, selectedEmployeeId]
  );

  const folderDocs = activeFolder ? docs.filter((d) => d.category === activeFolder) : [];

  const selectedEmployeeSectionDocs = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return docs
      .filter(
        (d) =>
          d.category === 'Dossiers Employés' &&
          d.employeeId === selectedEmployeeId &&
          d.section === selectedSection
      )
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }, [docs, selectedEmployeeId, selectedSection]);

  const filteredEmployees = useMemo(() => {
    const q = normalizeText(employeeSearch.trim());
    const sorted = employees
      .slice()
      .sort((a, b) => toDisplayName(a).localeCompare(toDisplayName(b), 'fr'));
    if (!q) return sorted;
    return sorted.filter((agent) => {
      const target = normalizeText(
        `${toDisplayName(agent)} ${agent.matricule || ''} ${agent.role || ''}`
      );
      return target.includes(q);
    });
  }, [employees, employeeSearch]);

  const filteredSectionDocs = useMemo(() => {
    const q = normalizeText(documentSearch.trim());
    if (!q) return selectedEmployeeSectionDocs;
    return selectedEmployeeSectionDocs.filter((doc) => {
      const target = normalizeText(
        `${doc.name} ${doc.description || ''} ${doc.employeeName || ''}`
      );
      return target.includes(q);
    });
  }, [selectedEmployeeSectionDocs, documentSearch]);

  const canAccessFolder = (f: FolderDef) => {
    if (f.sensitiveOnly) return hasSensitiveAccess;
    if (f.adminOnly) return isManager;
    return true;
  };

  const canUploadInCurrentFolder =
    activeFolder === 'Dossiers Employés' ? hasSensitiveAccess : isManager;

  const handleUpload = async (file: File) => {
    if (!activeFolder) return;
    const dataUrl = await readFileAsDataUrl(file);

    if (activeFolder === 'Dossiers Employés') {
      if (!selectedEmployee) {
        throw new Error('Aucun employe selectionne.');
      }
      const created = companyDocStore.add({
        name: file.name,
        category: 'Dossiers Employés',
        employeeId: selectedEmployee.id,
        employeeName: toDisplayName(selectedEmployee),
        section: selectedSection,
        fileType: file.type,
        fileSize: file.size,
        dataUrl,
        uploadedBy: user?.id || 'unknown',
      });

      auditService.log({
        userId: user?.id || 'system',
        userName: user?.fullName || 'System',
        userRole: user?.role || '',
        action: 'create',
        module: 'rh',
        entity: 'EmployeeDossierDocument',
        entityId: created.id,
        description: `Upload dossier employe: ${toDisplayName(selectedEmployee)} / ${selectedSection} / ${file.name}`,
        oldValue: null,
        newValue: {
          employeeId: selectedEmployee.id,
          employeeName: toDisplayName(selectedEmployee),
          section: selectedSection,
          fileName: file.name,
        },
        severity: 'high',
      });
    } else {
      companyDocStore.add({
        name: file.name,
        category: activeFolder,
        fileType: file.type,
        fileSize: file.size,
        dataUrl,
        uploadedBy: user?.id || 'unknown',
      });
    }

    reloadDocs();
    setShowUpload(false);
  };

  const logDossierPreview = (doc: CompanyDocument) => {
    if (doc.category !== 'Dossiers Employés') return;
    auditService.log({
      userId: user?.id || 'system',
      userName: user?.fullName || 'System',
      userRole: user?.role || '',
      action: 'view',
      module: 'rh',
      entity: 'EmployeeDossierDocument',
      entityId: doc.id,
      description: `Apercu dossier employe: ${doc.employeeName || doc.employeeId || 'Inconnu'} / ${doc.section || 'N/A'} / ${doc.name}`,
      oldValue: null,
      newValue: {
        employeeId: doc.employeeId,
        employeeName: doc.employeeName,
        section: doc.section,
        fileName: doc.name,
      },
      severity: 'medium',
    });
  };

  const deleteEmployeeDossierDoc = (doc: CompanyDocument) => {
    companyDocStore.remove(doc.id);
    auditService.log({
      userId: user?.id || 'system',
      userName: user?.fullName || 'System',
      userRole: user?.role || '',
      action: 'delete',
      module: 'rh',
      entity: 'EmployeeDossierDocument',
      entityId: doc.id,
      description: `Suppression dossier employe: ${doc.employeeName || doc.employeeId || 'Inconnu'} / ${doc.section || 'N/A'} / ${doc.name}`,
      oldValue: {
        employeeId: doc.employeeId,
        employeeName: doc.employeeName,
        section: doc.section,
        fileName: doc.name,
      },
      newValue: null,
      severity: 'critical',
    });
    reloadDocs();
  };

  if (!activeFolder) {
    return (
      <div className="min-h-screen w-full">
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Documents Entreprise</h1>
              <p className="text-sm text-gray-300">
                IVOS SARL - stockage securise des fichiers globaux
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {FOLDERS.map((f) => {
            const accessible = canAccessFolder(f);
            const count = docs.filter((d) => d.category === f.id).length;
            const employeeCount = f.id === 'Dossiers Employés' ? employees.length : 0;
            return (
              <div key={f.id} className={`${f.bg} border ${f.border} rounded-2xl p-4`}>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-7 w-7 ${f.iconBg} flex items-center justify-center rounded-lg`}
                  >
                    {f.icon}
                  </div>
                  <span className={`text-xs font-semibold ${f.color}`}>{f.label}</span>
                  {(f.adminOnly || f.sensitiveOnly) && (
                    <Lock className="ml-auto h-3 w-3 text-amber-500" />
                  )}
                </div>
                <p className={`mt-2 text-2xl font-bold ${accessible ? f.color : 'text-gray-300'}`}>
                  {accessible ? count : '-'}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {f.id === 'Dossiers Employés'
                    ? `${employeeCount} employe${employeeCount > 1 ? 's' : ''}`
                    : `document${count !== 1 ? 's' : ''}`}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {FOLDERS.map((f) => {
            const accessible = canAccessFolder(f);
            const count = docs.filter((d) => d.category === f.id).length;
            return (
              <button
                key={f.id}
                onClick={() => accessible && setActiveFolder(f.id)}
                disabled={!accessible}
                className={`group rounded-2xl border-2 p-6 text-left transition-all ${
                  accessible
                    ? `${f.bg} ${f.border} cursor-pointer hover:scale-[1.02] hover:shadow-lg`
                    : 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
                }`}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div
                    className={`h-14 w-14 ${accessible ? f.iconBg : 'bg-gray-100'} flex items-center justify-center rounded-2xl shadow-sm`}
                  >
                    {accessible ? f.icon : <Lock className="h-6 w-6 text-gray-400" />}
                  </div>
                  {(f.adminOnly || f.sensitiveOnly) && (
                    <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
                      <Lock className="h-2.5 w-2.5" /> {f.sensitiveOnly ? 'Admin/RH' : 'Admin'}
                    </span>
                  )}
                </div>

                <h3
                  className={`mb-1 text-base font-bold ${accessible ? f.color : 'text-gray-400'}`}
                >
                  {f.label}
                </h3>
                <p className="mb-4 text-xs leading-relaxed text-gray-500">{f.description}</p>

                {f.subFolders && accessible && (
                  <div className="mb-4 flex flex-wrap gap-1">
                    {f.subFolders.map((sf) => (
                      <span
                        key={sf}
                        className="rounded-full border border-gray-200 bg-white/70 px-2 py-0.5 text-[10px] text-gray-600"
                      >
                        {sf}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FolderOpen className={`h-4 w-4 ${accessible ? f.color : 'text-gray-400'}`} />
                    <span
                      className={`text-sm font-semibold ${accessible ? f.color : 'text-gray-400'}`}
                    >
                      {accessible
                        ? f.id === 'Dossiers Employés'
                          ? `${employees.length} employe${employees.length > 1 ? 's' : ''} • ${count} fichier${count > 1 ? 's' : ''}`
                          : `${count} fichier${count !== 1 ? 's' : ''}`
                        : 'Acces restreint'}
                    </span>
                  </div>
                  {accessible && (
                    <span className={`text-[11px] ${f.color} font-semibold group-hover:underline`}>
                      Ouvrir →
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (activeFolder === 'Dossiers Employés') {
    if (!hasSensitiveAccess) {
      return (
        <div className="min-h-screen w-full">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50 py-20">
            <Lock className="mb-2 h-10 w-10 text-red-400" />
            <p className="text-base font-semibold text-red-700">Acces restreint</p>
            <p className="mt-1 text-sm text-red-500">Reserve aux profils Administrateur ou RH</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen w-full">
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setActiveFolder(null);
                setShowUpload(false);
                setEmployeeSearch('');
                setDocumentSearch('');
              }}
              className="rounded-xl bg-white/80 p-2 transition-colors hover:bg-white"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100">
              <Users className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-sky-700">Dossiers Employes</h1>
              <p className="text-xs text-gray-600">
                Structure obligatoire: Etat Civil, Administratif & RH, Paie, Discipline
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowUpload((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-[#1a1a2e] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#16213e]"
          >
            {showUpload ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showUpload ? 'Annuler' : 'Ajouter un document'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Employes
            </p>
            <div className="relative px-1 pb-2">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Rechercher un employe..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>
            <div className="max-h-[70vh] space-y-1.5 overflow-y-auto pr-1">
              {filteredEmployees.map((agent) => {
                const active = selectedEmployeeId === agent.id;
                const count = docs.filter(
                  (d) => d.category === 'Dossiers Employés' && d.employeeId === agent.id
                ).length;
                return (
                  <button
                    key={agent.id}
                    onClick={() => {
                      setSelectedEmployeeId(agent.id);
                      setShowUpload(false);
                    }}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      active
                        ? 'border-sky-200 bg-sky-50 text-sky-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="truncate text-sm font-semibold">{toDisplayName(agent)}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500">
                      {count} fichier{count > 1 ? 's' : ''}
                    </p>
                  </button>
                );
              })}
              {filteredEmployees.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-gray-400">
                  Aucun employe trouve
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">
                {selectedEmployee ? toDisplayName(selectedEmployee) : 'Aucun employe selectionne'}
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Le dossier personnel est cree automatiquement et securise.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {EMPLOYEE_SECTIONS.map((section) => {
                  const active = selectedSection === section.id;
                  const sectionCount = selectedEmployeeId
                    ? docs.filter(
                        (d) =>
                          d.category === 'Dossiers Employés' &&
                          d.employeeId === selectedEmployeeId &&
                          d.section === section.id
                      ).length
                    : 0;
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        setSelectedSection(section.id);
                        setShowUpload(false);
                      }}
                      className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                        active
                          ? 'border-sky-200 bg-sky-50 font-semibold text-sky-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{section.label}</span>
                      <span className="ml-2 text-xs text-gray-400">{sectionCount}</span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-xs text-gray-500">
                {EMPLOYEE_SECTIONS.find((s) => s.id === selectedSection)?.description}
              </p>

              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={documentSearch}
                  onChange={(e) => setDocumentSearch(e.target.value)}
                  placeholder="Rechercher un document dans ce sous-dossier..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>
            </div>

            {showUpload && canUploadInCurrentFolder && selectedEmployee && (
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-sky-700">
                  <Upload className="h-4 w-4" />
                  Ajouter dans « {selectedSection} » pour {toDisplayName(selectedEmployee)}
                </p>
                <UploadZone onUpload={handleUpload} accept=".pdf,image/*" />
              </div>
            )}

            {filteredSectionDocs.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  <div className="w-9 shrink-0" />
                  <div className="flex-1">Nom du fichier</div>
                  <div className="hidden w-40 text-center sm:block">Date d'ajout</div>
                  <div className="w-32 text-right">Action</div>
                </div>
                <div className="space-y-1 divide-y divide-gray-50 p-2">
                  {filteredSectionDocs.map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      canDelete={hasSensitiveAccess}
                      onPreview={() => logDossierPreview(doc)}
                      onDelete={() => deleteEmployeeDossierDoc(doc)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-14 shadow-sm">
                <Folder className="mb-3 h-12 w-12 text-gray-200" />
                <p className="text-base font-semibold text-gray-400">
                  {documentSearch.trim()
                    ? 'Aucun document ne correspond a la recherche'
                    : 'Aucun document dans ce sous-dossier'}
                </p>
                <p className="mt-1 text-sm text-gray-300">
                  {selectedEmployee
                    ? `${selectedSection} - ${toDisplayName(selectedEmployee)}`
                    : 'Selectionnez un employe'}
                </p>
                {selectedEmployee && (
                  <button
                    onClick={() => setShowUpload(true)}
                    className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" /> Ajouter un document
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      <div
        className={`${folderDef?.bg} border ${folderDef?.border} mb-6 flex items-center justify-between rounded-2xl p-5`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setActiveFolder(null);
              setShowUpload(false);
            }}
            className="rounded-xl bg-white/60 p-2 transition-colors hover:bg-white"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div
            className={`h-11 w-11 ${folderDef?.iconBg} flex items-center justify-center rounded-xl`}
          >
            {folderDef?.icon}
          </div>
          <div>
            <h1 className={`text-xl font-bold ${folderDef?.color}`}>{folderDef?.label}</h1>
            <p className="text-xs text-gray-500">{folderDef?.description}</p>
          </div>
        </div>
        {canUploadInCurrentFolder && (
          <button
            onClick={() => setShowUpload((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-[#1a1a2e] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#16213e]"
          >
            {showUpload ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showUpload ? 'Annuler' : 'Ajouter un document'}
          </button>
        )}
      </div>

      {showUpload && canUploadInCurrentFolder && (
        <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-700">
            <Upload className="h-4 w-4" /> Ajouter dans « {activeFolder} »
          </p>
          <UploadZone onUpload={handleUpload} accept=".pdf,image/*" />
        </div>
      )}

      {folderDocs.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            <div className="w-9 shrink-0" />
            <div className="flex-1">Nom du fichier</div>
            <div className="hidden w-40 text-center sm:block">Date d'ajout</div>
            <div className="w-32 text-right">Action</div>
          </div>
          <div className="space-y-1 divide-y divide-gray-50 p-2">
            {folderDocs.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                canDelete={canUploadInCurrentFolder}
                onDelete={() => {
                  companyDocStore.remove(doc.id);
                  reloadDocs();
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 shadow-sm">
          <Folder className="mb-3 h-14 w-14 text-gray-200" />
          <p className="text-base font-semibold text-gray-400">Ce dossier est vide</p>
          <p className="mt-1 text-sm text-gray-300">Aucun fichier dans « {activeFolder} »</p>
          {canUploadInCurrentFolder && (
            <button
              onClick={() => setShowUpload(true)}
              className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Ajouter un document
            </button>
          )}
        </div>
      )}
    </div>
  );
}
