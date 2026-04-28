/**
 * Analytics Dashboard Page - Reporting & Impact QHSE
 * Dashboard analytique complet avec graphiques, KPIs et filtres
 */

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  BarChart2,
  PieChart as PieChartIcon,
  Download,
  Filter,
  Calendar,
  Users,
  MapPin,
  Package,
  CheckCircle,
  FileText,
  Recycle,
  Globe,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import WebExportModal from '../components/WebExportModal';
import {
  extractImpactMetrics,
  extractMonthlyEvolution,
  getCurrentMonthPeriod,
  getCurrentQuarterPeriod,
  getCurrentYearPeriod,
  getCustomPeriod,
  type ImpactMetrics,
  type AnalyticsPeriod,
  type PeriodType,
} from '@/shared/services/dataAnalyticsService';

export default function AnalyticsDashboardPage() {
  const [metrics, setMetrics] = useState<ImpactMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filtres
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal export
  const [showWebExport, setShowWebExport] = useState(false);

  // Charger les données
  useEffect(() => {
    loadData();
  }, [selectedPeriod, customStartDate, customEndDate, selectedClient, selectedSite]);

  const loadData = async () => {
    setLoading(true);
    
    try {
      // Déterminer la période
      let period: AnalyticsPeriod;
      
      switch (selectedPeriod) {
        case 'month':
          period = getCurrentMonthPeriod();
          break;
        case 'quarter':
          period = getCurrentQuarterPeriod();
          break;
        case 'year':
          period = getCurrentYearPeriod();
          break;
        case 'custom':
          if (!customStartDate || !customEndDate) {
            setLoading(false);
            return;
          }
          period = getCustomPeriod(customStartDate, customEndDate);
          break;
        default:
          period = getCurrentMonthPeriod();
      }
      
      // Extraire les métriques
      const extracted = extractImpactMetrics(period);
      
      // Ajouter l'évolution si année
      if (selectedPeriod === 'year') {
        const year = new Date().getFullYear();
        extracted.evolutionData = extractMonthlyEvolution(year);
      }
      
      // Filtrer par client si sélectionné
      if (selectedClient !== 'all') {
        // Filtrer les données par secteur
        extracted.sectorBreakdown = extracted.sectorBreakdown.filter(
          s => s.sector === selectedClient
        );
      }
      
      setMetrics(extracted);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Clients uniques pour le filtre
  const availableClients = useMemo(() => {
    if (!metrics) return [];
    return ['all', ...metrics.sectorBreakdown.map(s => s.sector)];
  }, [metrics]);

  // Sites disponibles (mock pour l'instant)
  const availableSites = ['all', 'Dakar', 'Thiès', 'Saint-Louis'];

  // Formatage
  const formatTonnage = (kg: number): string => {
    const tonnes = kg / 1000;
    return `${tonnes.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} t`;
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString('fr-FR');
  };

  // Couleurs pour les graphiques
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto" />
          <p className="mt-4 text-lg font-medium text-gray-700">Chargement des données analytiques...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <BarChart2 className="w-16 h-16 text-orange-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900 mt-4">Aucune Donnée</h2>
          <p className="text-gray-600 mt-2">
            Aucun BSD finalisé trouvé pour la période sélectionnée.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-[1920px] mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <BarChart2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Reporting & Impact</h1>
                <p className="text-gray-600 mt-1">Analyse avancée des opérations QHSE</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                  showFilters
                    ? 'bg-blue-600 text-white'
                    : 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-5 h-5" />
                <span>Filtres</span>
              </button>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Actualiser</span>
              </button>

              <button
                onClick={() => setShowWebExport(true)}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
              >
                <Globe className="w-5 h-5" />
                <span>Générer Infographie</span>
              </button>
            </div>
          </div>

          {/* Filtres */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-4 gap-4">
                {/* Période */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Période
                  </label>
                  <div className="flex gap-2">
                    {(['month', 'quarter', 'year'] as PeriodType[]).map((period) => (
                      <button
                        key={period}
                        onClick={() => setSelectedPeriod(period)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedPeriod === period
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300'
                        }`}
                      >
                        {period === 'month' && 'Mois'}
                        {period === 'quarter' && 'Trim.'}
                        {period === 'year' && 'Année'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Client */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Secteur
                  </label>
                  <select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Tous les secteurs</option>
                    {availableClients.filter(c => c !== 'all').map((client) => (
                      <option key={client} value={client}>
                        {client}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Site */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Site
                  </label>
                  <select
                    value={selectedSite}
                    onChange={(e) => setSelectedSite(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {availableSites.map((site) => (
                      <option key={site} value={site}>
                        {site === 'all' ? 'Tous les sites' : site}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Période */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Affichage
                  </label>
                  <div className="text-lg font-bold text-blue-600">
                    {metrics.period.label}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-6">
          {/* Tonnage Total */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-green-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Tonnage Total Collecté</p>
            <p className="text-3xl font-bold text-gray-900">{formatTonnage(metrics.totalTonnage)}</p>
            <p className="text-xs text-gray-500 mt-2">
              {metrics.totalOperations} opérations
            </p>
          </div>

          {/* BSD Finalisés */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">BSD Finalisés</p>
            <p className="text-3xl font-bold text-gray-900">{formatNumber(metrics.totalOperations)}</p>
            <p className="text-xs text-gray-500 mt-2">
              Moy. {formatTonnage(metrics.averagePerOperation)} / BSD
            </p>
          </div>

          {/* Taux de Valorisation */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Recycle className="w-6 h-6 text-purple-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Taux de Valorisation</p>
            <p className="text-3xl font-bold text-gray-900">
              {Math.round(metrics.valorisationRate)}%
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Recyclage & valorisation
            </p>
          </div>

          {/* Secteurs */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Secteurs Accompagnés</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatNumber(metrics.sectorBreakdown.length)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Clients anonymisés
            </p>
          </div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-2 gap-6">
          {/* Répartition par Type */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-blue-600" />
              Répartition par Type de Déchet
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.wasteBreakdown.map((wb) => ({
                    name: wb.categoryLabel,
                    value: wb.tonnage,
                    percentage: wb.percentage,
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${Math.round(percentage)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {metrics.wasteBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatTonnage(value)}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '12px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Répartition par Secteur */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Répartition par Secteur (Anonymisé)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={metrics.sectorBreakdown.map((sb) => ({
                  name: sb.sector.replace('Secteur ', ''),
                  tonnage: sb.tonnage / 1000,
                  percentage: sb.percentage,
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" label={{ value: 'Tonnes', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '12px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)} t`, 'Tonnage']}
                />
                <Bar dataKey="tonnage" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Évolution Mensuelle */}
        {metrics.evolutionData && metrics.evolutionData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Évolution Mensuelle du Volume de Collecte
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart
                data={metrics.evolutionData.map((ev) => ({
                  month: ev.monthLabel.split(' ')[0],
                  tonnage: ev.tonnage / 1000,
                  operations: ev.operations,
                }))}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorTonnage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" label={{ value: 'Tonnes', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '12px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'tonnage') return [`${value.toFixed(1)} tonnes`, 'Tonnage'];
                    return [value, 'Opérations'];
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="tonnage"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorTonnage)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Méthodes de Traitement */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Recycle className="w-5 h-5 text-purple-600" />
            Méthodes de Traitement et Valorisation
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {metrics.treatmentBreakdown.map((tb, index) => (
              <div
                key={index}
                className={`p-5 rounded-xl border-2 transition-all hover:shadow-md ${
                  tb.isValorization
                    ? 'bg-purple-50 border-purple-200 hover:border-purple-300'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-900">{tb.methodLabel}</span>
                  {tb.isValorization && (
                    <Recycle className="w-5 h-5 text-purple-600" />
                  )}
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {formatTonnage(tb.tonnage)}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{tb.count} opérations</span>
                  <span className="font-medium text-gray-900">{Math.round(tb.percentage)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Export Web */}
      {showWebExport && (
        <WebExportModal
          metrics={metrics}
          onClose={() => setShowWebExport(false)}
        />
      )}
    </div>
  );
}
