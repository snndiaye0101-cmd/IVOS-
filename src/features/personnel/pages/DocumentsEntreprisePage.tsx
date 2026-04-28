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
    icon: <Scale className="w-6 h-6 text-purple-600" />,
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
    icon: <BookOpen className="w-6 h-6 text-green-600" />,
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
    icon: <ShieldCheck className="w-6 h-6 text-orange-600" />,
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
    icon: <Users className="w-6 h-6 text-sky-600" />,
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
  return scope.includes('rh') || scope.includes('ressources humaines') || scope.includes('human resources');
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
    [employees, selectedEmployeeId],
  );

  const folderDocs = activeFolder ? docs.filter((d) => d.category === activeFolder) : [];

  const selectedEmployeeSectionDocs = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return docs
      .filter(
        (d) =>
          d.category === 'Dossiers Employés' &&
          d.employeeId === selectedEmployeeId &&
          d.section === selectedSection,
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
      const target = normalizeText(`${toDisplayName(agent)} ${agent.matricule || ''} ${agent.role || ''}`);
      return target.includes(q);
    });
  }, [employees, employeeSearch]);

  const filteredSectionDocs = useMemo(() => {
    const q = normalizeText(documentSearch.trim());
    if (!q) return selectedEmployeeSectionDocs;
    return selectedEmployeeSectionDocs.filter((doc) => {
      const target = normalizeText(`${doc.name} ${doc.description || ''} ${doc.employeeName || ''}`);
      return target.includes(q);
    });
  }, [selectedEmployeeSectionDocs, documentSearch]);

  const canAccessFolder = (f: FolderDef) => {
    if (f.sensitiveOnly) return hasSensitiveAccess;
    if (f.adminOnly) return isManager;
    return true;
  };

  const canUploadInCurrentFolder = activeFolder === 'Dossiers Employés' ? hasSensitiveAccess : isManager;

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
      <div className="w-full min-h-screen">
        <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-6 mb-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Documents Entreprise</h1>
              <p className="text-sm text-gray-300">IVOS SARL - stockage securise des fichiers globaux</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {FOLDERS.map((f) => {
            const accessible = canAccessFolder(f);
            const count = docs.filter((d) => d.category === f.id).length;
            const employeeCount = f.id === 'Dossiers Employés' ? employees.length : 0;
            return (
              <div key={f.id} className={`${f.bg} border ${f.border} rounded-2xl p-4`}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 ${f.iconBg} rounded-lg flex items-center justify-center`}>{f.icon}</div>
                  <span className={`text-xs font-semibold ${f.color}`}>{f.label}</span>
                  {(f.adminOnly || f.sensitiveOnly) && <Lock className="w-3 h-3 text-amber-500 ml-auto" />}
                </div>
                <p className={`text-2xl font-bold mt-2 ${accessible ? f.color : 'text-gray-300'}`}>{accessible ? count : '-'}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {f.id === 'Dossiers Employés'
                    ? `${employeeCount} employe${employeeCount > 1 ? 's' : ''}`
                    : `document${count !== 1 ? 's' : ''}`}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {FOLDERS.map((f) => {
            const accessible = canAccessFolder(f);
            const count = docs.filter((d) => d.category === f.id).length;
            return (
              <button
                key={f.id}
                onClick={() => accessible && setActiveFolder(f.id)}
                disabled={!accessible}
                className={`text-left rounded-2xl border-2 p-6 transition-all group ${
                  accessible
                    ? `${f.bg} ${f.border} hover:shadow-lg hover:scale-[1.02] cursor-pointer`
                    : 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 ${accessible ? f.iconBg : 'bg-gray-100'} rounded-2xl flex items-center justify-center shadow-sm`}>
                    {accessible ? f.icon : <Lock className="w-6 h-6 text-gray-400" />}
                  </div>
                  {(f.adminOnly || f.sensitiveOnly) && (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200 font-semibold">
                      <Lock className="w-2.5 h-2.5" /> {f.sensitiveOnly ? 'Admin/RH' : 'Admin'}
                    </span>
                  )}
                </div>

                <h3 className={`text-base font-bold mb-1 ${accessible ? f.color : 'text-gray-400'}`}>{f.label}</h3>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">{f.description}</p>

                {f.subFolders && accessible && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {f.subFolders.map((sf) => (
                      <span key={sf} className="text-[10px] px-2 py-0.5 bg-white/70 rounded-full text-gray-600 border border-gray-200">
                        {sf}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FolderOpen className={`w-4 h-4 ${accessible ? f.color : 'text-gray-400'}`} />
                    <span className={`text-sm font-semibold ${accessible ? f.color : 'text-gray-400'}`}>
                      {accessible
                        ? f.id === 'Dossiers Employés'
                          ? `${employees.length} employe${employees.length > 1 ? 's' : ''} • ${count} fichier${count > 1 ? 's' : ''}`
                          : `${count} fichier${count !== 1 ? 's' : ''}`
                        : 'Acces restreint'}
                    </span>
                  </div>
                  {accessible && <span className={`text-[11px] ${f.color} font-semibold group-hover:underline`}>Ouvrir →</span>}
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
        <div className="w-full min-h-screen">
          <div className="flex flex-col items-center justify-center py-20 bg-red-50 rounded-2xl border border-red-100">
            <Lock className="w-10 h-10 text-red-400 mb-2" />
            <p className="text-base font-semibold text-red-700">Acces restreint</p>
            <p className="text-sm text-red-500 mt-1">Reserve aux profils Administrateur ou RH</p>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full min-h-screen">
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setActiveFolder(null);
                setShowUpload(false);
                setEmployeeSearch('');
                setDocumentSearch('');
              }}
              className="p-2 rounded-xl bg-white/80 hover:bg-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-11 h-11 bg-sky-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-sky-700">Dossiers Employes</h1>
              <p className="text-xs text-gray-600">Structure obligatoire: Etat Civil, Administratif & RH, Paie, Discipline</p>
            </div>
          </div>
          <button
            onClick={() => setShowUpload((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a2e] text-white rounded-xl text-sm font-semibold hover:bg-[#16213e] transition-colors"
          >
            {showUpload ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showUpload ? 'Annuler' : 'Ajouter un document'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold px-2 pb-2">Employes</p>
            <div className="relative px-1 pb-2">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Rechercher un employe..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>
            <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
              {filteredEmployees.map((agent) => {
                  const active = selectedEmployeeId === agent.id;
                  const count = docs.filter(
                    (d) => d.category === 'Dossiers Employés' && d.employeeId === agent.id,
                  ).length;
                  return (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setSelectedEmployeeId(agent.id);
                        setShowUpload(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${
                        active
                          ? 'bg-sky-50 border-sky-200 text-sky-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="text-sm font-semibold truncate">{toDisplayName(agent)}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">{count} fichier{count > 1 ? 's' : ''}</p>
                    </button>
                  );
                })}
              {filteredEmployees.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-gray-400">Aucun employe trouve</div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h2 className="text-lg font-bold text-gray-900">
                {selectedEmployee ? toDisplayName(selectedEmployee) : 'Aucun employe selectionne'}
              </h2>
              <p className="text-xs text-gray-500 mt-1">Le dossier personnel est cree automatiquement et securise.</p>

              <div className="flex flex-wrap gap-2 mt-4">
                {EMPLOYEE_SECTIONS.map((section) => {
                  const active = selectedSection === section.id;
                  const sectionCount = selectedEmployeeId
                    ? docs.filter(
                        (d) =>
                          d.category === 'Dossiers Employés' &&
                          d.employeeId === selectedEmployeeId &&
                          d.section === section.id,
                      ).length
                    : 0;
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        setSelectedSection(section.id);
                        setShowUpload(false);
                      }}
                      className={`px-3 py-2 rounded-xl border text-sm transition-colors ${
                        active
                          ? 'bg-sky-50 border-sky-200 text-sky-700 font-semibold'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{section.label}</span>
                      <span className="ml-2 text-xs text-gray-400">{sectionCount}</span>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-gray-500 mt-3">
                {EMPLOYEE_SECTIONS.find((s) => s.id === selectedSection)?.description}
              </p>

              <div className="relative mt-3">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={documentSearch}
                  onChange={(e) => setDocumentSearch(e.target.value)}
                  placeholder="Rechercher un document dans ce sous-dossier..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>
            </div>

            {showUpload && canUploadInCurrentFolder && selectedEmployee && (
              <div className="bg-sky-50 border border-sky-100 rounded-2xl p-5">
                <p className="text-sm font-semibold text-sky-700 mb-3 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Ajouter dans « {selectedSection} » pour {toDisplayName(selectedEmployee)}
                </p>
                <UploadZone onUpload={handleUpload} accept=".pdf,image/*" />
              </div>
            )}

            {filteredSectionDocs.length > 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                  <div className="w-9 shrink-0" />
                  <div className="flex-1">Nom du fichier</div>
                  <div className="hidden sm:block w-40 text-center">Date d'ajout</div>
                  <div className="w-32 text-right">Action</div>
                </div>
                <div className="divide-y divide-gray-50 p-2 space-y-1">
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
              <div className="flex flex-col items-center justify-center py-14 bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm">
                <Folder className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-base font-semibold text-gray-400">
                  {documentSearch.trim() ? 'Aucun document ne correspond a la recherche' : 'Aucun document dans ce sous-dossier'}
                </p>
                <p className="text-sm text-gray-300 mt-1">
                  {selectedEmployee ? `${selectedSection} - ${toDisplayName(selectedEmployee)}` : 'Selectionnez un employe'}
                </p>
                {selectedEmployee && (
                  <button
                    onClick={() => setShowUpload(true)}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Ajouter un document
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
    <div className="w-full min-h-screen">
      <div className={`${folderDef?.bg} border ${folderDef?.border} rounded-2xl p-5 mb-6 flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setActiveFolder(null);
              setShowUpload(false);
            }}
            className="p-2 rounded-xl bg-white/60 hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className={`w-11 h-11 ${folderDef?.iconBg} rounded-xl flex items-center justify-center`}>{folderDef?.icon}</div>
          <div>
            <h1 className={`text-xl font-bold ${folderDef?.color}`}>{folderDef?.label}</h1>
            <p className="text-xs text-gray-500">{folderDef?.description}</p>
          </div>
        </div>
        {canUploadInCurrentFolder && (
          <button
            onClick={() => setShowUpload((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a2e] text-white rounded-xl text-sm font-semibold hover:bg-[#16213e] transition-colors"
          >
            {showUpload ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showUpload ? 'Annuler' : 'Ajouter un document'}
          </button>
        )}
      </div>

      {showUpload && canUploadInCurrentFolder && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-5">
          <p className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
            <Upload className="w-4 h-4" /> Ajouter dans « {activeFolder} »
          </p>
          <UploadZone onUpload={handleUpload} accept=".pdf,image/*" />
        </div>
      )}

      {folderDocs.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
            <div className="w-9 shrink-0" />
            <div className="flex-1">Nom du fichier</div>
            <div className="hidden sm:block w-40 text-center">Date d'ajout</div>
            <div className="w-32 text-right">Action</div>
          </div>
          <div className="divide-y divide-gray-50 p-2 space-y-1">
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
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm">
          <Folder className="w-14 h-14 text-gray-200 mb-3" />
          <p className="text-base font-semibold text-gray-400">Ce dossier est vide</p>
          <p className="text-sm text-gray-300 mt-1">Aucun fichier dans « {activeFolder} »</p>
          {canUploadInCurrentFolder && (
            <button
              onClick={() => setShowUpload(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Ajouter un document
            </button>
          )}
        </div>
      )}
    </div>
  );
}
