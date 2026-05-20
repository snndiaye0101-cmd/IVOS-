import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Database,
  Edit3,
  Plus,
  Trash2,
  Search,
  Check,
  X,
  DollarSign,
  Tag,
  Ruler,
  FolderOpen,
  Clock,
} from 'lucide-react';
import { formatCleanAmount } from '@/shared/utils/formatAmount';
import {
  getUniteFacturation,
  addUniteFacturation,
  updateUniteFacturation,
  deleteUniteFacturation,
  CHANGE_EVENT,
} from './uniteFacturationService';

export interface UniteFacturationItem {
  id: number;
  type: string;
  unit: string;
  price: number;
  categorie?: string;
  updatedAt?: string;
}

const UNITS = ['Tonne', 'm³', 'Forfait', 'Heure', 'Fût', 'kg', 'L'];
const CATEGORIES = ['Exploitation', 'Opérations Spéciales', 'Maintenance'];

function fmtPrice(n: number) {
  return formatCleanAmount(n, 'FCFA');
}
function fmtDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
function formatInputPrice(value: string): string {
  const num = value.replace(/\D/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('fr-FR');
}
function parseInputPrice(value: string): number {
  return Number(value.replace(/\s/g, '').replace(/\./g, '')) || 0;
}

const UniteFacturation: React.FC = () => {
  const [rows, setRows] = useState<UniteFacturationItem[]>(getUniteFacturation());
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('');

  // Form state
  const [newType, setNewType] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCat, setNewCat] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editType, setEditType] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCat, setEditCat] = useState('');

  // Delete confirm
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const reload = useCallback(() => setRows([...getUniteFacturation()]), []);
  useEffect(() => {
    const h = () => reload();
    window.addEventListener(CHANGE_EVENT, h);
    return () => window.removeEventListener(CHANGE_EVENT, h);
  }, [reload]);

  // Filtered rows
  const filtered = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.type.toLowerCase().includes(q) || r.unit.toLowerCase().includes(q)
      );
    }
    if (catFilter) list = list.filter((r) => r.categorie === catFilter);
    return list;
  }, [rows, search, catFilter]);

  // Stats
  const stats = useMemo(
    () => ({
      total: rows.length,
      avgPrice:
        rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.price, 0) / rows.length) : 0,
      categories: new Set(rows.map((r) => r.categorie).filter(Boolean)).size,
    }),
    [rows]
  );

  // Add
  const handleAdd = () => {
    const price = parseInputPrice(newPrice);
    if (!newType.trim() || !newUnit || price <= 0) return;
    addUniteFacturation({
      type: newType.trim(),
      unit: newUnit,
      price,
      categorie: newCat || undefined,
    });
    reload();
    setNewType('');
    setNewUnit('');
    setNewPrice('');
    setNewCat('');
  };

  // Edit
  const startEdit = (r: UniteFacturationItem) => {
    setEditingId(r.id);
    setEditType(r.type);
    setEditUnit(r.unit);
    setEditPrice(r.price.toLocaleString('fr-FR'));
    setEditCat(r.categorie || '');
  };
  const cancelEdit = () => {
    setEditingId(null);
  };
  const saveEdit = () => {
    if (!editingId) return;
    const price = parseInputPrice(editPrice);
    if (!editType.trim() || !editUnit || price <= 0) return;
    updateUniteFacturation(editingId, {
      type: editType.trim(),
      unit: editUnit,
      price,
      categorie: editCat || undefined,
    });
    reload();
    setEditingId(null);
  };

  // Delete
  const confirmDelete = (id: number) => {
    deleteUniteFacturation(id);
    reload();
    setPendingDeleteId(null);
  };

  const canAdd = newType.trim() && newUnit && parseInputPrice(newPrice) > 0;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1a1a2e] via-indigo-900 to-indigo-800 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/15 p-2.5 backdrop-blur-sm">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Unité de Facturation</h1>
              <p className="mt-0.5 text-sm text-indigo-200">
                Référentiel de taxation — Base de KIGNABOUR
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="rounded-xl bg-white/10 px-4 py-2 backdrop-blur-sm">
              <span className="text-xs text-indigo-300">Éléments</span>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-2 backdrop-blur-sm">
              <span className="text-xs text-indigo-300">Prix moyen</span>
              <p className="text-xl font-bold">{fmtPrice(stats.avgPrice)}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-2 backdrop-blur-sm">
              <span className="text-xs text-indigo-300">Catégories</span>
              <p className="text-xl font-bold">{stats.categories}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Card */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-700">
          <Plus className="h-4 w-4 text-indigo-500" /> Nouvel Élément de Facturation
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          {/* Désignation */}
          <div className="lg:col-span-2">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Désignation de la Prestation / Déchet
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
              <input
                type="text"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canAdd && handleAdd()}
                placeholder="Ex: Pompage, DASRI, Boues pétrolières..."
                className="w-full rounded-xl bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-800 placeholder-gray-300 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>
          {/* Unité */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Unité de mesure
            </label>
            <div className="relative">
              <Ruler className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
              <select
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-800 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="">Sélectionner</option>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* Prix */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Prix Unitaire (FCFA)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
              <input
                type="text"
                inputMode="numeric"
                value={newPrice}
                onChange={(e) => setNewPrice(formatInputPrice(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && canAdd && handleAdd()}
                placeholder="0"
                className="w-full rounded-xl bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-800 placeholder-gray-300 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>
          {/* Catégorie */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Catégorie <span className="text-gray-300">(optionnel)</span>
            </label>
            <div className="relative">
              <FolderOpen className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
              <select
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-800 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="">Aucune</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleAdd}
            disabled={!canAdd}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition-all active:scale-[0.97] ${
              canAdd
                ? 'bg-[#1a1a2e] text-white hover:bg-[#2a2a4e] hover:shadow-md'
                : 'cursor-not-allowed bg-gray-100 text-gray-300'
            }`}
          >
            <Plus className="h-4 w-4" /> Ajouter au référentiel
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-4 shadow-sm md:flex-row">
        <div className="relative w-full flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une prestation, un type de déchet..."
            className="w-full rounded-xl bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-800 placeholder-gray-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCatFilter('')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${!catFilter ? 'bg-[#1a1a2e] text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            Tous
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCatFilter(catFilter === c ? '' : c)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${catFilter === c ? 'bg-[#1a1a2e] text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="whitespace-nowrap text-xs font-medium text-gray-400">
          {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="px-6 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Prestation / Déchet
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Unité
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Prix Unitaire
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Catégorie
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Dernière MAJ
                </th>
                <th className="px-6 py-3.5 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                    {search || catFilter
                      ? 'Aucun résultat pour cette recherche'
                      : 'Aucun élément dans le référentiel'}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const isEditing = editingId === row.id;
                  const isDeleting = pendingDeleteId === row.id;

                  if (isEditing) {
                    return (
                      <tr key={row.id} className="bg-indigo-50/40">
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={editType}
                            onChange={(e) => setEditType(e.target.value)}
                            className="w-full rounded-lg bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <select
                            value={editUnit}
                            onChange={(e) => setEditUnit(e.target.value)}
                            className="cursor-pointer appearance-none rounded-lg bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          >
                            {UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={editPrice}
                            onChange={(e) => setEditPrice(formatInputPrice(e.target.value))}
                            className="w-32 rounded-lg bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <select
                            value={editCat}
                            onChange={(e) => setEditCat(e.target.value)}
                            className="cursor-pointer appearance-none rounded-lg bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          >
                            <option value="">Aucune</option>
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-3 text-xs text-gray-400">—</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={saveEdit}
                              className="rounded-lg bg-green-500 p-1.5 text-white transition-colors hover:bg-green-600"
                              title="Enregistrer"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="rounded-lg bg-gray-200 p-1.5 text-gray-500 transition-colors hover:bg-gray-300"
                              title="Annuler"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={row.id} className="group transition-colors hover:bg-gray-50/70">
                      <td className="px-6 py-3.5">
                        <p className="text-sm font-semibold text-gray-800">{row.type}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                          {row.unit}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="text-sm font-bold text-gray-800">
                          {fmtPrice(row.price)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        {row.categorie ? (
                          <span
                            className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-bold ${
                              row.categorie === 'Exploitation'
                                ? 'bg-blue-50 text-blue-700'
                                : row.categorie === 'Opérations Spéciales'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {row.categorie}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Clock className="h-3 w-3" />
                          {fmtDate(row.updatedAt)}
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        {isDeleting ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="mr-1 text-[10px] font-semibold text-red-500">
                              Supprimer ?
                            </span>
                            <button
                              onClick={() => confirmDelete(row.id)}
                              className="rounded-lg bg-red-500 p-1.5 text-white transition-colors hover:bg-red-600"
                              title="Confirmer"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setPendingDeleteId(null)}
                              className="rounded-lg bg-gray-200 p-1.5 text-gray-500 transition-colors hover:bg-gray-300"
                              title="Annuler"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => startEdit(row)}
                              className="rounded-lg bg-gray-100 p-1.5 text-gray-500 transition-colors hover:bg-indigo-100 hover:text-indigo-600"
                              title="Modifier"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setPendingDeleteId(row.id)}
                              className="rounded-lg bg-gray-100 p-1.5 text-gray-500 transition-colors hover:bg-red-100 hover:text-red-600"
                              title="Supprimer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UniteFacturation;
