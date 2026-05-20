import React, { useState, useRef, useCallback } from 'react';
import {
  FolderOpen,
  Folder,
  Upload,
  Download,
  Trash2,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  Clock,
  Lock,
  Eye,
  Plus,
  X,
  File,
} from 'lucide-react';
import {
  employeeDocStore,
  readFileAsDataUrl,
  formatFileSize,
  downloadDocument,
  type HRDocument,
  type CompanyDocument,
  type DocumentCategory,
} from '../services/documentStore';
import type { PersonnelAgent } from '../../fleet/services/personnelStore';

// ─── Types ────────────────────────────────────────────────────
interface UploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  disabled?: boolean;
}

// ─── Upload Zone (Drag & Drop) ────────────────────────────────
export function UploadZone({ onUpload, accept = '.pdf,image/*', disabled }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE_MB = 5;

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`Fichier trop volumineux (max ${MAX_SIZE_MB} Mo).`);
        return;
      }
      setError(null);
      setUploading(true);
      try {
        await onUpload(file);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erreur lors de l'upload.");
      } finally {
        setUploading(false);
      }
    },
    [onUpload]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        className={`
          relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-all
          ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'}
          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
          ${uploading ? 'pointer-events-none' : ''}
        `}
      >
        {uploading ? (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <p className="text-xs font-medium text-blue-600">Upload en cours…</p>
          </>
        ) : (
          <>
            <Upload className={`h-6 w-6 ${dragging ? 'text-blue-600' : 'text-gray-400'}`} />
            <p className="text-center text-xs text-gray-500">
              <span className="font-semibold text-blue-600">Cliquez</span> ou glissez un fichier ici
            </p>
            <p className="text-[10px] text-gray-400">PDF, Images — max {MAX_SIZE_MB} Mo</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={onFileChange}
        />
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertTriangle className="h-3.5 w-3.5" /> {error}
        </p>
      )}
    </div>
  );
}

// ─── Document Row (file list item) ───────────────────────────
export function DocumentRow({
  doc,
  onDelete,
  canDelete,
  onPreview,
}: {
  doc: HRDocument | CompanyDocument;
  onDelete: () => void;
  canDelete: boolean;
  onPreview?: (doc: HRDocument | CompanyDocument) => void;
}) {
  const isImage = doc.fileType.startsWith('image/');
  const isPdf = doc.fileType === 'application/pdf' || doc.name.toLowerCase().endsWith('.pdf');
  const canPreview = isImage || isPdf;
  const [previewing, setPreviewing] = useState(false);

  const openPreview = () => {
    if (!canPreview) return;
    onPreview?.(doc);
    setPreviewing(true);
  };

  return (
    <>
      <div
        onClick={openPreview}
        className={`group flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 transition-all ${canPreview ? 'cursor-pointer hover:border-blue-200 hover:shadow-sm' : ''}`}
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isImage ? 'bg-emerald-50' : 'bg-red-50'}`}
        >
          {isImage ? (
            <ImageIcon className="h-4 w-4 text-emerald-600" />
          ) : (
            <FileText className="h-4 w-4 text-red-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-800">{doc.name}</p>
          <p className="text-[10px] text-gray-400">{formatFileSize(doc.fileSize)}</p>
        </div>
        <div className="hidden shrink-0 items-center gap-1 text-[11px] text-gray-400 sm:flex">
          <Clock className="h-3 w-3" />
          {new Date(doc.uploadedAt).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </div>
        <div className="ml-2 flex items-center gap-1">
          {canPreview && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openPreview();
              }}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
              title="Aperçu"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              downloadDocument(doc);
            }}
            className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Télécharger</span>
          </button>
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Supprimer ce document ?')) onDelete();
              }}
              className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50"
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {previewing && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewing(false)}
        >
          <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewing(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
            {isImage ? (
              <img src={doc.dataUrl} alt={doc.name} className="w-full rounded-xl shadow-2xl" />
            ) : (
              <iframe
                src={doc.dataUrl}
                title={doc.name}
                className="h-[80vh] w-full rounded-xl bg-white shadow-2xl"
              />
            )}
            <p className="mt-2 text-center text-sm text-white/70">{doc.name}</p>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Category Config ─────────────────────────────────────────
const CATEGORY_CONFIG: Record<
  DocumentCategory,
  {
    icon: React.ReactNode;
    color: string;
    bg: string;
    restricted: boolean;
    description: string;
  }
> = {
  'Contrats & Avenants': {
    icon: <File className="h-4 w-4" />,
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    restricted: true,
    description: 'CDI, CDD, avenants, renouvellements',
  },
  'Parcours Disciplinaire': {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    restricted: true,
    description: 'Avertissements, mises à pied, sanctions',
  },
  'Pièces Administratives': {
    icon: <FileText className="h-4 w-4" />,
    color: 'text-gray-700',
    bg: 'bg-gray-50 border-gray-200',
    restricted: false,
    description: 'Copie CNI, permis, visite médicale, diplômes',
  },
};

interface DossierPersonnelProps {
  agent: PersonnelAgent;
  isAdmin: boolean;
  currentUserId: string;
  isOwnDossier: boolean;
}

export function DossierPersonnel({
  agent,
  isAdmin,
  currentUserId,
  isOwnDossier,
}: DossierPersonnelProps) {
  const [activeCategory, setActiveCategory] = useState<DocumentCategory>('Pièces Administratives');
  const [docs, setDocs] = useState<HRDocument[]>(() => employeeDocStore.getByEmployee(agent.id));
  const [showUpload, setShowUpload] = useState(false);

  const reload = () => setDocs(employeeDocStore.getByEmployee(agent.id));
  const config = CATEGORY_CONFIG[activeCategory];

  const canAccessCategory = (cat: DocumentCategory): boolean => {
    if (CATEGORY_CONFIG[cat].restricted) return isAdmin;
    return isAdmin || isOwnDossier;
  };

  const handleUpload = async (file: File) => {
    const dataUrl = await readFileAsDataUrl(file);
    employeeDocStore.add({
      name: file.name,
      category: activeCategory,
      employeeId: agent.id,
      fileType: file.type,
      fileSize: file.size,
      dataUrl,
      uploadedBy: currentUserId,
    });
    reload();
    setShowUpload(false);
  };

  const categoryDocs = docs.filter((d) => d.category === activeCategory);

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(CATEGORY_CONFIG) as DocumentCategory[]).map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const accessible = canAccessCategory(cat);
          const count = docs.filter((d) => d.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => {
                if (accessible) {
                  setActiveCategory(cat);
                  setShowUpload(false);
                }
              }}
              disabled={!accessible}
              className={`
                flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all
                ${activeCategory === cat ? `${cfg.bg} ${cfg.color} shadow-sm` : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}
                ${!accessible ? 'cursor-not-allowed opacity-40' : ''}
              `}
            >
              {cfg.restricted && <Lock className="h-3 w-3 opacity-60" />}
              {cfg.icon}
              <span>{cat}</span>
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeCategory === cat ? 'bg-white/60' : 'bg-gray-100'}`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {canAccessCategory(activeCategory) ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className={`h-4 w-4 ${config.color}`} />
              <span className="text-sm font-semibold text-gray-700">{activeCategory}</span>
              <span className="text-xs text-gray-400">— {config.description}</span>
              {config.restricted && (
                <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">
                  <Lock className="h-2.5 w-2.5" /> Admin seulement
                </span>
              )}
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowUpload((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
              >
                {showUpload ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {showUpload ? 'Annuler' : 'Ajouter'}
              </button>
            )}
          </div>

          {showUpload && isAdmin && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <UploadZone onUpload={handleUpload} />
            </div>
          )}

          {/* Column headers */}
          {categoryDocs.length > 0 && (
            <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              <div className="w-9 shrink-0" />
              <div className="flex-1">Nom du fichier</div>
              <div className="mr-2 hidden w-36 text-right sm:block">Date d'ajout</div>
              <div className="w-28 text-right">Action</div>
            </div>
          )}

          {categoryDocs.length > 0 ? (
            <div className="space-y-1.5">
              {categoryDocs.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  canDelete={isAdmin}
                  onDelete={() => {
                    employeeDocStore.remove(doc.id);
                    reload();
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10">
              <Folder className="mb-2 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-400">Aucun document dans cette catégorie</p>
              {isAdmin && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  <Plus className="h-3.5 w-3.5" /> Ajouter un document
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50 py-12">
          <Lock className="mb-2 h-8 w-8 text-red-400" />
          <p className="text-sm font-semibold text-red-700">Accès restreint</p>
          <p className="mt-1 text-xs text-red-400">Réservé aux Administrateurs</p>
        </div>
      )}
    </div>
  );
}
