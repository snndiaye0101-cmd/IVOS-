import React, { useMemo, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { BookOpen, Save, Plus, Trash2, Search, Edit } from 'lucide-react';

const KEY = 'ivos_clients_reference_v2';
const LEGACY_KEY = 'ivos_clients_reference_v1';

interface ClientRef {
  id: number;
  name: string;
  ninea: string;
  address: string;
  contactName: string;
  phone: string;
  email: string;
}

interface ClientForm {
  name: string;
  ninea: string;
  address: string;
  contactName: string;
  phone: string;
  email: string;
}

const SEED: ClientRef[] = [
  {
    id: 1,
    name: 'SAR',
    ninea: 'SN-2024-001',
    address: 'Zone industrielle, Mbao, Dakar',
    contactName: 'Amadou Diallo',
    phone: '+221 33 879 10 00',
    email: 'contact@sar.sn',
  },
  {
    id: 2,
    name: 'Dangote Cement',
    ninea: 'SN-2024-002',
    address: 'Pout, Thies',
    contactName: 'Ibrahim Sall',
    phone: '+221 33 951 20 00',
    email: 'facturation@dangote.sn',
  },
  {
    id: 3,
    name: 'SOCOCIM',
    ninea: 'SN-2024-003',
    address: 'Rufisque, Dakar',
    contactName: 'Mamadou Ba',
    phone: '+221 33 839 90 00',
    email: 'operations@sococim.sn',
  },
  {
    id: 4,
    name: 'Unilever',
    ninea: 'SN-2024-004',
    address: 'Zone franche industrielle, Dakar',
    contactName: 'Fatou Ndiaye',
    phone: '+221 33 869 50 00',
    email: 'finance@unilever.sn',
  },
];

const EMPTY_FORM: ClientForm = {
  name: '',
  ninea: '',
  address: '',
  contactName: '',
  phone: '',
  email: '',
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function isValidPhone(phone: string): boolean {
  return /^\+?[0-9\s().-]{8,20}$/.test(phone.trim());
}

function cleanPhoneForTelLink(phone: string): string {
  return phone.replace(/[^0-9+]/g, '');
}

function normalizeRow(row: unknown): ClientRef | null {
  const input = (row ?? {}) as Record<string, unknown>;
  const idValue = input.id;
  const id =
    typeof idValue === 'number' && Number.isFinite(idValue)
      ? idValue
      : Date.now() + Math.floor(Math.random() * 1000);

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const ninea = typeof input.ninea === 'string' ? input.ninea.trim() : '';
  const address = typeof input.address === 'string' ? input.address.trim() : '';
  const contactName =
    typeof input.contactName === 'string'
      ? input.contactName.trim()
      : typeof input.contact === 'string'
        ? input.contact.trim()
        : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim() : '';

  if (!name && !ninea && !address && !contactName && !phone && !email) return null;

  return {
    id,
    name,
    ninea,
    address,
    contactName,
    phone,
    email,
  };
}

function parseStorage(raw: string | null): ClientRef[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const normalized = parsed.map(normalizeRow).filter((row): row is ClientRef => row !== null);

    const seen = new Set<number>();
    return normalized.map((row) => {
      if (seen.has(row.id)) {
        return { ...row, id: Date.now() + Math.floor(Math.random() * 1000) };
      }
      seen.add(row.id);
      return row;
    });
  } catch {
    return [];
  }
}

function saveRefs(data: ClientRef[]) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function loadRefs(): ClientRef[] {
  const current = parseStorage(localStorage.getItem(KEY));
  if (current.length > 0) {
    saveRefs(current);
    return current;
  }

  const legacy = parseStorage(localStorage.getItem(LEGACY_KEY));
  if (legacy.length > 0) {
    saveRefs(legacy);
    localStorage.removeItem(LEGACY_KEY);
    return legacy;
  }

  saveRefs(SEED);
  return SEED;
}

export default function ClientsReferencePage() {
  const [refs, setRefs] = useState<ClientRef[]>(loadRefs);
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [addForm, setAddForm] = useState<ClientForm>(EMPTY_FORM);
  const [editClientId, setEditClientId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ClientForm>(EMPTY_FORM);

  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const filtered = refs.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.ninea.toLowerCase().includes(q) ||
      r.address.toLowerCase().includes(q) ||
      r.contactName.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q)
    );
  });

  const ordered = useMemo(
    () => [...filtered].sort((a, b) => a.name.localeCompare(b.name)),
    [filtered]
  );

  function validateClient(form: ClientForm): Record<string, string> {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Le nom du client est requis.';
    if (!form.ninea.trim()) next.ninea = 'Le NINEA est requis.';
    if (!form.address.trim()) next.address = "L'adresse est requise.";
    if (!form.contactName.trim()) next.contactName = 'Le nom du contact est requis.';
    if (!form.phone.trim()) next.phone = 'Le telephone est requis.';
    else if (!isValidPhone(form.phone)) next.phone = 'Format telephone invalide.';
    if (!form.email.trim()) next.email = "L'email est requis.";
    else if (!isValidEmail(form.email)) next.email = 'Format email invalide.';
    return next;
  }

  function openAddModal() {
    setAddForm(EMPTY_FORM);
    setAddErrors({});
    setError('');
    setIsAddModalOpen(true);
  }

  function addClient() {
    const errors = validateClient(addForm);
    setAddErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const next = [...refs, { ...addForm, id: Date.now() }];
    setRefs(next);
    saveRefs(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setIsAddModalOpen(false);
  }

  function openEditModal(client: ClientRef) {
    setEditClientId(client.id);
    setEditForm({
      name: client.name,
      ninea: client.ninea,
      address: client.address,
      contactName: client.contactName,
      phone: client.phone,
      email: client.email,
    });
    setEditErrors({});
    setError('');
    setIsEditModalOpen(true);
  }

  function saveEdit() {
    if (editClientId === null) return;
    const errors = validateClient(editForm);
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const next = refs.map((r) => (r.id === editClientId ? { ...r, ...editForm } : r));
    setRefs(next);
    saveRefs(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setIsEditModalOpen(false);
  }

  function removeRow(id: number) {
    const next = refs.filter((r) => r.id !== id);
    setRefs(next);
    saveRefs(next);
  }

  function handleSave() {
    const hasInvalid = refs.some((r) => !isValidEmail(r.email) || !isValidPhone(r.phone));
    if (hasInvalid) {
      setError('Impossible de sauvegarder: verifiez le format des emails et telephones.');
      setSaved(false);
      return;
    }

    setError('');
    saveRefs(refs);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function formInputClass(hasError?: boolean) {
    return `w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 ${hasError ? 'border-red-300 focus:ring-red-300' : 'border-gray-200 focus:ring-blue-400'}`;
  }

  return (
    <div className="min-h-screen w-full">
      <div className="mb-6 flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
            <BookOpen className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Referentiels Clients</h1>
            <p className="text-sm text-gray-300">
              Annuaire de gestion clients: donnees administratives uniquement
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md transition-all ${saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          <Save className="h-4 w-4" />
          {saved ? 'Enregistre !' : 'Sauvegarder'}
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher (nom, NINEA, adresse, contact, telephone, email)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-gray-50 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:from-green-700 hover:to-green-800"
        >
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="hidden w-full overflow-hidden rounded-2xl shadow-md lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] table-fixed">
            <thead>
              <tr className="bg-[#1a1a2e] text-xs uppercase tracking-wide text-white">
                <th className="w-[20%] px-4 py-3 text-left">Nom du Client</th>
                <th className="w-[14%] px-4 py-3 text-left">NINEA</th>
                <th className="w-[20%] px-4 py-3 text-left">Adresse</th>
                <th className="w-[16%] px-4 py-3 text-left">Nom du Contact</th>
                <th className="w-[14%] px-4 py-3 text-left">Telephone</th>
                <th className="w-[16%] px-4 py-3 text-left">Email</th>
                <th className="w-[120px] px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((r, idx) => (
                <tr
                  key={r.id}
                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} align-top transition-colors hover:bg-blue-50`}
                >
                  <td className="break-words px-4 py-3 text-sm font-semibold text-gray-900">
                    {r.name}
                  </td>
                  <td className="break-words px-4 py-3 font-mono text-sm text-gray-700">
                    {r.ninea}
                  </td>
                  <td className="break-words px-4 py-3 text-sm text-gray-700">{r.address}</td>
                  <td className="break-words px-4 py-3 text-sm text-gray-700">{r.contactName}</td>
                  <td className="break-words px-4 py-3 text-sm text-blue-700">
                    <a
                      href={`tel:${cleanPhoneForTelLink(r.phone)}`}
                      className="underline decoration-blue-300 hover:text-blue-900"
                    >
                      {r.phone}
                    </a>
                  </td>
                  <td className="break-words px-4 py-3 text-sm text-blue-700">
                    <a
                      href={`mailto:${r.email}`}
                      className="underline decoration-blue-300 hover:text-blue-900"
                    >
                      {r.email}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(r)}
                        title="Modifier"
                        className="rounded-lg bg-gray-100 p-1.5 text-gray-700 hover:bg-gray-200"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeRow(r.id)}
                        title="Supprimer"
                        className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {ordered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Aucun referentiel client
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:hidden">
        {ordered.map((r) => (
          <article
            key={r.id}
            className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-extrabold leading-tight text-gray-900">
                  {r.name}
                </h3>
                <p className="mt-1 truncate font-mono text-[11px] text-gray-500">{r.ninea}</p>
                <span className="mt-2 inline-flex rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                  Fiche client
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(r)}
                  title="Modifier"
                  className="rounded-xl bg-gray-100 p-2 text-gray-700 hover:bg-gray-200"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => removeRow(r.id)}
                  title="Supprimer"
                  className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-gray-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Adresse
                </p>
                <p className="mt-0.5 leading-snug text-gray-800">{r.address}</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Contact
                  </p>
                  <p className="mt-0.5 leading-snug text-gray-800">{r.contactName}</p>
                </div>
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Telephone
                  </p>
                  <a
                    href={`tel:${cleanPhoneForTelLink(r.phone)}`}
                    className="mt-0.5 inline-block break-words text-blue-700 underline decoration-blue-300 hover:text-blue-900"
                  >
                    {r.phone}
                  </a>
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Email
                </p>
                <a
                  href={`mailto:${r.email}`}
                  className="mt-0.5 inline-block break-all text-blue-700 underline decoration-blue-300 hover:text-blue-900"
                >
                  {r.email}
                </a>
              </div>
            </div>
          </article>
        ))}

        {ordered.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-400">
            Aucun referentiel client
          </div>
        )}
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Ajouter un client"
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
              Informations administratives
            </p>
            <p className="mt-0.5 text-xs text-blue-700">
              Renseignez une fiche annuaire complete pour un contact rapide.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Nom du client
              </label>
              <input
                className={formInputClass(!!addErrors.name)}
                value={addForm.name}
                onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              {addErrors.name && <p className="mt-1 text-xs text-red-600">{addErrors.name}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                NINEA
              </label>
              <input
                className={formInputClass(!!addErrors.ninea)}
                value={addForm.ninea}
                onChange={(e) => setAddForm((prev) => ({ ...prev, ninea: e.target.value }))}
              />
              {addErrors.ninea && <p className="mt-1 text-xs text-red-600">{addErrors.ninea}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Adresse
              </label>
              <input
                className={formInputClass(!!addErrors.address)}
                value={addForm.address}
                onChange={(e) => setAddForm((prev) => ({ ...prev, address: e.target.value }))}
              />
              {addErrors.address && (
                <p className="mt-1 text-xs text-red-600">{addErrors.address}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Nom du contact
              </label>
              <input
                className={formInputClass(!!addErrors.contactName)}
                value={addForm.contactName}
                onChange={(e) => setAddForm((prev) => ({ ...prev, contactName: e.target.value }))}
              />
              {addErrors.contactName && (
                <p className="mt-1 text-xs text-red-600">{addErrors.contactName}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Telephone
              </label>
              <input
                className={formInputClass(!!addErrors.phone)}
                value={addForm.phone}
                onChange={(e) => setAddForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+221 77 123 45 67"
              />
              {addErrors.phone && <p className="mt-1 text-xs text-red-600">{addErrors.phone}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Email
              </label>
              <input
                className={formInputClass(!!addErrors.email)}
                value={addForm.email}
                onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="contact@client.sn"
              />
              {addErrors.email && <p className="mt-1 text-xs text-red-600">{addErrors.email}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={addClient}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifier le client"
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">
              Mise a jour annuaire
            </p>
            <p className="mt-0.5 text-xs text-indigo-700">
              Modifiez uniquement les informations administratives et de contact.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Nom du client
              </label>
              <input
                className={formInputClass(!!editErrors.name)}
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              {editErrors.name && <p className="mt-1 text-xs text-red-600">{editErrors.name}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                NINEA
              </label>
              <input
                className={formInputClass(!!editErrors.ninea)}
                value={editForm.ninea}
                onChange={(e) => setEditForm((prev) => ({ ...prev, ninea: e.target.value }))}
              />
              {editErrors.ninea && <p className="mt-1 text-xs text-red-600">{editErrors.ninea}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Adresse
              </label>
              <input
                className={formInputClass(!!editErrors.address)}
                value={editForm.address}
                onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
              />
              {editErrors.address && (
                <p className="mt-1 text-xs text-red-600">{editErrors.address}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Nom du contact
              </label>
              <input
                className={formInputClass(!!editErrors.contactName)}
                value={editForm.contactName}
                onChange={(e) => setEditForm((prev) => ({ ...prev, contactName: e.target.value }))}
              />
              {editErrors.contactName && (
                <p className="mt-1 text-xs text-red-600">{editErrors.contactName}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Telephone
              </label>
              <input
                className={formInputClass(!!editErrors.phone)}
                value={editForm.phone}
                onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
              {editErrors.phone && <p className="mt-1 text-xs text-red-600">{editErrors.phone}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Email
              </label>
              <input
                className={formInputClass(!!editErrors.email)}
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
              />
              {editErrors.email && <p className="mt-1 text-xs text-red-600">{editErrors.email}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={saveEdit}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Mettre a jour
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
