import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, Edit2, Save } from 'lucide-react';
import {
  usePortals,
  useCreatePortal,
  useUpdatePortal,
  useDeletePortal,
  type Portal,
} from '../../personnel/services/portalsService';
import { useMemo } from 'react';

interface Props {
  siteId: string;
  siteName: string;
  onClose: () => void;
}

export default function PortalsConfigDrawer({ siteId, siteName, onClose }: Props) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const { data: portals = [], isLoading } = usePortals(siteId);
  const createPortal = useCreatePortal();
  const updatePortal = useUpdatePortal();
  const deletePortal = useDeletePortal();

  useEffect(() => {
    // no-op: react-query keeps portals up to date
  }, [siteId]);

  async function handleCreate() {
    if (!newName.trim()) return;
    await createPortal.mutateAsync({
      subsidiary_id: siteId,
      name: newName.trim(),
      terminal_id: `TERMINAL_${siteId}_${Date.now()}`,
      status: 'ACTIVE',
    });
    setNewName('');
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce portail ?')) return;
    await deletePortal.mutateAsync({ id, subsidiary_id: siteId });
  }

  function startEdit(p: Portal) {
    setEditingId(p.id);
    setEditingName(p.name);
  }

  async function saveEdit() {
    if (!editingId) return;
    await updatePortal.mutateAsync({ id: editingId, name: editingName });
    setEditingId(null);
    setEditingName('');
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-white p-6 shadow-2xl">
        <button
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-700"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="mb-2 text-xl font-bold">⚙️ Configurer les Portails / Bornes — {siteName}</h2>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Ajouter un portail
          </label>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 rounded-lg border px-3 py-2"
              placeholder="Nom du portail (ex. PORTE 1)"
            />
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white"
            >
              {' '}
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {portals.length === 0 && (
            <div className="text-sm text-gray-500">Aucun portail configuré pour ce site.</div>
          )}
          <ul className="space-y-2">
            {portals.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  {editingId === p.id ? (
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="rounded border px-2 py-1"
                    />
                  ) : (
                    <div className="font-semibold">{p.name}</div>
                  )}
                  <div className="text-xs text-gray-500">
                    Terminal ID:{' '}
                    <span className="font-mono">
                      {(p as any).terminal_id || (p as any).terminalId}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {editingId === p.id ? (
                    <button onClick={saveEdit} className="rounded bg-emerald-500 p-2 text-white">
                      <Save className="h-4 w-4" />
                    </button>
                  ) : (
                    <button onClick={() => startEdit(p)} className="rounded border bg-white p-2">
                      <Edit2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="rounded border bg-white p-2 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4">
          <button onClick={onClose} className="w-full rounded-xl bg-gray-100 px-4 py-2">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
