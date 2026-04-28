import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import BadgeDesigner from './badges/BadgeDesigner';
import { personnelStore, PersonnelAgent, PERSONNEL_CATEGORIES, getCategory, computeFiscalParts, type FiscalChild, type FiscalSpouse, type PersonnelCategory, type StatutContractuel } from '../fleet/services/personnelStore';
import { generateQRDataUrl, downloadBadgePNG } from './services/badgeService';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { DossierPersonnel } from './components/HRDocuments';
import { useAuth } from '../../shared/contexts/AuthContext';
import {
  Users, UserPlus, Search, Eye, Edit, Trash2, Phone, Mail, Calendar,
  Briefcase, CreditCard, Shield, User, X, QrCode, Download,
  FolderOpen, Truck, Wrench, HardHat, ChevronDown
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────
const ALL_ROLES = ['Administratif', 'Chauffeurs', 'Co-chauffeurs', 'Helpers', 'Opérateurs', 'Mécaniciens', 'Agent de sécurité', 'Technicien de surface'];
const DEPARTEMENTS = ['RH', 'Comptabilité', 'Logistique', 'Direction', 'HSE'];
const TYPES_CONTRAT: PersonnelAgent['typeContrat'][] = ['CDI', 'CDD', 'Stage', ''];
const STATUTS_CONTRACTUELS: StatutContractuel[] = ['CDI', 'CDD', 'Journalier', 'Prestataire', 'Stagiaire', 'Saisonnier'];
const GENRES: PersonnelAgent['genre'][] = ['Homme', 'Femme'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const FISCAL_STATUSES = ['Cadre', 'Non-Cadre'] as const;

// Transformation dynamique pour masquer "Service" et renommer "Entretien & Hygiène"
const DISPLAY_CATEGORIES = PERSONNEL_CATEGORIES
  .filter(cat => cat.key !== 'Services' && !cat.label.toLowerCase().includes('service'))
  .map(cat => {
    if (cat.label.toLowerCase().includes('entretien') || cat.label.toLowerCase().includes('hygiéne') || cat.label.toLowerCase().includes('hygiène')) {
      return { ...cat, label: 'TECHNICIENS DE SURFACE' };
    }
    return cat;
  });

// ─── Badge helpers ────────────────────────────────────────────
const STATUT_CONTRACTUEL_COLORS: Record<string, string> = {
  'CDI': 'bg-green-100 text-green-800 border-green-200',
  'CDD': 'bg-orange-100 text-orange-800 border-orange-200',
  'Journalier': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Prestataire': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'Stagiaire': 'bg-purple-100 text-purple-800 border-purple-200',
  'Saisonnier': 'bg-pink-100 text-pink-800 border-pink-200',
};

function statutContractuelBadge(sc: string) {
  if (!sc) return null;
  const cls = STATUT_CONTRACTUEL_COLORS[sc] || 'bg-gray-100 text-gray-700 border-gray-200';
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>{sc}</span>;
}

function statusBadge(statut: string) {
  const map: Record<string, string> = {
    'Actif': 'bg-green-100 text-green-800',
    'En congé': 'bg-yellow-100 text-yellow-800',
    'Suspendu': 'bg-red-100 text-red-800',
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${map[statut] || 'bg-gray-100 text-gray-700'}`}>{statut}</span>;
}

function avatarInitials(first: string, last: string) {
  return `${(first || '?')[0]}${(last || '?')[0]}`.toUpperCase();
}

const avatarColors = ['bg-blue-600', 'bg-indigo-600', 'bg-green-600', 'bg-purple-600', 'bg-teal-600', 'bg-rose-600', 'bg-amber-600', 'bg-cyan-600'];
function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return avatarColors[Math.abs(h) % avatarColors.length];
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Administration': <Briefcase className="w-5 h-5" />,
  'Transport': <Truck className="w-5 h-5" />,
  'Technique': <Wrench className="w-5 h-5" />,
  'Services': <HardHat className="w-5 h-5" />,
};

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
export default function Annuaire() {
  const [showBadgeDesigner, setShowBadgeDesigner] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<PersonnelAgent | null>(null);
  const logoUrl = '/logo-ivos.jpg';
  const { user, isAdmin } = useAuth();
  const isManager = isAdmin || user?.role === 'Manager' || user?.role === 'country_manager';

  // Data
  const [agents, setAgents] = useState<PersonnelAgent[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<PersonnelCategory | 'all'>('all');
  const [filterStatutContractuel, setFilterStatutContractuel] = useState<string>('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [viewAgent, setViewAgent] = useState<PersonnelAgent | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [editAgent, setEditAgent] = useState<PersonnelAgent | null>(null);

  const reload = useCallback(() => {
    const loaded = personnelStore.load();
    const migrated = loaded.map(a => ({
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

  // ─── Computed ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    return agents.filter(a => {
      if (activeCategory !== 'all' && getCategory(a.role) !== activeCategory) return false;
      if (filterStatutContractuel && a.statutContractuel !== filterStatutContractuel) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          a.firstName.toLowerCase().includes(q) ||
          a.lastName.toLowerCase().includes(q) ||
          a.poste.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.matricule.toLowerCase().includes(q) ||
          a.phone.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [agents, search, activeCategory, filterStatutContractuel]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: agents.length };
    for (const cat of DISPLAY_CATEGORIES) {
      counts[cat.key] = agents.filter(a => cat.roles.includes(a.role)).length;
    }
    return counts;
  }, [agents]);

  const stats = useMemo(() => ({
    total: agents.length,
    actifs: agents.filter(a => a.statut === 'Actif').length,
    conges: agents.filter(a => a.statut === 'En congé').length,
  }), [agents]);

  function handleDelete(id: string) {
    if (!window.confirm('Supprimer ce collaborateur ?')) return;
    personnelStore.remove(id);
    reload();
  }

  // ─── RENDER ────────────────────────────────────────────────
  return (
    <div className="w-full min-h-screen">
      {/* ── Page Header ────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-4 sm:p-6 mb-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Personnel</h1>
              <p className="text-xs sm:text-sm text-gray-300">Base de Kignabour — Gestion des collaborateurs</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-sm transition-all shadow-md"
            >
              <UserPlus className="w-4 h-4" /> Ajouter
            </button>
            <button
              onClick={() => setShowBadgeDesigner(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-semibold text-sm transition-all border border-blue-300"
            >
              <QrCode className="w-4 h-4" /> <span className="hidden sm:inline">Badges</span>
            </button>
          </div>
        </div>

        {/* ── Quick Stat Counters ─────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-black">{stats.total}</p>
            <p className="text-[10px] text-gray-300 uppercase tracking-wider">Effectif</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-green-400">{stats.actifs}</p>
            <p className="text-[10px] text-gray-300 uppercase tracking-wider">Actifs</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-yellow-400">{stats.conges}</p>
            <p className="text-[10px] text-gray-300 uppercase tracking-wider">En congé</p>
          </div>
        </div>
      </div>

      {/* ── Category Tabs ──────────────────────────────────── */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        <button
          onClick={() => setActiveCategory('all')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border ${
            activeCategory === 'all'
              ? 'bg-[#1a1a2e] text-white border-[#1a1a2e] shadow-lg'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Users className="w-4 h-4" />
          Tous
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeCategory === 'all' ? 'bg-white/20' : 'bg-gray-100'}`}>
            {categoryCounts.all}
          </span>
        </button>

      {DISPLAY_CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border ${
              activeCategory === cat.key
                ? `${cat.bg} ${cat.color} border-current shadow-md`
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
          {CATEGORY_ICONS[cat.key] || <Users className="w-5 h-5" />}
            {cat.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeCategory === cat.key ? 'bg-white/60' : 'bg-gray-100'}`}>
              {categoryCounts[cat.key] || 0}
            </span>
          </button>
        ))}
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
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="relative">
          <select
            value={filterStatutContractuel}
            onChange={e => setFilterStatutContractuel(e.target.value)}
            className="appearance-none w-full sm:w-auto px-4 py-2.5 pr-8 rounded-xl bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Tous statuts contractuels</option>
            {STATUTS_CONTRACTUELS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* ── Active Category Sub-header ─────────────────────── */}
      {activeCategory !== 'all' && (
        <div className="mb-4">
          {(() => {
            const cat = DISPLAY_CATEGORIES.find(c => c.key === activeCategory);
            if (!cat) return null;
            return (
              <div className={`${cat.bg} border ${cat.color} rounded-xl px-4 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  {CATEGORY_ICONS[cat.key] || <Users className="w-5 h-5" />}
                  <div>
                    <h3 className={`text-sm font-bold ${cat.color}`}>{cat.label}</h3>
                    <p className="text-[10px] text-gray-500">Rôles : {cat.roles.join(', ')}</p>
                  </div>
                </div>
                <span className={`text-lg font-black ${cat.color}`}>{categoryCounts[cat.key] || 0}</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Personnel Cards (Mobile) ────────────────────────── */}
      <div className="block md:hidden space-y-3 mb-6">
        {filtered.map(a => (
          <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start gap-3">
              {a.photo ? (
                <img src={a.photo} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow" />
              ) : (
                <div className={`w-12 h-12 rounded-full ${avatarColor(a.id)} flex items-center justify-center text-white text-sm font-bold shadow shrink-0`}>
                  {avatarInitials(a.firstName, a.lastName)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-gray-900 truncate">{a.firstName} {a.lastName}</p>
                  {statusBadge(a.statut || 'Actif')}
                </div>
                <p className="text-xs text-gray-500">{a.poste || a.role}</p>
                <p className="text-[10px] text-gray-400 font-mono">{a.matricule}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {statutContractuelBadge(a.statutContractuel)}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200">{a.role}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
              <button onClick={() => { setViewAgent(a); setViewModal(true); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors">
                <Eye className="w-3.5 h-3.5" /> Dossier
              </button>
              <button onClick={() => { setEditAgent(a); setEditModal(true); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gray-50 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-colors">
                <Edit className="w-3.5 h-3.5" /> Modifier
              </button>
              <button onClick={() => { setSelectedAgent(a); setShowBadgeDesigner(true); }} className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors">
                <QrCode className="w-3.5 h-3.5" />
              </button>
              {isManager && (
                <button onClick={() => handleDelete(a.id)} className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Personnel Table (Desktop) ─────────────────────── */}
      <div className="hidden md:block overflow-x-auto rounded-2xl shadow-md mb-6">
        <table className="min-w-full">
          <thead>
            <tr className="bg-[#1a1a2e] text-white text-xs uppercase">
              <th className="px-4 py-3 text-left">Collaborateur</th>
              <th className="px-4 py-3 text-left">Poste / Département</th>
              <th className="px-4 py-3 text-left">WhatsApp</th>
              <th className="px-4 py-3 text-left">Statut Contractuel</th>
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, idx) => (
              <tr key={a.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
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
                  <p className="text-[10px] text-gray-400">{a.departement || a.role}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 font-mono">{a.whatsapp || a.phone}</td>
                <td className="px-4 py-3 text-sm">{statutContractuelBadge(a.statutContractuel)}</td>
                <td className="px-4 py-3 text-sm">{statusBadge(a.statut || 'Actif')}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => { setSelectedAgent(a); setShowBadgeDesigner(true); }} title="Badge" className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"><QrCode className="w-4 h-4" /></button>
                    <button onClick={() => { setViewAgent(a); setViewModal(true); }} title="Dossier RH" className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => { setEditAgent(a); setEditModal(true); }} title="Modifier" className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"><Edit className="w-4 h-4" /></button>
                    {isManager && (
                      <button onClick={() => handleDelete(a.id)} title="Supprimer" className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Aucun collaborateur trouvé</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Badge Designer Modal ──────────────────────────── */}
      {showBadgeDesigner && (
        <Modal isOpen={showBadgeDesigner} onClose={() => { setShowBadgeDesigner(false); setSelectedAgent(null); }} title="Badge Designer" size="xl">
          <div className="w-full max-w-xl mx-auto">
            <h2 className="text-xl font-bold mb-4 text-[#1a1a2e]">Conception de Badge Professionnel</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Sélectionner un collaborateur :</label>
              <select
                className="w-full px-4 py-2 rounded-xl border border-gray-300 bg-gray-50 text-sm mb-4"
                value={selectedAgent?.id || ''}
                onChange={e => {
                  const agent = agents.find(a => a.id === e.target.value) || null;
                  setSelectedAgent(agent);
                }}
              >
                <option value="">— Choisir —</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.firstName} {a.lastName} ({a.matricule})</option>
                ))}
              </select>
              {selectedAgent && (
                <BadgeDesigner agent={selectedAgent} logoUrl={logoUrl} />
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Add Modal ─────────────────────────────────────── */}
      {showAddModal && (
        <CollaborateurFormModal
          title="Ajouter un Collaborateur"
          defaultRole={activeCategory !== 'all' ? DISPLAY_CATEGORIES.find(c => c.key === activeCategory)?.roles[0] : ''}
          onSave={(data) => { personnelStore.add(data); reload(); setShowAddModal(false); }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* ── View / Dossier RH Modal ───────────────────────── */}
      <Modal isOpen={viewModal} onClose={() => setViewModal(false)} title={viewAgent ? `${viewAgent.firstName} ${viewAgent.lastName}` : ''} size="lg">
        {viewAgent && (
          <DossierViewWithDossier
            agent={viewAgent}
            isAdmin={isManager}
            currentUserId={user?.id || 'unknown'}
            currentUserMatricule={user?.email || ''}
          />
        )}
      </Modal>

      {/* ── Edit Modal ────────────────────────────────────── */}
      {editModal && editAgent && (
        <CollaborateurFormModal
          title={`Modifier — ${editAgent.firstName} ${editAgent.lastName}`}
          agent={editAgent}
          onSave={(data) => { personnelStore.update(editAgent.id, data); reload(); setEditModal(false); }}
          onClose={() => setEditModal(false)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DOSSIER VIEW WITH TABS (Infos + Dossier RH)
   ═══════════════════════════════════════════════════════════════ */
function DossierViewWithDossier({
  agent,
  isAdmin,
  currentUserId,
  currentUserMatricule,
}: {
  agent: PersonnelAgent;
  isAdmin: boolean;
  currentUserId: string;
  currentUserMatricule: string;
}) {
  const [tab, setTab] = useState<'infos' | 'dossier'>('infos');
  const isOwnDossier = agent.email === currentUserMatricule;

  return (
    <div>
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('infos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === 'infos' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <User className="w-4 h-4" /> Informations
        </button>
        <button
          onClick={() => setTab('dossier')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === 'dossier' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FolderOpen className="w-4 h-4" /> Dossier RH
        </button>
      </div>

      {tab === 'infos' && <DossierView agent={agent} />}
      {tab === 'dossier' && (
        <DossierPersonnel
          agent={agent}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          isOwnDossier={isOwnDossier}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DOSSIER VIEW (Read-only display in modal)
   ═══════════════════════════════════════════════════════════════ */
function DossierView({ agent: a }: { agent: PersonnelAgent }) {
  return (
    <div className="space-y-5 py-2">
      <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
        {a.photo ? (
          <img src={a.photo} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-blue-200 shadow" />
        ) : (
          <div className={`w-16 h-16 rounded-full ${avatarColor(a.id)} flex items-center justify-center text-white text-xl font-bold shadow`}>
            {avatarInitials(a.firstName, a.lastName)}
          </div>
        )}
        <div>
          <p className="text-lg font-bold text-gray-900">{a.firstName} {a.lastName}</p>
          <p className="text-sm text-gray-500">{a.poste} — {a.departement || a.role}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {statusBadge(a.statut || 'Actif')}
            {statutContractuelBadge(a.statutContractuel)}
            <span className="text-[10px] font-mono text-gray-400">{a.matricule}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Genre" value={a.genre} />
        <Field label="Date d'entrée" value={a.hireDate} />
        <Field label="WhatsApp" value={a.whatsapp || a.phone} />
        <Field label="Email professionnel" value={a.email} />
        <Field label="Adresse à Dakar" value={a.adresseDakar || a.quartier} />
        <Field label="Groupe sanguin" value={a.bloodGroup} />
      </div>

      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="text-xs font-bold text-gray-600 uppercase mb-3">Documents</h4>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div><p className="text-[10px] text-gray-400">CNI/Passeport</p><p className="font-mono text-xs">{a.idNumber || '—'}</p><p className="text-[10px] text-gray-400">Valid. {a.idValidity || '—'}</p></div>
          <div><p className="text-[10px] text-gray-400">Permis</p><p className="font-mono text-xs">{a.permisNumber || '—'}</p><p className="text-[10px] text-gray-400">Valid. {a.permisValidity || '—'}</p></div>
          <div><p className="text-[10px] text-gray-400">Visite médicale</p><p className="text-[10px] text-gray-400">Valid. {a.medicalValidity || '—'}</p></div>
        </div>
      </div>

      <div className="bg-red-50 rounded-xl p-4">
        <h4 className="text-xs font-bold text-red-700 uppercase mb-3 flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Contacts d'urgence</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-[10px] text-red-400">Contact 1</p><p className="font-semibold">{a.emergency1?.name || '—'} <span className="text-[10px] text-gray-400">({a.emergency1?.relation})</span></p><p className="font-mono text-xs">{a.emergency1?.phone || '—'}</p></div>
          <div><p className="text-[10px] text-red-400">Contact 2</p><p className="font-semibold">{a.emergency2?.name || '—'} <span className="text-[10px] text-gray-400">({a.emergency2?.relation})</span></p><p className="font-mono text-xs">{a.emergency2?.phone || '—'}</p></div>
        </div>
      </div>

      <BadgeNumerique agent={a} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || '—'}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BADGE NUMÉRIQUE — QR Code signed + Badge card
   ═══════════════════════════════════════════════════════════════ */
function BadgeNumerique({ agent }: { agent: PersonnelAgent }) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    generateQRDataUrl(agent).then(setQrUrl);
  }, [agent.id, agent.matricule]);

  const handleDownload = async () => {
    if (!badgeRef.current) return;
    setDownloading(true);
    try {
      await downloadBadgePNG(agent, badgeRef.current);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#1a1a2e]/5 to-blue-50 rounded-xl p-4 border border-blue-100">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold text-[#1a1a2e] uppercase flex items-center gap-1.5">
          <QrCode className="w-4 h-4" /> Badge Numérique
        </h4>
        <button
          onClick={handleDownload}
          disabled={downloading || !qrUrl}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a2e] text-white rounded-lg text-xs font-semibold hover:bg-[#16213e] disabled:opacity-50 transition-colors shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          {downloading ? 'Génération…' : 'Télécharger le Badge'}
        </button>
      </div>

      <div className="flex justify-center">
        <div
          ref={badgeRef}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
          style={{ width: 320 }}
        >
          <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] px-5 py-3 flex items-center gap-3">
            <img src="/logo-ivos.jpg" alt="IVOS" className="h-9 w-auto rounded" crossOrigin="anonymous" />
            <div className="text-white">
              <p className="text-xs font-black tracking-wider uppercase">IVOS SARL</p>
              <p className="text-[9px] text-gray-300">Badge d'identification</p>
            </div>
          </div>

          <div className="px-5 py-4 flex flex-col items-center">
            {agent.photo ? (
              <img src={agent.photo} alt={`${agent.firstName} ${agent.lastName}`} className="w-20 h-20 rounded-full object-cover border-4 border-blue-100 shadow mb-3" crossOrigin="anonymous" />
            ) : (
              <div className={`w-20 h-20 rounded-full ${avatarColor(agent.id)} flex items-center justify-center text-white text-2xl font-bold shadow border-4 border-blue-100 mb-3`}>
                {avatarInitials(agent.firstName, agent.lastName)}
              </div>
            )}

            <p className="text-base font-black text-gray-900 text-center">{agent.firstName} {agent.lastName}</p>
            <p className="text-xs text-gray-500 font-medium text-center">{agent.poste || agent.role}</p>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{agent.matricule}</p>

            {qrUrl && (
              <div className="mt-3 p-2 bg-white rounded-xl border border-gray-100">
                <img src={qrUrl} alt="QR Code" className="w-32 h-32" />
              </div>
            )}

            <div className="mt-2 flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-600" />
              <p className="text-[8px] text-gray-400 uppercase tracking-wider">QR signé HMAC-SHA256</p>
            </div>
          </div>

          <div className="bg-gray-50 px-5 py-2 text-center">
            <p className="text-[8px] text-gray-400">Dépôt de Kignabour · {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COLLABORATEUR FORM MODAL (Add / Edit — Tabbed Sections)
   ═══════════════════════════════════════════════════════════════ */
const TABS = [
  { id: 'identite', label: 'Identité', icon: <User className="w-4 h-4" /> },
  { id: 'contact', label: 'Contact', icon: <Phone className="w-4 h-4" /> },
  { id: 'contrat', label: 'Contrat', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'paie', label: 'Paie (Confidentiel)', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'securite', label: 'Sécurité', icon: <Shield className="w-4 h-4" /> },
] as const;

type TabId = typeof TABS[number]['id'];

function emptyForm(defaultRole?: string): Omit<PersonnelAgent, 'id'> {
  return {
    firstName: '', lastName: '', genre: '' as PersonnelAgent['genre'], photo: '',
    role: defaultRole || 'Administratif', matricule: '',
    phone: '', whatsapp: '', email: '', quartier: '', adresseDakar: '',
    poste: '', departement: '', hireDate: '', typeContrat: '' as PersonnelAgent['typeContrat'],
    statutContractuel: '' as StatutContractuel,
    salaireBase: 0, banque: '', rib: '',
    fiscalStatus: 'Non-Cadre', fiscalCategory: defaultRole || 'Administratif', automaticTaxCalculation: true,
    spouses: [], children: [], taxParts: 1,
    statut: 'Actif',
    permisValidity: '', permisNumber: '',
    idType: '', idNumber: '', idValidity: '', medicalValidity: '', bloodGroup: '',
    emergency1: { name: '', relation: '', phone: '' },
    emergency2: { name: '', relation: '', phone: '' },
    shiftNuit: false, shiftNuitDebut: '', shiftNuitFin: '', nombreNuits: 0, appliquerMajorationNuit: true,
  };
}

function agentToForm(a: PersonnelAgent): Omit<PersonnelAgent, 'id'> {
  return { ...a };
}

function CollaborateurFormModal({ title, agent, defaultRole, onSave, onClose }: {
  title: string;
  agent?: PersonnelAgent;
  defaultRole?: string;
  onSave: (data: Omit<PersonnelAgent, 'id'>) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<TabId>('identite');
  const [f, setF] = useState<Omit<PersonnelAgent, 'id'>>(agent ? agentToForm(agent) : emptyForm(defaultRole || ''));
  const fiscalParts = useMemo(() => computeFiscalParts({ spouses: f.spouses, children: f.children }), [f.children, f.spouses]);

  const h = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setF(prev => ({ ...prev, [name]: name === 'salaireBase' ? Number(value) || 0 : value }));
  };

  const setBooleanField = (name: 'automaticTaxCalculation', value: boolean) => {
    setF(prev => ({ ...prev, [name]: value }));
  };

  const hEmergency = (idx: 1 | 2, field: string, value: string) => {
    const key = idx === 1 ? 'emergency1' : 'emergency2';
    setF(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const updateSpouse = (index: number, value: string) => {
    setF(prev => ({
      ...prev,
      spouses: (prev.spouses || []).map((spouse, spouseIndex) => spouseIndex === index ? { ...spouse, name: value } : spouse),
    }));
  };

  const updateChild = (index: number, field: keyof FiscalChild, value: string) => {
    setF(prev => ({
      ...prev,
      children: (prev.children || []).map((child, childIndex) => childIndex === index ? { ...child, [field]: value } : child),
    }));
  };

  const addSpouse = () => {
    setF(prev => ({ ...prev, spouses: [...(prev.spouses || []), { name: '' } as FiscalSpouse] }));
  };

  const removeSpouse = (index: number) => {
    setF(prev => ({ ...prev, spouses: (prev.spouses || []).filter((_, spouseIndex) => spouseIndex !== index) }));
  };

  const addChild = () => {
    setF(prev => ({ ...prev, children: [...(prev.children || []), { name: '', birthDate: '' } as FiscalChild] }));
  };

  const removeChild = (index: number) => {
    setF(prev => ({ ...prev, children: (prev.children || []).filter((_, childIndex) => childIndex !== index) }));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ ...f, taxParts: fiscalParts });
  }

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const inputCls = "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white";
  const labelCls = "block text-[11px] font-semibold text-gray-500 uppercase mb-1";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-5 text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="text-xs text-gray-300">Base de Kignabour — Tous les champs sont facultatifs</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-100 bg-gray-50 px-4 shrink-0 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id} type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {tab === 'identite' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={labelCls}>Prénom</label><input name="firstName" value={f.firstName} onChange={h} className={inputCls} /></div>
              <div><label className={labelCls}>Nom</label><input name="lastName" value={f.lastName} onChange={h} className={inputCls} /></div>
              <div>
                <label className={labelCls}>Genre</label>
                <select name="genre" value={f.genre} onChange={h} className={inputCls}>
                  <option value="">—</option>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Matricule IVOS</label><input name="matricule" value={f.matricule} onChange={h} className={inputCls} /></div>
              <div>
                <label className={labelCls}>Rôle / Catégorie</label>
                <select name="role" value={f.role} onChange={h} className={inputCls}>
                  {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Photo de profil (URL)</label><input name="photo" value={f.photo} onChange={h} className={inputCls} placeholder="https://…" /></div>
            </div>
          )}

          {tab === 'contact' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={labelCls}>Téléphone WhatsApp</label><input name="whatsapp" value={f.whatsapp} onChange={h} className={inputCls} placeholder="+221 7X XXX XX XX" /></div>
              <div><label className={labelCls}>Téléphone secondaire</label><input name="phone" value={f.phone} onChange={h} className={inputCls} /></div>
              <div><label className={labelCls}>Email professionnel</label><input name="email" value={f.email} onChange={h} type="email" className={inputCls} /></div>
              <div><label className={labelCls}>Quartier</label><input name="quartier" value={f.quartier} onChange={h} className={inputCls} /></div>
              <div className="sm:col-span-2"><label className={labelCls}>Adresse complète à Dakar</label><input name="adresseDakar" value={f.adresseDakar} onChange={h} className={inputCls} /></div>
            </div>
          )}

          {tab === 'contrat' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={labelCls}>Poste / Fonction</label><input name="poste" value={f.poste} onChange={h} className={inputCls} /></div>
              <div>
                <label className={labelCls}>Département</label>
                <select name="departement" value={f.departement} onChange={h} className={inputCls}>
                  <option value="">—</option>
                  {DEPARTEMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Date d'entrée</label><input name="hireDate" type="date" value={f.hireDate} onChange={h} className={inputCls} /></div>
              <div>
                <label className={labelCls}>Type de contrat</label>
                <select name="typeContrat" value={f.typeContrat} onChange={h} className={inputCls}>
                  <option value="">—</option>
                  {TYPES_CONTRAT.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Statut Contractuel</label>
                <select name="statutContractuel" value={f.statutContractuel} onChange={h} className={inputCls}>
                  <option value="">—</option>
                  {STATUTS_CONTRACTUELS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Statut</label>
                <select name="statut" value={f.statut} onChange={h} className={inputCls}>
                  <option value="Actif">Actif</option>
                  <option value="En congé">En congé</option>
                  <option value="Suspendu">Suspendu</option>
                </select>
              </div>
            </div>
          )}

          {tab === 'paie' && (
            <div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-5 flex items-center gap-2 text-sm text-yellow-800">
                <Shield className="w-4 h-4 shrink-0" />
                <span className="font-semibold">Section confidentielle</span> — Ces données serviront au calcul automatique des bulletins de paie.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div><label className={labelCls}>Salaire de base (FCFA)</label><input name="salaireBase" type="number" value={f.salaireBase || ''} onChange={h} className={inputCls} placeholder="0" /></div>
                <div><label className={labelCls}>Banque</label><input name="banque" value={f.banque} onChange={h} className={inputCls} placeholder="CBAO, BOA, Société Générale…" /></div>
                <div className="sm:col-span-2"><label className={labelCls}>RIB / IBAN</label><input name="rib" value={f.rib} onChange={h} className={inputCls} placeholder="SN08 0001 …" /></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelCls}>Statut Fiscal</label>
                  <select name="fiscalStatus" value={f.fiscalStatus || 'Non-Cadre'} onChange={h} className={inputCls}>
                    {FISCAL_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Catégorie fiscale</label>
                  <input name="fiscalCategory" value={f.fiscalCategory || ''} onChange={h} className={inputCls} placeholder="Ex: Cadre A, Maîtrise, Exécution" />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 mb-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-gray-500">Calcul Fiscal Automatique</p>
                    <p className="text-xs text-gray-400 mt-1">Quand activé, la fiche de paie hérite des paramètres globaux et des parts familiales.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={f.automaticTaxCalculation ?? true}
                    onClick={() => setBooleanField('automaticTaxCalculation', !(f.automaticTaxCalculation ?? true))}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${(f.automaticTaxCalculation ?? true) ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${(f.automaticTaxCalculation ?? true) ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-right">
                  <div className="bg-gray-50 rounded-xl px-3 py-2">
                    <p className="text-[10px] uppercase text-gray-400 font-semibold">Épouses</p>
                    <p className="text-lg font-bold text-gray-800">{(f.spouses || []).filter(spouse => spouse.name.trim()).length}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-3 py-2">
                    <p className="text-[10px] uppercase text-gray-400 font-semibold">Enfants</p>
                    <p className="text-lg font-bold text-gray-800">{(f.children || []).filter(child => child.name.trim()).length}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl px-3 py-2">
                    <p className="text-[10px] uppercase text-blue-500 font-semibold">Parts fiscales</p>
                    <p className="text-lg font-bold text-blue-700">{fiscalParts.toLocaleString('fr-FR')}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase text-gray-500">Épouses</p>
                    <button type="button" onClick={addSpouse} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">Ajouter</button>
                  </div>
                  {(f.spouses || []).length === 0 ? (
                    <p className="text-xs text-gray-400">Aucune épouse renseignée.</p>
                  ) : (
                    <div className="space-y-2">
                      {(f.spouses || []).map((spouse, index) => (
                        <div key={`spouse-${index}`} className="flex items-center gap-2">
                          <input value={spouse.name} onChange={e => updateSpouse(index, e.target.value)} className={inputCls} placeholder="Nom complet" />
                          <button type="button" onClick={() => removeSpouse(index)} className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold">Supprimer</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase text-gray-500">Enfants</p>
                    <button type="button" onClick={addChild} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">Ajouter</button>
                  </div>
                  {(f.children || []).length === 0 ? (
                    <p className="text-xs text-gray-400">Aucun enfant renseigné.</p>
                  ) : (
                    <div className="space-y-2">
                      {(f.children || []).map((child, index) => (
                        <div key={`child-${index}`} className="grid grid-cols-1 sm:grid-cols-[1fr_170px_auto] gap-2 items-center">
                          <input value={child.name} onChange={e => updateChild(index, 'name', e.target.value)} className={inputCls} placeholder="Nom complet" />
                          <input type="date" value={child.birthDate || ''} onChange={e => updateChild(index, 'birthDate', e.target.value)} className={inputCls} />
                          <button type="button" onClick={() => removeChild(index)} className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold">Supprimer</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'securite' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-gray-600 uppercase mb-3">Documents & Validités</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div><label className={labelCls}>Type pièce d'identité</label><input name="idType" value={f.idType} onChange={h} className={inputCls} placeholder="CNI / Passeport" /></div>
                  <div><label className={labelCls}>N° pièce</label><input name="idNumber" value={f.idNumber} onChange={h} className={inputCls} /></div>
                  <div><label className={labelCls}>Validité pièce</label><input name="idValidity" type="date" value={f.idValidity} onChange={h} className={inputCls} /></div>
                  <div><label className={labelCls}>N° permis</label><input name="permisNumber" value={f.permisNumber} onChange={h} className={inputCls} /></div>
                  <div><label className={labelCls}>Validité permis</label><input name="permisValidity" type="date" value={f.permisValidity} onChange={h} className={inputCls} /></div>
                  <div><label className={labelCls}>Validité visite médicale</label><input name="medicalValidity" type="date" value={f.medicalValidity} onChange={h} className={inputCls} /></div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Groupe sanguin</label>
                <select name="bloodGroup" value={f.bloodGroup} onChange={h} className={`${inputCls} max-w-[200px]`}>
                  <option value="">—</option>
                  {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>

              <div>
                <h4 className="text-xs font-bold text-red-600 uppercase mb-3 flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Contacts d'urgence</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-red-50/50 p-4 rounded-xl space-y-3">
                    <p className="text-[10px] font-bold text-red-600 uppercase">Contact 1</p>
                    <input value={f.emergency1.name} onChange={e => hEmergency(1, 'name', e.target.value)} className={inputCls} placeholder="Nom" />
                    <input value={f.emergency1.relation} onChange={e => hEmergency(1, 'relation', e.target.value)} className={inputCls} placeholder="Relation (Épouse, Frère…)" />
                    <input value={f.emergency1.phone} onChange={e => hEmergency(1, 'phone', e.target.value)} className={inputCls} placeholder="Téléphone" />
                  </div>
                  <div className="bg-red-50/50 p-4 rounded-xl space-y-3">
                    <p className="text-[10px] font-bold text-red-600 uppercase">Contact 2</p>
                    <input value={f.emergency2.name} onChange={e => hEmergency(2, 'name', e.target.value)} className={inputCls} placeholder="Nom" />
                    <input value={f.emergency2.relation} onChange={e => hEmergency(2, 'relation', e.target.value)} className={inputCls} placeholder="Relation" />
                    <input value={f.emergency2.phone} onChange={e => hEmergency(2, 'phone', e.target.value)} className={inputCls} placeholder="Téléphone" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">Annuler</button>
          <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-md">
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
