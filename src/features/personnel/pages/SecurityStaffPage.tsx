/**
 * SÉCURITÉ & GARDIENNAGE
 * Page spécialisée pour la gestion des agents de sécurité
 * Liste full-screen 100% hauteur/largeur avec actions (Modifier, Dossier, Supprimer)
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { personnelStore, PersonnelAgent, type StatutContractuel } from '../../fleet/services/personnelStore';
import { useAuth } from '../../../shared/contexts/AuthContext';
import {
  Users, UserPlus, Search, Eye, Edit, Trash2, Shield,
  ChevronDown, QrCode, Download, FolderOpen, User, X
} from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { DossierPersonnel } from '../components/HRDocuments';
import { PersonnelForm } from '../PersonnelForm';
import BadgeDesigner from '../badges/BadgeDesigner';

// ─── Constants ────────────────────────────────────────────────
const SECURITY_ROLES = ['Agent de sécurité'];
const STATUTS_CONTRACTUELS: StatutContractuel[] = ['CDI', 'CDD', 'Journalier', 'Prestataire', 'Stagiaire', 'Saisonnier'];

const STATUT_COLORS: Record<string, string> = {
  'Actif': 'bg-green-100 text-green-800',
  'En congé': 'bg-yellow-100 text-yellow-800',
  'Suspendu': 'bg-red-100 text-red-800',
};

function statusBadge(statut: string) {
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUT_COLORS[statut] || 'bg-gray-100 text-gray-700'}`}>{statut}</span>;
}

function statutContractuelBadge(sc: string) {
  if (!sc) return null;
  const colors: Record<string, string> = {
    'CDI': 'bg-green-100 text-green-800',
    'CDD': 'bg-orange-100 text-orange-800',
    'Journalier': 'bg-yellow-100 text-yellow-800',
    'Prestataire': 'bg-cyan-100 text-cyan-800',
    'Stagiaire': 'bg-purple-100 text-purple-800',
    'Saisonnier': 'bg-pink-100 text-pink-800',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors[sc] || 'bg-gray-100 text-gray-700'}`}>{sc}</span>;
}

function avatarInitials(first: string, last: string) {
  return `${(first || '?')[0]}${(last || '?')[0]}`.toUpperCase();
}

const avatarColors = ['bg-red-600', 'bg-red-700', 'bg-orange-600', 'bg-pink-600', 'bg-rose-600', 'bg-amber-600', 'bg-red-500', 'bg-red-800'];
function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return avatarColors[Math.abs(h) % avatarColors.length];
}

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
export default function SecurityStaffPage() {
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
      .filter(a => SECURITY_ROLES.includes(a.role))
      .map(a => ({
        ...a,
        statutContractuel: a.statutContractuel || (a.typeContrat === 'CDI' ? 'CDI' : a.typeContrat === 'CDD' ? 'CDD' : a.typeContrat === 'Stage' ? 'Stagiaire' : '') as StatutContractuel,
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
    return agents.filter(a => {
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

  const stats = useMemo(() => ({
    total: agents.length,
    actifs: agents.filter(a => a.statut === 'Actif').length,
    conges: agents.filter(a => a.statut === 'En congé').length,
  }), [agents]);

  function handleDelete(id: string) {
    if (!window.confirm('Supprimer cet agent de sécurité ?')) return;
    personnelStore.remove(id);
    reload();
  }

  // ─── RENDER ────────────────────────────────────────────────
  return (
    <div className="w-full min-h-screen flex flex-col">
      {/* ── Page Header ────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-800 rounded-2xl p-4 sm:p-6 mb-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Sécurité & Gardiennage</h1>
              <p className="text-xs sm:text-sm text-red-100">Gestion des agents de sécurité</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-red-700 hover:bg-red-50 rounded-xl font-semibold text-sm transition-all shadow-md"
          >
            <UserPlus className="w-4 h-4" /> Ajouter
          </button>
        </div>

        {/* ── Quick Stat Counters ─────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-black">{stats.total}</p>
            <p className="text-[10px] text-red-100 uppercase tracking-wider">Effectif</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-green-300">{stats.actifs}</p>
            <p className="text-[10px] text-red-100 uppercase tracking-wider">Actifs</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-yellow-300">{stats.conges}</p>
            <p className="text-[10px] text-red-100 uppercase tracking-wider">En congé</p>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Row ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher (nom, poste, matricule, email…)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <div className="relative">
          <select
            value={filterStatutContractuel}
            onChange={e => setFilterStatutContractuel(e.target.value)}
            className="appearance-none w-full sm:w-auto px-4 py-2.5 pr-8 rounded-xl bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <option value="">Tous statuts contractuels</option>
            {STATUTS_CONTRACTUELS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* ── Personnel Table (Responsive) ──────────────────── */}
      <div className="flex-1 overflow-x-auto rounded-2xl shadow-md">
        <table className="min-w-full">
          <thead>
            <tr className="bg-red-700 text-white text-xs uppercase">
              <th className="px-4 py-3 text-left">Agent</th>
              <th className="px-4 py-3 text-left">Poste</th>
              <th className="px-4 py-3 text-left">Contact</th>
              <th className="px-4 py-3 text-left">Statut Contractuel</th>
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, idx) => (
              <tr key={a.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-red-50 transition-colors border-b border-gray-100`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {a.photo ? (
                      <img src={a.photo} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-white shadow" />
                    ) : (
                      <div className={`w-9 h-9 rounded-full ${avatarColor(a.id)} flex items-center justify-center text-white text-xs font-bold shadow`}>
                        {avatarInitials(a.firstName, a.lastName)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{a.firstName} {a.lastName}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{a.matricule}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-800">{a.poste || '—'}</p>
                  <p className="text-[10px] text-gray-400">{a.departement || 'Sécurité'}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 font-mono">{a.phone || a.whatsapp || '—'}</td>
                <td className="px-4 py-3 text-sm">{statutContractuelBadge(a.statutContractuel)}</td>
                <td className="px-4 py-3 text-sm">{statusBadge(a.statut || 'Actif')}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-center">
                    <button
                      onClick={() => { setViewAgent(a); setViewModal(true); }}
                      title="Voir dossier"
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setEditAgent(a); setEditModal(true); }}
                      title="Modifier"
                      className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {isManager && (
                      <button
                        onClick={() => handleDelete(a.id)}
                        title="Supprimer"
                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">
                  Aucun agent de sécurité trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Add Modal ─────────────────────────────────────── */}
      {showAddModal && (
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Ajouter un Agent de Sécurité" size="lg">
          <PersonnelForm
            defaultRole="Agent de sécurité"
            onSubmit={(data: any) => { personnelStore.add(data); reload(); setShowAddModal(false); }}
            onCancel={() => setShowAddModal(false)}
          />
        </Modal>
      )}

      {/* ── View Modal ────────────────────────────────────── */}
      <Modal isOpen={viewModal} onClose={() => setViewModal(false)} title={viewAgent ? `${viewAgent.firstName} ${viewAgent.lastName}` : ''} size="lg">
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
        <Modal isOpen={editModal} onClose={() => setEditModal(false)} title={`Modifier — ${editAgent.firstName} ${editAgent.lastName}`} size="lg">
          <PersonnelForm
            onSubmit={(data: any) => { personnelStore.update(editAgent.id, data); reload(); setEditModal(false); }}
            onCancel={() => setEditModal(false)}
          />
        </Modal>
      )}
    </div>
  );
}
