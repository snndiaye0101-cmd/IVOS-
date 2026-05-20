/**
 * Page Rapport d'Impact — Dashboard QHSE
 * Affiche les indicateurs environnementaux extraits des BSD finalisés
 */

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Download,
  RefreshCw,
  Globe,
  CheckCircle,
  AlertCircle,
  Package,
  Leaf,
  Factory,
  Recycle,
} from 'lucide-react';
import PieChart from '@/shared/components/charts/PieChart';
import BarChart from '@/shared/components/charts/BarChart';
import WebExportModal from '../components/WebExportModal';
import {
  extractImpactMetrics,
  extractMonthlyEvolution,
  getCurrentMonthPeriod,
  getCurrentQuarterPeriod,
  getCurrentYearPeriod,
  getCustomPeriod,
  saveReportCache,
  loadReportCache,
  type ImpactMetrics,
  type AnalyticsPeriod,
  type PeriodType,
} from '@/shared/services/dataAnalyticsService';

export default function ImpactReportPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ImpactMetrics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showWebExport, setShowWebExport] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Charger les données
  useEffect(() => {
    loadData(false);
  }, [selectedPeriod, customStartDate, customEndDate]);

  const loadData = async (forceRefresh: boolean = false) => {
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

      // Essayer le cache si pas de forceRefresh
      if (!forceRefresh) {
        const cached = loadReportCache(period);
        if (cached) {
          setMetrics(cached);
          setLoading(false);
          return;
        }
      }

      // Extraire les métriques
      const extracted = extractImpactMetrics(period);

      // Ajouter l'évolution mensuelle si année
      if (selectedPeriod === 'year') {
        const year = new Date().getFullYear();
        extracted.evolutionData = extractMonthlyEvolution(year);
      }

      // Sauvegarder dans le cache
      saveReportCache(period, extracted);

      setMetrics(extracted);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const formatTonnage = (kg: number): string => {
    const tonnes = kg / 1000;
    return `${tonnes.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} tonnes`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-b-4 border-green-600" />
          <p className="mt-4 text-lg font-medium text-gray-700">Extraction des données BSD...</p>
          <p className="mt-1 text-sm text-gray-500">Analyse en cours</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <AlertCircle className="mx-auto h-16 w-16 text-orange-500" />
          <h2 className="mt-4 text-xl font-bold text-gray-900">Aucune Donnée</h2>
          <p className="mt-2 text-gray-600">
            Aucun BSD finalisé trouvé pour la période sélectionnée.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-green-600">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Rapport d'Impact Environnemental
                </h1>
                <p className="mt-1 text-gray-600">
                  Analyse des BSD finalisés (Section 9 complète) — Data Mining QHSE
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-xl border-2 border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Actualiser</span>
              </button>

              <button
                onClick={() => setShowWebExport(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-6 py-2 text-white shadow-lg transition-all hover:from-green-700 hover:to-green-800"
              >
                <Globe className="h-5 w-5" />
                <span>Exporter pour le Web</span>
              </button>
            </div>
          </div>

          {/* Period Selector */}
          <div className="mt-6 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-500" />
            <div className="flex items-center gap-2">
              {(['month', 'quarter', 'year', 'custom'] as PeriodType[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                    selectedPeriod === period
                      ? 'bg-green-600 text-white shadow-lg'
                      : 'border-2 border-gray-200 bg-white text-gray-700 hover:border-green-300'
                  }`}
                >
                  {period === 'month' && 'Mois'}
                  {period === 'quarter' && 'Trimestre'}
                  {period === 'year' && 'Année'}
                  {period === 'custom' && 'Personnalisé'}
                </button>
              ))}
            </div>

            {selectedPeriod === 'custom' && (
              <div className="ml-4 flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="rounded-lg border-2 border-gray-200 px-3 py-2"
                />
                <span className="text-gray-500">à</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="rounded-lg border-2 border-gray-200 px-3 py-2"
                />
              </div>
            )}

            <div className="ml-auto text-right">
              <p className="text-2xl font-bold text-gray-900">{metrics.period.label}</p>
              <p className="text-sm text-gray-500">
                Généré le{' '}
                {new Date(metrics.generatedAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-6">
          <div className="rounded-2xl border-l-4 border-green-600 bg-white p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tonnage Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatTonnage(metrics.totalTonnage)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border-l-4 border-blue-600 bg-white p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Opérations BSD</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalOperations}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border-l-4 border-purple-600 bg-white p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                <Recycle className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Taux de Valorisation</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(metrics.valorisationRate)}%
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border-l-4 border-orange-600 bg-white p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
                <Factory className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Secteurs Accompagnés</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.sectorBreakdown.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-2 gap-6">
          {/* Waste Breakdown */}
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center gap-3">
              <PieChartIcon className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Répartition par Type de Déchet</h2>
            </div>
            <PieChart
              data={metrics.wasteBreakdown.map((wb) => ({
                label: wb.categoryLabel,
                value: wb.tonnage,
                percentage: wb.percentage,
                color: wb.color,
              }))}
              size={350}
            />
          </div>

          {/* Sector Breakdown */}
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center gap-3">
              <Factory className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Répartition par Secteur</h2>
            </div>
            <div className="mb-4 rounded-xl border-2 border-blue-200 bg-blue-50 p-3 text-sm text-gray-600">
              <CheckCircle className="mr-2 inline h-4 w-4 text-blue-600" />
              Les noms de clients sont automatiquement anonymisés
            </div>
            <PieChart
              data={metrics.sectorBreakdown.map((sb) => ({
                label: sb.sector,
                value: sb.tonnage,
                percentage: sb.percentage,
                color: ['#1e40af', '#dc2626', '#16a34a', '#ea580c', '#9333ea'][
                  metrics.sectorBreakdown.indexOf(sb) % 5
                ],
              }))}
              size={350}
            />
          </div>
        </div>

        {/* Treatment Breakdown */}
        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <div className="mb-6 flex items-center gap-3">
            <Recycle className="h-6 w-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">
              Méthodes de Traitement et Valorisation
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {metrics.treatmentBreakdown.map((tb, index) => (
              <div
                key={index}
                className={`rounded-xl border-2 p-4 ${
                  tb.isValorization
                    ? 'border-purple-200 bg-purple-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {tb.isValorization && <Leaf className="h-5 w-5 text-purple-600" />}
                    <span className="font-medium text-gray-900">{tb.methodLabel}</span>
                  </div>
                  <span className="text-sm text-gray-600">{Math.round(tb.percentage)}%</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatTonnage(tb.tonnage)}</p>
                <p className="mt-1 text-sm text-gray-600">
                  {tb.count} opération{tb.count > 1 ? 's' : ''}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Evolution */}
        {metrics.evolutionData && metrics.evolutionData.length > 0 && (
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-6 flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Évolution Mensuelle</h2>
            </div>
            <BarChart
              data={metrics.evolutionData.map((ev) => ({
                label: ev.monthLabel.split(' ')[0], // Juste le mois
                value: ev.tonnage,
                color: '#10b981',
              }))}
              width={1000}
              height={400}
            />
          </div>
        )}
      </div>

      {/* Web Export Modal */}
      {showWebExport && (
        <WebExportModal metrics={metrics} onClose={() => setShowWebExport(false)} />
      )}
    </div>
  );
}
