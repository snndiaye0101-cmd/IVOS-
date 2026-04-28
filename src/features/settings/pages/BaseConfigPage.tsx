import React, { useState, useEffect, useRef } from 'react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Settings, Clock, Plus, Trash2, Save, MapPin, Building2, Navigation, Loader2, CheckCircle2, DollarSign, AlertTriangle } from 'lucide-react';
import { getAnnualBudget, saveAnnualBudget, isBudgetExceeded } from '../../../shared/services/budgetService';
import { loadBaseConfig, saveBaseConfig, type BaseConfig, type Shift } from '../services/baseConfigStore';

export const SITE_KEY = 'ivos_site_config_v1';

interface SiteConfig { siteAddress: string; lat: number | null; lng: number | null; }

const SITE_DEFAULTS: SiteConfig = { siteAddress: '', lat: null, lng: null };

function loadSiteConfig(): SiteConfig {
  try {
    const raw = localStorage.getItem(SITE_KEY);
    if (raw) return { ...SITE_DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return SITE_DEFAULTS;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function BaseConfigPage() {
  const [config, setConfig] = useState<BaseConfig>(loadBaseConfig);
  const [saved, setSaved] = useState(false);

  // --- Gestion Budget ---
  const [annualBudget, setAnnualBudget] = useState<string>(getAnnualBudget().toString());
  const [budgetSaved, setBudgetSaved] = useState(false);
  const [budgetError, setBudgetError] = useState('');

  // --- Site Opérationnel ---
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(loadSiteConfig);
  const [query, setQuery] = useState(loadSiteConfig().siteAddress);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [siteSaved, setSiteSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Nominatim autocomplete with debounce
  useEffect(() => {
    if (query.length < 3) { setSuggestions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
          { headers: { 'Accept-Language': 'fr' } }
        );
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelectSuggestion(result: NominatimResult) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setSiteConfig({ siteAddress: result.display_name, lat, lng });
    setQuery(result.display_name);
    setSuggestions([]);
  }

  function handleSaveSite() {
    localStorage.setItem(SITE_KEY, JSON.stringify(siteConfig));
    setSiteSaved(true);
    setTimeout(() => setSiteSaved(false), 3000);
  }

  const hInfo = (e: React.ChangeEvent<HTMLInputElement>) => setConfig(prev => ({ ...prev, [e.target.name]: e.target.value }));

  function addShift() {
    setConfig(prev => ({ ...prev, shifts: [...prev.shifts, { id: Date.now(), name: '', start: '08:00', end: '16:00' }] }));
  }
  function removeShift(id: number) {
    setConfig(prev => ({ ...prev, shifts: prev.shifts.filter(s => s.id !== id) }));
  }
  function updateShift(id: number, field: keyof Shift, value: string) {
    setConfig(prev => ({ ...prev, shifts: prev.shifts.map(s => s.id === id ? { ...s, [field]: value } : s) }));
  }
  function handleSave() {
    saveBaseConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleSaveBudget() {
    const amount = parseFloat(annualBudget);
    if (isNaN(amount) || amount <= 0) {
      setBudgetError('Veuillez saisir un montant valide');
      return;
    }
    
    // Vérifier si le budget est inférieur aux dépenses actuelles
    // Simuler un calcul de dépenses pour la démo (à remplacer par vos vraies données)
    const currentExpenses = 0; // TODO: récupérer depuis le Dashboard Finance
    
    saveAnnualBudget(amount);
    setBudgetSaved(true);
    setBudgetError('');
    setTimeout(() => setBudgetSaved(false), 3000);
  }

  function handleBudgetChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAnnualBudget(e.target.value);
    setBudgetError('');
  }

  return (
    <div className="w-full min-h-screen">
      <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-6 mb-6 text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center"><Settings className="w-7 h-7" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Configuration de la Base</h1>
            <p className="text-sm text-gray-300">Paramètres généraux et gestion des shifts</p>
          </div>
        </div>
        <button onClick={handleSave} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md ${saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
          <Save className="w-4 h-4" />
          {saved ? 'Enregistré !' : 'Sauvegarder'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 uppercase"><Building2 className="w-4 h-4 text-blue-600" /> Informations générales</h2>
          <Input label="Nom de la base" name="baseName" value={config.baseName} onChange={hInfo} />
          <Input label="Adresse" name="address" value={config.address} onChange={hInfo} />
          <Input label="Téléphone" name="phone" value={config.phone} onChange={hInfo} />
          <Input label="Email" name="email" value={config.email} onChange={hInfo} type="email" />
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-md p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 uppercase"><Clock className="w-4 h-4 text-indigo-600" /> Gestion des Shifts</h2>
            <button onClick={addShift} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl">
            <table className="min-w-full">
              <thead>
                <tr className="bg-[#1a1a2e] text-white text-xs uppercase">
                  <th className="px-4 py-3 text-left">Nom du Shift</th>
                  <th className="px-4 py-3 text-left">Heure Début</th>
                  <th className="px-4 py-3 text-left">Heure Fin</th>
                  <th className="px-4 py-3 text-left w-16"></th>
                </tr>
              </thead>
              <tbody>
                {config.shifts.map((s, idx) => (
                  <tr key={s.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                    <td className="px-4 py-2"><input className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={s.name} onChange={e => updateShift(s.id, 'name', e.target.value)} /></td>
                    <td className="px-4 py-2"><input type="time" className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={s.start} onChange={e => updateShift(s.id, 'start', e.target.value)} /></td>
                    <td className="px-4 py-2"><input type="time" className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={s.end} onChange={e => updateShift(s.id, 'end', e.target.value)} /></td>
                    <td className="px-4 py-2"><button onClick={() => removeShift(s.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
                {config.shifts.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-gray-400">Aucun shift configuré</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Paramètres du Site Opérationnel ── */}
      <div className="bg-white rounded-2xl shadow-md p-5 mt-2">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 uppercase">
            <Navigation className="w-4 h-4 text-emerald-600" />
            Paramètres du Site Opérationnel
          </h2>
          {siteConfig.lat && siteConfig.lng && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Coordonnées enregistrées
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Adresse du Site */}
          <div className="lg:col-span-2 space-y-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
              Adresse du Site
            </label>
            <input
              type="text"
              placeholder="Ex: Terminal IVOS, Zone Portuaire, Dakar"
              value={siteConfig.siteAddress}
              onChange={e => setSiteConfig(prev => ({ ...prev, siteAddress: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          {/* Coordonnées GPS – Autocomplete Nominatim */}
          <div className="space-y-1 relative" ref={suggestionsRef}>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
              Recherche GPS (Nominatim)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Tapez pour rechercher..."
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setSiteConfig(prev => ({ ...prev, siteAddress: e.target.value, lat: null, lng: null }));
                }}
                className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              {loadingSuggestions && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
              {!loadingSuggestions && <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />}
            </div>

            {/* Dropdown suggestions */}
            {suggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                {suggestions.map(s => (
                  <button
                    key={s.place_id}
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 border-b border-gray-100 last:border-0 transition-colors"
                  >
                    <MapPin className="inline w-3 h-3 mr-1.5 text-emerald-500" />
                    {s.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lat / Lng preview */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Latitude</label>
            <input
              type="number"
              step="any"
              placeholder="14.7167"
              value={siteConfig.lat ?? ''}
              onChange={e => setSiteConfig(prev => ({ ...prev, lat: parseFloat(e.target.value) || null }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Longitude</label>
            <input
              type="number"
              step="any"
              placeholder="-17.4677"
              value={siteConfig.lng ?? ''}
              onChange={e => setSiteConfig(prev => ({ ...prev, lng: parseFloat(e.target.value) || null }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSaveSite}
            disabled={!siteConfig.lat || !siteConfig.lng}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed
              ${siteSaved ? 'bg-emerald-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
          >
            {siteSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {siteSaved ? 'Position Enregistrée !' : 'Enregistrer la Position du Site'}
          </button>
        </div>
      </div>

      {/* ── Gestion Budget ── */}
      <div className="bg-white rounded-2xl shadow-md p-5 mt-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 uppercase">
            <DollarSign className="w-4 h-4 text-green-600" />
            Gestion Budget
          </h2>
          {budgetSaved && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Budget enregistré
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Champ de saisie du budget */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
              Budget Annuel Global (FCFA)
            </label>
            <input
              type="number"
              placeholder="Ex: 120000000"
              value={annualBudget}
              onChange={handleBudgetChange}
              min="0"
              step="1000000"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            {budgetError && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {budgetError}
              </p>
            )}
            <p className="text-xs text-gray-500">
              Montant formaté : {parseFloat(annualBudget || '0').toLocaleString('fr-FR')} FCFA
            </p>
          </div>

          {/* Informations et bouton */}
          <div className="flex flex-col justify-between">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-3">
              <p className="text-xs font-semibold text-blue-800 mb-1">ℹ️ Information</p>
              <p className="text-xs text-blue-700">
                Ce budget annuel sera utilisé pour calculer automatiquement le ratio de consommation budgétaire sur le Dashboard Finance.
              </p>
            </div>
            <button
              onClick={handleSaveBudget}
              disabled={!annualBudget || parseFloat(annualBudget) <= 0}
              className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed ${
                budgetSaved ? 'bg-green-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {budgetSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {budgetSaved ? 'Budget Enregistré !' : 'Enregistrer le Budget'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
