import React, { useState, useRef, useCallback } from 'react';
import {
  FolderOpen, Folder, Upload, Download, Trash2, FileText,
  Image as ImageIcon, AlertTriangle, Clock, Lock, Eye,
  Plus, X, File
} from 'lucide-react';
import {
  employeeDocStore,
  readFileAsDataUrl, formatFileSize, downloadDocument,
  type HRDocument, type CompanyDocument, type DocumentCategory,
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

  const handleFile = useCallback(async (file: File) => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Fichier trop volumineux (max ${MAX_SIZE_MB} Mo).`);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      await onUpload(file);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'upload.');
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [disabled, handleFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all
          ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${uploading ? 'pointer-events-none' : ''}
        `}
      >
        {uploading ? (
          <>
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-blue-600 font-medium">Upload en cours…</p>
          </>
        ) : (
          <>
            <Upload className={`w-6 h-6 ${dragging ? 'text-blue-600' : 'text-gray-400'}`} />
            <p className="text-xs text-gray-500 text-center">
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
          <AlertTriangle className="w-3.5 h-3.5" /> {error}
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
        className={`flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 transition-all group ${canPreview ? 'cursor-pointer hover:border-blue-200 hover:shadow-sm' : ''}`}
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isImage ? 'bg-emerald-50' : 'bg-red-50'}`}>
          {isImage
            ? <ImageIcon className="w-4 h-4 text-emerald-600" />
            : <FileText className="w-4 h-4 text-red-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
          <p className="text-[10px] text-gray-400">{formatFileSize(doc.fileSize)}</p>
        </div>
        <div className="items-center gap-1 text-[11px] text-gray-400 shrink-0 hidden sm:flex">
          <Clock className="w-3 h-3" />
          {new Date(doc.uploadedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
        <div className="flex items-center gap-1 ml-2">
          {canPreview && (
            <button onClick={e => { e.stopPropagation(); openPreview(); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Aperçu">
              <Eye className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); downloadDocument(doc); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Télécharger</span>
          </button>
          {canDelete && (
            <button onClick={e => { e.stopPropagation(); if (window.confirm('Supprimer ce document ?')) onDelete(); }} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors" title="Supprimer">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {previewing && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4" onClick={() => setPreviewing(false)}>
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewing(false)} className="absolute -top-10 right-0 text-white hover:text-gray-300"><X className="w-6 h-6" /></button>
            {isImage ? (
              <img src={doc.dataUrl} alt={doc.name} className="w-full rounded-xl shadow-2xl" />
            ) : (
              <iframe src={doc.dataUrl} title={doc.name} className="h-[80vh] w-full rounded-xl bg-white shadow-2xl" />
            )}
            <p className="text-center text-white/70 text-sm mt-2">{doc.name}</p>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Category Config ─────────────────────────────────────────
const CATEGORY_CONFIG: Record<DocumentCategory, {
  icon: React.ReactNode;
  color: string;
  bg: string;
  restricted: boolean;
  description: string;
}> = {
  'Contrats & Avenants': {
    icon: <File className="w-4 h-4" />,
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    restricted: true,
    description: 'CDI, CDD, avenants, renouvellements',
  },
  'Parcours Disciplinaire': {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    restricted: true,
    description: 'Avertissements, mises à pied, sanctions',
  },
  'Pièces Administratives': {
    icon: <FileText className="w-4 h-4" />,
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

export function DossierPersonnel({ agent, isAdmin, currentUserId, isOwnDossier }: DossierPersonnelProps) {
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

  const categoryDocs = docs.filter(d => d.category === activeCategory);

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(CATEGORY_CONFIG) as DocumentCategory[]).map(cat => {
          const cfg = CATEGORY_CONFIG[cat];
          const accessible = canAccessCategory(cat);
          const count = docs.filter(d => d.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => { if (accessible) { setActiveCategory(cat); setShowUpload(false); } }}
              disabled={!accessible}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all
                ${activeCategory === cat ? `${cfg.bg} ${cfg.color} shadow-sm` : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}
                ${!accessible ? 'opacity-40 cursor-not-allowed' : ''}
              `}
            >
              {cfg.restricted && <Lock className="w-3 h-3 opacity-60" />}
              {cfg.icon}
              <span>{cat}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeCategory === cat ? 'bg-white/60' : 'bg-gray-100'}`}>
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
              <FolderOpen className={`w-4 h-4 ${config.color}`} />
              <span className="text-sm font-semibold text-gray-700">{activeCategory}</span>
              <span className="text-xs text-gray-400">— {config.description}</span>
              {config.restricted && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                  <Lock className="w-2.5 h-2.5" /> Admin seulement
                </span>
              )}
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowUpload(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
              >
                {showUpload ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {showUpload ? 'Annuler' : 'Ajouter'}
              </button>
            )}
          </div>

          {showUpload && isAdmin && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <UploadZone onUpload={handleUpload} />
            </div>
          )}

          {/* Column headers */}
          {categoryDocs.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-1 text-[10px] uppercase tracking-wide text-gray-400 font-semibold border-b border-gray-100">
              <div className="w-9 shrink-0" />
              <div className="flex-1">Nom du fichier</div>
              <div className="hidden sm:block w-36 text-right mr-2">Date d'ajout</div>
              <div className="w-28 text-right">Action</div>
            </div>
          )}

          {categoryDocs.length > 0 ? (
            <div className="space-y-1.5">
              {categoryDocs.map(doc => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  canDelete={isAdmin}
                  onDelete={() => { employeeDocStore.remove(doc.id); reload(); }}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Folder className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">Aucun document dans cette catégorie</p>
              {isAdmin && (
                <button onClick={() => setShowUpload(true)} className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold">
                  <Plus className="w-3.5 h-3.5" /> Ajouter un document
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 bg-red-50 rounded-xl border border-red-100">
          <Lock className="w-8 h-8 text-red-400 mb-2" />
          <p className="text-sm font-semibold text-red-700">Accès restreint</p>
          <p className="text-xs text-red-400 mt-1">Réservé aux Administrateurs</p>
        </div>
      )}
    </div>
  );
}
