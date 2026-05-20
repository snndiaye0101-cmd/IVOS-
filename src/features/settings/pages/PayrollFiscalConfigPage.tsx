import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  HelpCircle,
  Pencil,
  Save,
  SlidersHorizontal,
  Globe2,
  Percent,
  ToggleLeft,
} from 'lucide-react';
import {
  payrollSettingsStore,
  type PayrollBracket,
  type PayrollCountrySettings,
  type PayrollSettings,
} from '../../finances/services/payrollSettingsStore';
import { DEFAULT_COUNTRY_ALPHA2 } from '../../../shared/constants';

type CountryCode = 'SN' | 'CI' | 'GN';

interface RateRow {
  key: keyof PayrollCountrySettings;
  label: string;
  category: 'Retenue salariale' | 'Charge patronale' | 'Plafond';
  unit: '%' | 'montant';
}

const COUNTRY_LABELS: Record<CountryCode, string> = {
  SN: 'Sénégal',
  CI: "Côte d'Ivoire",
  GN: 'Guinée (Conakry)',
};

const RATE_ROWS: RateRow[] = [
  { key: 'ipresGeneral', label: 'IPRES ou CNPS Général', category: 'Retenue salariale', unit: '%' },
  { key: 'ipresCadre', label: 'IPRES ou CNPS Cadre', category: 'Retenue salariale', unit: '%' },
  { key: 'ipm', label: 'IPM ou Santé', category: 'Retenue salariale', unit: '%' },
  { key: 'cfce', label: 'CFCE ou VRS', category: 'Retenue salariale', unit: '%' },
  {
    key: 'ipresGeneralEmployer',
    label: 'Part patronale Général',
    category: 'Charge patronale',
    unit: '%',
  },
  {
    key: 'ipresCadreEmployer',
    label: 'Part patronale Cadre',
    category: 'Charge patronale',
    unit: '%',
  },
  { key: 'tfpEmployer', label: 'TFP (part patronale)', category: 'Charge patronale', unit: '%' },
  {
    key: 'cssPrestationsFamiliales',
    label: 'Prestations familiales',
    category: 'Charge patronale',
    unit: '%',
  },
  {
    key: 'cssAccidentTravail',
    label: 'Accidents du travail',
    category: 'Charge patronale',
    unit: '%',
  },
  {
    key: 'transportExemptCap',
    label: 'Plafond transport exonéré',
    category: 'Plafond',
    unit: 'montant',
  },
  {
    key: 'housingExemptCap',
    label: 'Plafond logement exonéré',
    category: 'Plafond',
    unit: 'montant',
  },
  {
    key: 'ipresGeneralCap',
    label: 'Plafond cotisable général',
    category: 'Plafond',
    unit: 'montant',
  },
  { key: 'ipresCadreCap', label: 'Plafond cotisable cadre', category: 'Plafond', unit: 'montant' },
];

const RATE_HELPERS: Partial<Record<keyof PayrollCountrySettings, string>> = {
  ipresGeneral: 'Pourcentage retiré du salaire pour la retraite de base.',
  ipresCadre: 'Pourcentage retraite supplémentaire pour les profils cadre.',
  ipm: 'Contribution santé prélevée sur la paie.',
  cfce: 'Prélèvement fiscal complémentaire du salarié.',
  ipresGeneralEmployer: 'Part payée par l’entreprise pour la retraite de base.',
  ipresCadreEmployer: 'Part employeur liée à la retraite cadre.',
  tfpEmployer: 'Contribution patronale dédiée à la formation professionnelle.',
  cssPrestationsFamiliales: 'Cotisation employeur pour prestations familiales.',
  cssAccidentTravail: 'Cotisation employeur pour risques d’accident du travail.',
  transportExemptCap: 'Montant maximum transport exonéré d’impôt.',
  housingExemptCap: 'Montant maximum logement exonéré d’impôt.',
  ipresGeneralCap: 'Salaire maximum pris en compte pour cotisation générale.',
  ipresCadreCap: 'Salaire maximum pris en compte pour cotisation cadre.',
};

function getRateLabel(
  key: keyof PayrollCountrySettings,
  country: CountryCode,
  defaultLabel: string
) {
  if (country !== 'GN') return defaultLabel;
  if (key === 'ipresGeneral' || key === 'ipresCadre')
    return defaultLabel.replace('IPRES ou CNPS', 'INPS');
  if (key === 'cfce') return 'RTS salarié (si applicable)';
  return defaultLabel;
}

const SWITCH_HELPERS = {
  globalAutoFiscal:
    'Active le calcul automatique des retenues et cotisations sur toutes les fiches.',
  useTransportExemptCap: 'Si actif, le montant transport exonéré est limité au plafond du pays.',
  useFiscalParts: 'Si actif, l’impôt tient compte des parts familiales (époux, enfants).',
} as const;

function formatPercent(value: number) {
  return (value * 100).toLocaleString('fr-FR', { maximumFractionDigits: 3 });
}

function formatAmount(value: number) {
  return Math.round(value).toLocaleString('fr-FR');
}

function parseAmount(raw: string) {
  return Math.max(0, Number(raw.replace(/\s/g, '').replace(',', '.')) || 0);
}

export default function PayrollFiscalConfigPage() {
  const [settings, setSettings] = useState<PayrollSettings>(() => payrollSettingsStore.load());
  const [country, setCountry] = useState<CountryCode>('SN');
  const [editingRate, setEditingRate] = useState<keyof PayrollCountrySettings | null>(null);
  const [draftRateValue, setDraftRateValue] = useState('');
  const [editingBracketIndex, setEditingBracketIndex] = useState<number | null>(null);
  const [draftBracketLimit, setDraftBracketLimit] = useState('');
  const [draftBracketRate, setDraftBracketRate] = useState('');

  useEffect(() => {
    const reload = () => setSettings(payrollSettingsStore.load());
    window.addEventListener(payrollSettingsStore.eventName, reload);
    return () => window.removeEventListener(payrollSettingsStore.eventName, reload);
  }, []);

  const countrySettings = useMemo(() => settings.countries[country], [country, settings.countries]);

  const startRateEdit = (row: RateRow) => {
    setEditingRate(row.key);
    const rawValue = Number(countrySettings[row.key] || 0);
    setDraftRateValue(row.unit === '%' ? formatPercent(rawValue) : formatAmount(rawValue));
  };

  const saveRateEdit = (row: RateRow) => {
    const value =
      row.unit === '%' ? parseAmount(draftRateValue) / 100 : parseAmount(draftRateValue);
    payrollSettingsStore.updateCountry(country, {
      [row.key]: value,
    } as Partial<PayrollCountrySettings>);
    setEditingRate(null);
    setDraftRateValue('');
  };

  const startBracketEdit = (index: number, bracket: PayrollBracket) => {
    setEditingBracketIndex(index);
    setDraftBracketLimit(Number.isFinite(bracket.upTo) ? formatAmount(bracket.upTo) : '');
    setDraftBracketRate(formatPercent(bracket.rate));
  };

  const saveBracketEdit = () => {
    if (editingBracketIndex == null) return;
    const next = [...countrySettings.irBrackets];
    next[editingBracketIndex] = {
      upTo: draftBracketLimit.trim() ? parseAmount(draftBracketLimit) : Number.POSITIVE_INFINITY,
      rate: parseAmount(draftBracketRate) / 100,
    };
    payrollSettingsStore.updateCountry(country, { irBrackets: next });
    setEditingBracketIndex(null);
    setDraftBracketLimit('');
    setDraftBracketRate('');
  };

  const toggleAutomation = (key: keyof PayrollSettings['automation']) => {
    payrollSettingsStore.updateAutomation({ [key]: !settings.automation[key] });
  };

  return (
    <div className="w-full space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-[#0f2942] via-[#1f3f6a] to-[#0f766e] p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
            <SlidersHorizontal className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Configuration Paie et Fiscalité</h1>
            <p className="mt-0.5 text-sm text-cyan-100">
              Paramétrage guidé pour utilisateurs non-comptables, pays par pays.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Sélecteur de Pays</h2>
            <p className="mt-1 text-sm text-gray-500">
              Choisissez un pays pour mettre à jour instantanément les taux et tranches ci-dessous.
            </p>
          </div>
          <div className="relative w-full max-w-xs">
            {/* Sénégal-only selector: disable other country choices */}
            <select
              value={country}
              onChange={(event) => setCountry(event.target.value as CountryCode)}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-9 text-sm font-semibold text-gray-800"
            >
              {([DEFAULT_COUNTRY_ALPHA2] as CountryCode[]).map((code) => (
                <option key={code} value={code}>
                  {COUNTRY_LABELS[code]}
                </option>
              ))}
            </select>
            <Globe2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Tableau des Taux Éditable</h2>
            <p className="mt-1 text-sm text-gray-500">
              Utilisez Modifier sur chaque ligne pour éviter les erreurs de saisie.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <Percent className="h-3.5 w-3.5" /> {COUNTRY_LABELS[country]}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Paramètre
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Type
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Valeur
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {RATE_ROWS.map((row) => {
                const value = Number(countrySettings[row.key] || 0);
                const isEditing = editingRate === row.key;
                return (
                  <tr key={String(row.key)} className="border-t border-gray-100">
                    <td className="px-5 py-3">
                      <div className="flex items-start gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {getRateLabel(row.key, country, row.label)}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">{RATE_HELPERS[row.key]}</p>
                        </div>
                        <span title={RATE_HELPERS[row.key]} className="mt-0.5 text-gray-400">
                          <HelpCircle className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{row.category}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-gray-700">
                      {isEditing ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={draftRateValue}
                          onChange={(event) => setDraftRateValue(event.target.value)}
                          className="w-36 rounded-lg border border-gray-200 px-3 py-1.5 text-right"
                        />
                      ) : row.unit === '%' ? (
                        `${formatPercent(value)}%`
                      ) : (
                        `${formatAmount(value)} FCFA`
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => saveRateEdit(row)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          <Save className="h-3.5 w-3.5" /> Enregistrer
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startRateEdit(row)}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Modifier
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-100 px-5 py-4">
          <h3 className="mb-3 text-sm font-bold text-gray-900">Tranches d'impôts</h3>
          <div className="space-y-2">
            {countrySettings.irBrackets.map((bracket, index) => {
              const isEditing = editingBracketIndex === index;
              return (
                <div
                  key={`${country}-bracket-${index}`}
                  className="grid grid-cols-[1fr_140px_auto] items-center gap-2"
                >
                  {isEditing ? (
                    <input
                      type="text"
                      value={draftBracketLimit}
                      onChange={(event) => setDraftBracketLimit(event.target.value)}
                      placeholder="Plafond"
                      className="rounded-lg border border-gray-200 px-3 py-2 text-right"
                    />
                  ) : (
                    <div className="rounded-lg bg-gray-50 px-3 py-2 text-right text-sm tabular-nums text-gray-700">
                      {Number.isFinite(bracket.upTo)
                        ? `${formatAmount(bracket.upTo)} FCFA`
                        : 'Sans plafond'}
                    </div>
                  )}
                  {isEditing ? (
                    <input
                      type="text"
                      value={draftBracketRate}
                      onChange={(event) => setDraftBracketRate(event.target.value)}
                      placeholder="Taux %"
                      className="rounded-lg border border-gray-200 px-3 py-2 text-right"
                    />
                  ) : (
                    <div className="rounded-lg bg-gray-50 px-3 py-2 text-right text-sm tabular-nums text-gray-700">
                      {formatPercent(bracket.rate)}%
                    </div>
                  )}
                  {isEditing ? (
                    <button
                      type="button"
                      onClick={saveBracketEdit}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <Save className="h-3.5 w-3.5" /> Enregistrer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startBracketEdit(index, bracket)}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Modifier
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">Zone de Contrôle</h2>
          <p className="mt-1 text-sm text-gray-500">
            Interrupteurs maîtres pour piloter le comportement fiscal sur toute l'application.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <ToggleCard
            title="Calcul auto fiscalité"
            description="Calcule automatiquement IR et cotisations selon les paramètres du pays."
            helper={SWITCH_HELPERS.globalAutoFiscal}
            active={settings.automation.globalAutoFiscal}
            onToggle={() => toggleAutomation('globalAutoFiscal')}
          />
          <ToggleCard
            title="Plafond de transport"
            description="Applique ou ignore le plafond d'exonération transport."
            helper={SWITCH_HELPERS.useTransportExemptCap}
            active={settings.automation.useTransportExemptCap}
            onToggle={() => toggleAutomation('useTransportExemptCap')}
          />
          <ToggleCard
            title="Gestion des parts fiscales"
            description="Utilise les parts familiales dans le calcul progressif de l'impôt."
            helper={SWITCH_HELPERS.useFiscalParts}
            active={settings.automation.useFiscalParts}
            onToggle={() => toggleAutomation('useFiscalParts')}
          />
        </div>
      </div>
    </div>
  );
}

function ToggleCard({
  title,
  description,
  helper,
  active,
  onToggle,
}: {
  title: string;
  description: string;
  helper: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-900">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          onClick={onToggle}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${active ? 'bg-emerald-600' : 'bg-gray-300'}`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>
      <div className="mt-2 rounded-lg border border-gray-200 bg-white/70 px-2.5 py-2 text-xs leading-relaxed text-gray-600">
        <span className="font-semibold text-gray-700">Aide:</span> {helper}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
        <ToggleLeft className={`h-4 w-4 ${active ? 'text-emerald-600' : 'text-gray-400'}`} />
        <span className={active ? 'text-emerald-700' : 'text-gray-500'}>
          {active ? 'Activé' : 'Désactivé'}
        </span>
      </div>
    </div>
  );
}
