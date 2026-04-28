import { useState, useMemo } from 'react';
import {
  Wrench, Search, Archive, Plus, Eye, Edit2, Trash2,
  Clock, MapPin, AlertTriangle, CheckCircle2, XCircle,
} from 'lucide-react';

type OpStatus = 'Planifiée' | 'En cours' | 'Terminée' | 'Annulée';
type OpPriority = 'Normale' | 'Urgente' | 'Critique';
type OpType = 'Tank Cleaning' | 'Dégazage' | 'Neutralisation' | 'Décontamination' | 'Pompage' | 'Autre';

interface SpecialOp {
  id: string;
  titre: string;
  type: OpType;
  client: string;
  siteCode: string;
  annee: number;
  plannedDate: string;
  status: OpStatus;
  priority: OpPriority;
  costEstimate: number;
  archived: boolean;
}

const initialOps: SpecialOp[] = [
  { id: 'OP-2026-0001', titre: 'Nettoyage citerne hydrocarbures', type: 'Tank Cleaning', client: 'Total Energies', siteCode: 'KIG', annee: 2026, plannedDate: '2026-04-10', status: 'En cours', priority: 'Urgente', costEstimate: 3500000, archived: false },
  { id: 'OP-2026-0002', titre: 'Dégazage cuve de stockage B12', type: 'Dégazage', client: 'Oryx Energies', siteCode: 'KIG', annee: 2026, plannedDate: '2026-04-15', status: 'Planifiée', priority: 'Normale', costEstimate: 1800000, archived: false },
  { id: 'OP-2026-0003', titre: 'Pompage eaux contaminées — site portuaire', type: 'Pompage', client: 'Port Autonome', siteCode: 'KIG', annee: 2026, plannedDate: '2026-03-28', status: 'Terminée', priority: 'Critique', costEstimate: 2200000, archived: false },
  { id: 'OP-2025-0004', titre: 'Neutralisation résidus chimiques', type: 'Neutralisation', client: 'SONACOS', siteCode: 'KIG', annee: 2025, plannedDate: '2025-11-20', status: 'Terminée', priority: 'Normale', costEstimate: 4100000, archived: true },
  { id: 'OP-2025-0005', titre: 'Décontamination zone de stockage', type: 'Décontamination', client: 'ICS', siteCode: 'KIG', annee: 2025, plannedDate: '2025-09-05', status: 'Terminée', priority: 'Urgente', costEstimate: 5600000, archived: true },
];

const STATUS_STYLE: Record<OpStatus, string> = {
  'Planifiée': 'bg-blue-50 text-blue-700',
  'En cours': 'bg-amber-50 text-amber-700',
  'Terminée': 'bg-green-50 text-green-700',
  'Annulée': 'bg-gray-100 text-gray-500',
};
const STATUS_ICON: Record<OpStatus, typeof Clock> = {
  'Planifiée': Clock,
  'En cours': AlertTriangle,
  'Terminée': CheckCircle2,
  'Annulée': XCircle,
};
const PRIORITY_STYLE: Record<OpPriority, string> = {
  Normale: 'bg-gray-100 text-gray-600',
  Urgente: 'bg-orange-50 text-orange-700',
  Critique: 'bg-red-50 text-red-700',
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(n);
}

export default function OperationsSpecialesPage() {
  const [archiveMode, setArchiveMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | OpStatus>('all');
  const [ops] = useState(initialOps);

  const filtered = useMemo(() => {
    let list = ops.filter(op => archiveMode ? op.archived : !op.archived);
    if (filterStatus !== 'all') list = list.filter(op => op.status === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(op =>
        op.id.toLowerCase().includes(q) ||
        op.titre.toLowerCase().includes(q) ||
        op.client.toLowerCase().includes(q) ||
        op.type.toLowerCase().includes(q)
      );
    }
    return list;
  }, [ops, archiveMode, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    const active = ops.filter(o => !o.archived);
    return {
      total: active.length,
      enCours: active.filter(o => o.status === 'En cours').length,
      planifiees: active.filter(o => o.status === 'Planifiée').length,
      terminees: active.filter(o => o.status === 'Terminée').length,
    };
  }, [ops]);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] via-indigo-900 to-indigo-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm">
              <Wrench className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Opérations Spéciales</h1>
              <p className="text-indigo-200 text-sm mt-0.5">Tank Cleaning, Dégazage, Pompage & autres opérations techniques</p>
            </div>
            {archiveMode && (
              <span className="ml-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-200 text-xs font-bold border border-amber-400/30 uppercase tracking-wider">
                Archives
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!archiveMode && (
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 rounded-xl text-sm font-semibold backdrop-blur-sm transition-all">
                <Plus className="h-4 w-4" /> Nouvelle Opération
              </button>
            )}
            <button
              onClick={() => setArchiveMode(a => !a)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                archiveMode
                  ? 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-400/30'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              <Archive className="h-4 w-4" />
              {archiveMode ? 'Quitter les Archives' : 'Archives'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {!archiveMode && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'from-[#1a1a2e] to-indigo-800', textColor: 'text-[#1a1a2e]', bg: 'bg-indigo-50', icon: Wrench },
            { label: 'En cours', value: stats.enCours, color: 'from-amber-500 to-amber-600', textColor: 'text-amber-700', bg: 'bg-amber-50', icon: AlertTriangle },
            { label: 'Planifiées', value: stats.planifiees, color: 'from-blue-500 to-blue-600', textColor: 'text-blue-700', bg: 'bg-blue-50', icon: Clock },
            { label: 'Terminées', value: stats.terminees, color: 'from-green-500 to-green-600', textColor: 'text-green-700', bg: 'bg-green-50', icon: CheckCircle2 },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${kpi.color} rounded-l-2xl`} />
              <div className="flex items-center gap-3 pl-3">
                <div className={`p-2 ${kpi.bg} rounded-lg`}><kpi.icon className={`h-5 w-5 ${kpi.textColor}`} /></div>
                <div>
                  <p className="text-xs text-gray-500">{kpi.label}</p>
                  <p className={`text-xl font-bold ${kpi.textColor}`}>{kpi.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par n°, titre, client, type..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { key: 'all' as const, label: 'Toutes' },
              { key: 'Planifiée' as const, label: 'Planifiées' },
              { key: 'En cours' as const, label: 'En cours' },
              { key: 'Terminée' as const, label: 'Terminées' },
            ]).map(f => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  filterStatus === f.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Archive banner */}
      {archiveMode && (
        <div className="bg-amber-50 rounded-2xl p-4 flex items-center gap-3">
          <Archive className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium">Mode lecture seule — les archives annuelles ne peuvent pas être modifiées.</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1a1a2e]">
                <th className="text-left px-5 py-3.5 font-bold text-white text-xs uppercase w-[140px]">N° Opération</th>
                <th className="text-left px-5 py-3.5 font-bold text-white text-xs uppercase">Titre</th>
                <th className="text-left px-5 py-3.5 font-bold text-white text-xs uppercase w-[130px]">Type</th>
                <th className="text-left px-5 py-3.5 font-bold text-white text-xs uppercase w-[150px]">Client</th>
                <th className="text-left px-5 py-3.5 font-bold text-white text-xs uppercase w-[100px]">Site</th>
                <th className="text-left px-5 py-3.5 font-bold text-white text-xs uppercase w-[110px]">Date prévue</th>
                <th className="text-center px-5 py-3.5 font-bold text-white text-xs uppercase w-[100px]">Priorité</th>
                <th className="text-right px-5 py-3.5 font-bold text-white text-xs uppercase w-[130px]">Coût estimé</th>
                <th className="text-center px-5 py-3.5 font-bold text-white text-xs uppercase w-[110px]">Statut</th>
                <th className="text-right px-5 py-3.5 font-bold text-white text-xs uppercase w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-gray-400">
                    <Wrench className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">Aucune opération trouvée</p>
                    <p className="text-xs mt-1">Modifiez vos filtres ou créez une nouvelle opération</p>
                  </td>
                </tr>
              ) : (
                filtered.map(op => {
                  const StatusIcon = STATUS_ICON[op.status];
                  return (
                    <tr key={op.id} className={`transition-colors ${archiveMode ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-gray-50/50'}`}>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-bold text-[#1a1a2e]">{op.id}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-gray-800">{op.titre}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700">{op.type}</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700">{op.client}</td>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-1 text-gray-600">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" /> {op.siteCode}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {new Date(op.plannedDate).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${PRIORITY_STYLE[op.priority]}`}>
                          {op.priority}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-gray-800">
                        {formatCurrency(op.costEstimate)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[op.status]}`}>
                          <StatusIcon className="h-3.5 w-3.5" /> {op.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Voir">
                            <Eye className="h-4 w-4 text-gray-500" />
                          </button>
                          {!archiveMode && (
                            <>
                              <button className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors" title="Modifier">
                                <Edit2 className="h-4 w-4 text-blue-500" />
                              </button>
                              <button className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </button>
                            </>
                          )}
                        </div>
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
}
