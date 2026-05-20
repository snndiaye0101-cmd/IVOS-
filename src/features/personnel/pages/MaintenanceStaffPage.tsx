/**
 * ENTRETIEN & HYGIÈNE
 * Page spécialisée pour la gestion des techniciens de surface
 * Liste full-screen 100% hauteur/largeur avec actions (Modifier, Dossier, Supprimer)
 *
 * Renommage: "Femme de ménage" → "Technicien de surface"
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  personnelStore,
  PersonnelAgent,
  type StatutContractuel,
} from '../../fleet/services/personnelStore';
import { useAuth } from '../../../shared/contexts/AuthContext';
import {
  Users,
  UserPlus,
  Search,
  Eye,
  Edit,
  Trash2,
  Sparkles,
  ChevronDown,
  QrCode,
  Download,
  FolderOpen,
  User,
  X,
} from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { DossierPersonnel } from '../components/HRDocuments';
import { PersonnelForm } from '../PersonnelForm';
import BadgeDesigner from '../badges/BadgeDesigner';

// ─── Constants ────────────────────────────────────────────────
const MAINTENANCE_ROLES = ['Technicien de surface'];
const STATUTS_CONTRACTUELS: StatutContractuel[] = [
  'CDI',
  'CDD',
  'Journalier',
  'Prestataire',
  'Stagiaire',
  'Saisonnier',
];

const STATUT_COLORS: Record<string, string> = {
  Actif: 'bg-green-100 text-green-800',
  'En congé': 'bg-yellow-100 text-yellow-800',
  Suspendu: 'bg-red-100 text-red-800',
};

function statusBadge(statut: string) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUT_COLORS[statut] || 'bg-gray-100 text-gray-700'}`}
    >
      {statut}
    </span>
  );
}

function statutContractuelBadge(sc: string) {
  if (!sc) return null;
  const colors: Record<string, string> = {
    CDI: 'bg-green-100 text-green-800',
    CDD: 'bg-orange-100 text-orange-800',
    Journalier: 'bg-yellow-100 text-yellow-800',
    Prestataire: 'bg-cyan-100 text-cyan-800',
    Stagiaire: 'bg-purple-100 text-purple-800',
    Saisonnier: 'bg-pink-100 text-pink-800',
  };
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${colors[sc] || 'bg-gray-100 text-gray-700'}`}
    >
      {sc}
    </span>
  );
}

function avatarInitials(first: string, last: string) {
  return `${(first || '?')[0]}${(last || '?')[0]}`.toUpperCase();
}

const avatarColors = [
  'bg-teal-600',
  'bg-cyan-600',
  'bg-emerald-600',
  'bg-green-600',
  'bg-teal-700',
  'bg-cyan-700',
  'bg-emerald-700',
  'bg-green-700',
];
function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return avatarColors[Math.abs(h) % avatarColors.length];
}

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
export default function MaintenanceStaffPage() {
  const { user, isAdmin } = useAuth();
  const logoUrl = '/logo-ivos.jpg';
  const isManager = isAdmin || user?.role === 'Manager' || user?.role === 'country_manager';

  // Data
  const [agents, setAgents] = useState<PersonnelAgent[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatutContractuel, setFilterStatutContractuel] = useState<string>('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [viewAgent, setViewAgent] = useState<PersonnelAgent | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [editAgent, setEditAgent] = useState<PersonnelAgent | null>(null);
  const [showBadgeDesigner, setShowBadgeDesigner] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<PersonnelAgent | null>(null);

  const reload = useCallback(() => {
    const loaded = personnelStore.load();
    const migrated = loaded
      .filter((a) => MAINTENANCE_ROLES.includes(a.role))
      .map((a) => ({
        ...a,
        statutContractuel:
          a.statutContractuel ||
          ((a.typeContrat === 'CDI'
            ? 'CDI'
            : a.typeContrat === 'CDD'
              ? 'CDD'
              : a.typeContrat === 'Stage'
                ? 'Stagiaire'
                : '') as StatutContractuel),
      }));
    setAgents(migrated);
  }, []);

  useEffect(() => {
    reload();
    const h = () => reload();
    window.addEventListener('personnel:updated', h);
    return () => window.removeEventListener('personnel:updated', h);
  }, [reload]);

  const filtered = useMemo(() => {
    return agents.filter((a) => {
      if (filterStatutContractuel && a.statutContractuel !== filterStatutContractuel) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          a.firstName.toLowerCase().includes(q) ||
          a.lastName.toLowerCase().includes(q) ||
          a.poste.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.matricule.toLowerCase().includes(q) ||
          a.phone.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [agents, search, filterStatutContractuel]);

  const stats = useMemo(
    () => ({
      total: agents.length,
      actifs: agents.filter((a) => a.statut === 'Actif').length,
      conges: agents.filter((a) => a.statut === 'En congé').length,
    }),
    [agents]
  );

  function handleDelete(id: string) {
    if (!window.confirm('Supprimer ce technicien de surface ?')) return;
    personnelStore.remove(id);
    reload();
  }

  // ─── RENDER ────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen w-full flex-col">
      {/* ── Page Header ────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-600 p-4 text-white sm:p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Entretien & Hygiène</h1>
              <p className="text-xs text-teal-100 sm:text-sm">Gestion des techniciens de surface</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-teal-700 shadow-md transition-all hover:bg-teal-50"
          >
            <UserPlus className="h-4 w-4" /> Ajouter
          </button>
        </div>

        {/* ── Quick Stat Counters ─────────────────────────── */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/20 p-3 text-center">
            <p className="text-2xl font-black">{stats.total}</p>
            <p className="text-[10px] uppercase tracking-wider text-teal-100">Effectif</p>
          </div>
          <div className="rounded-xl bg-white/20 p-3 text-center">
            <p className="text-2xl font-black text-green-300">{stats.actifs}</p>
            <p className="text-[10px] uppercase tracking-wider text-teal-100">Actifs</p>
          </div>
          <div className="rounded-xl bg-white/20 p-3 text-center">
            <p className="text-2xl font-black text-yellow-300">{stats.conges}</p>
            <p className="text-[10px] uppercase tracking-wider text-teal-100">En congé</p>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Row ────────────────────────────── */}
      <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher (nom, poste, matricule, email…)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
        <div className="relative">
          <select
            value={filterStatutContractuel}
            onChange={(e) => setFilterStatutContractuel(e.target.value)}
            className="w-full appearance-none rounded-xl bg-gray-50 px-4 py-2.5 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 sm:w-auto"
          >
            <option value="">Tous statuts contractuels</option>
            {STATUTS_CONTRACTUELS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* ── Personnel Table (Responsive) ──────────────────── */}
      <div className="flex-1 overflow-x-auto rounded-2xl shadow-md">
        <table className="min-w-full">
          <thead>
            <tr className="bg-teal-600 text-xs uppercase text-white">
              <th className="px-4 py-3 text-left">Technicien de Surface</th>
              <th className="px-4 py-3 text-left">Poste</th>
              <th className="px-4 py-3 text-left">Contact</th>
              <th className="px-4 py-3 text-left">Statut Contractuel</th>
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, idx) => (
              <tr
                key={a.id}
                className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-100 transition-colors hover:bg-teal-50`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {a.photo ? (
                      <img
                        src={a.photo}
                        alt=""
                        className="h-9 w-9 rounded-full border-2 border-white object-cover shadow"
                      />
                    ) : (
                      <div
                        className={`h-9 w-9 rounded-full ${avatarColor(a.id)} flex items-center justify-center text-xs font-bold text-white shadow`}
                      >
                        {avatarInitials(a.firstName, a.lastName)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {a.firstName} {a.lastName}
                      </p>
                      <p className="font-mono text-[10px] text-gray-400">{a.matricule}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-800">
                    {a.poste || 'Technicien de surface'}
                  </p>
                  <p className="text-[10px] text-gray-400">{a.departement || 'Entretien'}</p>
                </td>
                <td className="px-4 py-3 font-mono text-sm text-gray-700">
                  {a.phone || a.whatsapp || '—'}
                </td>
                <td className="px-4 py-3 text-sm">{statutContractuelBadge(a.statutContractuel)}</td>
                <td className="px-4 py-3 text-sm">{statusBadge(a.statut || 'Actif')}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-1">
                    <button
                      onClick={() => {
                        setViewAgent(a);
                        setViewModal(true);
                      }}
                      title="Voir dossier"
                      className="rounded-lg bg-blue-50 p-1.5 text-blue-600 transition-colors hover:bg-blue-100"
                    >
                      <FolderOpen className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditAgent(a);
                        setEditModal(true);
                      }}
                      title="Modifier"
                      className="rounded-lg bg-gray-50 p-1.5 text-gray-600 transition-colors hover:bg-gray-100"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    {isManager && (
                      <button
                        onClick={() => handleDelete(a.id)}
                        title="Supprimer"
                        className="rounded-lg bg-red-50 p-1.5 text-red-600 transition-colors hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-400">
                  Aucun technicien de surface trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Add Modal ─────────────────────────────────────── */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Ajouter un Technicien de Surface"
          size="lg"
        >
          <PersonnelForm
            defaultRole="Technicien de surface"
            onSubmit={(data: any) => {
              personnelStore.add(data);
              reload();
              setShowAddModal(false);
            }}
            onCancel={() => setShowAddModal(false)}
          />
        </Modal>
      )}

      {/* ── View Modal ────────────────────────────────────── */}
      <Modal
        isOpen={viewModal}
        onClose={() => setViewModal(false)}
        title={viewAgent ? `${viewAgent.firstName} ${viewAgent.lastName}` : ''}
        size="lg"
      >
        {viewAgent && (
          <DossierPersonnel
            agent={viewAgent}
            isAdmin={isManager}
            currentUserId={user?.id || 'unknown'}
            isOwnDossier={viewAgent.email === user?.email}
          />
        )}
      </Modal>

      {/* ── Edit Modal ────────────────────────────────────── */}
      {editModal && editAgent && (
        <Modal
          isOpen={editModal}
          onClose={() => setEditModal(false)}
          title={`Modifier — ${editAgent.firstName} ${editAgent.lastName}`}
          size="lg"
        >
          <PersonnelForm
            onSubmit={(data: any) => {
              personnelStore.update(editAgent.id, data);
              reload();
              setEditModal(false);
            }}
            onCancel={() => setEditModal(false)}
          />
        </Modal>
      )}
    </div>
  );
}
