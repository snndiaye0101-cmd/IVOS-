import { useState, useMemo } from 'react';
import {
  Wrench,
  Search,
  Archive,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

type OpStatus = 'Planifiée' | 'En cours' | 'Terminée' | 'Annulée';
type OpPriority = 'Normale' | 'Urgente' | 'Critique';
type OpType =
  | 'Tank Cleaning'
  | 'Dégazage'
  | 'Neutralisation'
  | 'Décontamination'
  | 'Pompage'
  | 'Autre';

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
  {
    id: 'OP-2026-0001',
    titre: 'Nettoyage citerne hydrocarbures',
    type: 'Tank Cleaning',
    client: 'Total Energies',
    siteCode: 'KIG',
    annee: 2026,
    plannedDate: '2026-04-10',
    status: 'En cours',
    priority: 'Urgente',
    costEstimate: 3500000,
    archived: false,
  },
  {
    id: 'OP-2026-0002',
    titre: 'Dégazage cuve de stockage B12',
    type: 'Dégazage',
    client: 'Oryx Energies',
    siteCode: 'KIG',
    annee: 2026,
    plannedDate: '2026-04-15',
    status: 'Planifiée',
    priority: 'Normale',
    costEstimate: 1800000,
    archived: false,
  },
  {
    id: 'OP-2026-0003',
    titre: 'Pompage eaux contaminées — site portuaire',
    type: 'Pompage',
    client: 'Port Autonome',
    siteCode: 'KIG',
    annee: 2026,
    plannedDate: '2026-03-28',
    status: 'Terminée',
    priority: 'Critique',
    costEstimate: 2200000,
    archived: false,
  },
  {
    id: 'OP-2025-0004',
    titre: 'Neutralisation résidus chimiques',
    type: 'Neutralisation',
    client: 'SONACOS',
    siteCode: 'KIG',
    annee: 2025,
    plannedDate: '2025-11-20',
    status: 'Terminée',
    priority: 'Normale',
    costEstimate: 4100000,
    archived: true,
  },
  {
    id: 'OP-2025-0005',
    titre: 'Décontamination zone de stockage',
    type: 'Décontamination',
    client: 'ICS',
    siteCode: 'KIG',
    annee: 2025,
    plannedDate: '2025-09-05',
    status: 'Terminée',
    priority: 'Urgente',
    costEstimate: 5600000,
    archived: true,
  },
];

const STATUS_STYLE: Record<OpStatus, string> = {
  Planifiée: 'bg-blue-50 text-blue-700',
  'En cours': 'bg-amber-50 text-amber-700',
  Terminée: 'bg-green-50 text-green-700',
  Annulée: 'bg-gray-100 text-gray-500',
};
const STATUS_ICON: Record<OpStatus, typeof Clock> = {
  Planifiée: Clock,
  'En cours': AlertTriangle,
  Terminée: CheckCircle2,
  Annulée: XCircle,
};
const PRIORITY_STYLE: Record<OpPriority, string> = {
  Normale: 'bg-gray-100 text-gray-600',
  Urgente: 'bg-orange-50 text-orange-700',
  Critique: 'bg-red-50 text-red-700',
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(n);
}

export default function OperationsSpecialesPage() {
  const [archiveMode, setArchiveMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | OpStatus>('all');
  const [ops] = useState(initialOps);

  const filtered = useMemo(() => {
    let list = ops.filter((op) => (archiveMode ? op.archived : !op.archived));
    if (filterStatus !== 'all') list = list.filter((op) => op.status === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (op) =>
          op.id.toLowerCase().includes(q) ||
          op.titre.toLowerCase().includes(q) ||
          op.client.toLowerCase().includes(q) ||
          op.type.toLowerCase().includes(q)
      );
    }
    return list;
  }, [ops, archiveMode, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    const active = ops.filter((o) => !o.archived);
    return {
      total: active.length,
      enCours: active.filter((o) => o.status === 'En cours').length,
      planifiees: active.filter((o) => o.status === 'Planifiée').length,
      terminees: active.filter((o) => o.status === 'Terminée').length,
    };
  }, [ops]);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1a1a2e] via-indigo-900 to-indigo-800 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/15 p-2.5 backdrop-blur-sm">
              <Wrench className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Opérations Spéciales</h1>
              <p className="mt-0.5 text-sm text-indigo-200">
                Tank Cleaning, Dégazage, Pompage & autres opérations techniques
              </p>
            </div>
            {archiveMode && (
              <span className="ml-2 rounded-full border border-amber-400/30 bg-amber-400/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-200">
                Archives
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!archiveMode && (
              <button className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold backdrop-blur-sm transition-all hover:bg-white/25">
                <Plus className="h-4 w-4" /> Nouvelle Opération
              </button>
            )}
            <button
              onClick={() => setArchiveMode((a) => !a)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                archiveMode
                  ? 'border border-amber-400/30 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            {
              label: 'Total',
              value: stats.total,
              color: 'from-[#1a1a2e] to-indigo-800',
              textColor: 'text-[#1a1a2e]',
              bg: 'bg-indigo-50',
              icon: Wrench,
            },
            {
              label: 'En cours',
              value: stats.enCours,
              color: 'from-amber-500 to-amber-600',
              textColor: 'text-amber-700',
              bg: 'bg-amber-50',
              icon: AlertTriangle,
            },
            {
              label: 'Planifiées',
              value: stats.planifiees,
              color: 'from-blue-500 to-blue-600',
              textColor: 'text-blue-700',
              bg: 'bg-blue-50',
              icon: Clock,
            },
            {
              label: 'Terminées',
              value: stats.terminees,
              color: 'from-green-500 to-green-600',
              textColor: 'text-green-700',
              bg: 'bg-green-50',
              icon: CheckCircle2,
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm"
            >
              <div
                className={`absolute bottom-0 left-0 top-0 w-1 bg-gradient-to-b ${kpi.color} rounded-l-2xl`}
              />
              <div className="flex items-center gap-3 pl-3">
                <div className={`p-2 ${kpi.bg} rounded-lg`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.textColor}`} />
                </div>
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
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par n°, titre, client, type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'all' as const, label: 'Toutes' },
              { key: 'Planifiée' as const, label: 'Planifiées' },
              { key: 'En cours' as const, label: 'En cours' },
              { key: 'Terminée' as const, label: 'Terminées' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  filterStatus === f.key
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4">
          <Archive className="h-5 w-5 flex-shrink-0 text-amber-600" />
          <p className="text-sm font-medium text-amber-800">
            Mode lecture seule — les archives annuelles ne peuvent pas être modifiées.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1a1a2e]">
                <th className="w-[140px] px-5 py-3.5 text-left text-xs font-bold uppercase text-white">
                  N° Opération
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-bold uppercase text-white">
                  Titre
                </th>
                <th className="w-[130px] px-5 py-3.5 text-left text-xs font-bold uppercase text-white">
                  Type
                </th>
                <th className="w-[150px] px-5 py-3.5 text-left text-xs font-bold uppercase text-white">
                  Client
                </th>
                <th className="w-[100px] px-5 py-3.5 text-left text-xs font-bold uppercase text-white">
                  Site
                </th>
                <th className="w-[110px] px-5 py-3.5 text-left text-xs font-bold uppercase text-white">
                  Date prévue
                </th>
                <th className="w-[100px] px-5 py-3.5 text-center text-xs font-bold uppercase text-white">
                  Priorité
                </th>
                <th className="w-[130px] px-5 py-3.5 text-right text-xs font-bold uppercase text-white">
                  Coût estimé
                </th>
                <th className="w-[110px] px-5 py-3.5 text-center text-xs font-bold uppercase text-white">
                  Statut
                </th>
                <th className="w-[100px] px-5 py-3.5 text-right text-xs font-bold uppercase text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-gray-400">
                    <Wrench className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                    <p className="font-medium">Aucune opération trouvée</p>
                    <p className="mt-1 text-xs">
                      Modifiez vos filtres ou créez une nouvelle opération
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((op) => {
                  const StatusIcon = STATUS_ICON[op.status];
                  return (
                    <tr
                      key={op.id}
                      className={`transition-colors ${archiveMode ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-gray-50/50'}`}
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-bold text-[#1a1a2e]">{op.id}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-gray-800">{op.titre}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                          {op.type}
                        </span>
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
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_STYLE[op.priority]}`}
                        >
                          {op.priority}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-gray-800">
                        {formatCurrency(op.costEstimate)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[op.status]}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" /> {op.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
                            title="Voir"
                          >
                            <Eye className="h-4 w-4 text-gray-500" />
                          </button>
                          {!archiveMode && (
                            <>
                              <button
                                className="rounded-lg p-1.5 transition-colors hover:bg-blue-50"
                                title="Modifier"
                              >
                                <Edit2 className="h-4 w-4 text-blue-500" />
                              </button>
                              <button
                                className="rounded-lg p-1.5 transition-colors hover:bg-red-50"
                                title="Supprimer"
                              >
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
