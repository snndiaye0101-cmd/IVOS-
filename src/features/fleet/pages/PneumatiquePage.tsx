import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Tabs, Tab } from '../../../components/ui/Tab';
import { formatCleanAmount } from '../../../shared/utils/formatAmount';
import { pneumatiqueStore, Pneu } from '../services/pneumatiqueStore';
import { vehiclesStore } from '../services/vehiclesStore';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Modal from '../../../components/ui/Modal';
import { CircleDot, Plus, Package, Truck, Gauge, AlertTriangle, RotateCcw, TrendingUp, Wrench } from 'lucide-react';

function cpk(prix: number, km: number, kmMontage: number) {
  const delta = km - kmMontage;
  return delta > 0 ? prix / delta : 0;
}
function alertBadge(p: Pneu) {
  const badges: React.ReactNode[] = [];
  if (p.profondeur < 3)
    badges.push(<span key="r" className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">À remplacer</span>);
  if (p.statut === 'Monté' && p.km - p.kmMontage > 10000)
    badges.push(<span key="p" className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700">À permuter</span>);
  return badges.length ? <div className="flex flex-wrap gap-1">{badges}</div> : null;
}
const positions = ['Avant gauche','Avant droit','Arrière gauche','Arrière droit','Secours'];
const today = () => new Date().toISOString().slice(0,10);

export default function PneumatiquePage() {
  const [pneus, setPneus] = useState<Pneu[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [actionModal, setActionModal] = useState(false);
  const [actionFlow, setActionFlow] = useState<'stock'|'affectation'|'controle'|null>(null);
  const [editId, setEditId] = useState<number|null>(null);
  const [search, setSearch] = useState('');

  const reload = useCallback(() => {
    setPneus(pneumatiqueStore.load());
    setVehicles(vehiclesStore.load());
  }, []);

  useEffect(() => {
    reload();
    const h = () => reload();
    window.addEventListener('pneumatiques:updated', h);
    window.addEventListener('fleetVehicles:updated', h);
    return () => { window.removeEventListener('pneumatiques:updated', h); window.removeEventListener('fleetVehicles:updated', h); };
  }, [reload]);

  const stats = useMemo(() => {
    const total = pneus.length;
    const enStock = pneus.filter(p => p.statut === 'En stock').length;
    const montes = pneus.filter(p => p.statut === 'Monté').length;
    const aRebuter = pneus.filter(p => p.statut === 'À rebuter').length;
    const enReparation = pneus.filter(p => p.statut === 'En réparation').length;
    const alertesUsure = pneus.filter(p => p.profondeur < 3).length;
    const alertesPermutation = pneus.filter(p => p.statut === 'Monté' && p.km - p.kmMontage > 10000).length;
    const coutTotal = pneus.reduce((s, p) => s + p.prix, 0);
    const montesData = pneus.filter(p => p.statut === 'Monté' && p.km - p.kmMontage > 0);
    const cpkMoyen = montesData.length > 0
      ? montesData.reduce((s, p) => s + cpk(p.prix, p.km, p.kmMontage), 0) / montesData.length
      : 0;
    return { total, enStock, montes, aRebuter, enReparation, alertesUsure, alertesPermutation, coutTotal, cpkMoyen };
  }, [pneus]);

  const filtered = useMemo(() => {
    if (!search.trim()) return pneus;
    const q = search.toLowerCase();
    return pneus.filter(p =>
      p.numeroSerie.toLowerCase().includes(q) ||
      p.marque.toLowerCase().includes(q) ||
      p.modele.toLowerCase().includes(q) ||
      p.statut.toLowerCase().includes(q) ||
      p.affectations.some(a => a.vehicule.toLowerCase().includes(q))
    );
  }, [pneus, search]);

  function handleDelete(id: number) {
    if (!confirm('Supprimer ce pneu ?')) return;
    pneumatiqueStore.remove(id);
    reload();
  }

  function closeAction() {
    setActionModal(false);
    setActionFlow(null);
    setEditId(null);
    reload();
  }

  return (
    <div className="w-full min-h-screen">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-6 mb-6 text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
            <CircleDot className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestion des Pneumatiques</h1>
            <p className="text-sm text-gray-300">Cycle de vie complet &mdash; Stock, Affectation, Contrôle, Analyse</p>
          </div>
        </div>
        <button onClick={() => setActionModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl font-semibold text-sm transition-colors">
          <Plus className="w-4 h-4" /> Action Pneumatique
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Pneus', value: stats.total, gradient: 'from-blue-500 to-blue-700', icon: <CircleDot className="w-5 h-5" /> },
          { label: 'En Stock', value: stats.enStock, gradient: 'from-violet-500 to-violet-700', icon: <Package className="w-5 h-5" />, alert: stats.enStock < 4 },
          { label: 'Montés', value: stats.montes, gradient: 'from-emerald-500 to-emerald-700', icon: <Truck className="w-5 h-5" /> },
          { label: 'Alertes Usure', value: stats.alertesUsure, gradient: 'from-red-500 to-red-700', icon: <AlertTriangle className="w-5 h-5" /> },
        ].map(c => (
          <div key={c.label} className={`bg-white rounded-2xl shadow-md overflow-hidden ${(c as any).alert ? 'ring-2 ring-red-400 ring-offset-1' : ''}`}>
            <div className="flex items-center gap-3 p-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center text-white shrink-0`}>{c.icon}</div>
              <div>
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className="text-xl font-bold text-gray-900">{c.value}</p>
              </div>
              {(c as any).alert && <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 animate-pulse">Faible stock</span>}
            </div>
          </div>
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-md p-4">
          <p className="text-xs text-gray-500 mb-1">Coût Total Stock</p>
          <p className="text-lg font-bold text-gray-900">{formatCleanAmount(stats.coutTotal, 'FCFA')}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-4">
          <p className="text-xs text-gray-500 mb-1">CPK Moyen (montés)</p>
          <p className="text-lg font-bold text-blue-700">{stats.cpkMoyen > 0 ? stats.cpkMoyen.toFixed(2) : '—'} FCFA/km</p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-4">
          <p className="text-xs text-gray-500 mb-1">À permuter (&gt;10 000 km)</p>
          <p className="text-lg font-bold text-orange-600">{stats.alertesPermutation}</p>
        </div>
      </div>

      {/* Faible stock alert */}
      {stats.enStock < 4 && (
        <div className="flex items-center gap-3 bg-red-50 rounded-2xl px-5 py-3 mb-6">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-800 font-medium">Faible stock : seulement <span className="font-bold">{stats.enStock}</span> pneu{stats.enStock > 1 ? 's' : ''} neufs en dépôt (seuil : 4). Pensez à réapprovisionner.</p>
        </div>
      )}

      {/* Tabs */}
      <Tabs>
        {/* TAB 1: Inventaire */}
        <Tab label="Inventaire">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input type="text" placeholder="Rechercher (série, marque, véhicule…)" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 px-4 py-2 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div className="overflow-x-auto rounded-2xl shadow-md">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-[#1a1a2e] text-white text-xs uppercase">
                    <th className="px-4 py-3 text-left">Numéro de Série / DOT</th>
                    <th className="px-4 py-3 text-left">Marque & Modèle</th>
                    <th className="px-4 py-3 text-left">Dimension</th>
                    <th className="px-4 py-3 text-left">Prix</th>
                    <th className="px-4 py-3 text-left">Profondeur</th>
                    <th className="px-4 py-3 text-left">Pression</th>
                    <th className="px-4 py-3 text-left">CPK</th>
                    <th className="px-4 py-3 text-left">État du Pneu</th>
                    <th className="px-4 py-3 text-left">Véhicule</th>
                    <th className="px-4 py-3 text-left">Alertes</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, idx) => {
                    const aff = p.affectations.length > 0 ? p.affectations[p.affectations.length - 1] : null;
                    const pCpk = cpk(p.prix, p.km, p.kmMontage);
                    return (
                      <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm font-mono">{p.numeroSerie}</td>
                        <td className="px-4 py-3 text-sm"><span className="font-semibold">{p.marque}</span> {p.modele}</td>
                        <td className="px-4 py-3 text-sm">{p.dimension}</td>
                        <td className="px-4 py-3 text-sm">{p.prix.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm"><span className={p.profondeur < 3 ? 'text-red-600 font-bold' : ''}>{p.profondeur} mm</span></td>
                        <td className="px-4 py-3 text-sm">{p.pression} bar</td>
                        <td className="px-4 py-3 text-sm font-semibold">{pCpk > 0 ? pCpk.toFixed(2) : '—'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.statut === 'En stock' ? 'bg-blue-100 text-blue-800' : p.statut === 'Monté' ? 'bg-green-100 text-green-800' : p.statut === 'En réparation' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{p.statut}</span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {aff ? <><span className="font-medium">{aff.vehicule}</span><br/><span className="text-xs text-gray-500">{aff.position}</span></> : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm">{alertBadge(p)}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-1">
                            <button onClick={() => { setEditId(p.id); setActionFlow('stock'); setActionModal(true); }} className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100">Modifier</button>
                            <button onClick={() => handleDelete(p.id)} className="px-2 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100">Suppr.</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (<tr><td colSpan={11} className="text-center py-8 text-gray-400">Aucun pneu trouvé</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </Tab>

        {/* TAB 2: Affectations */}
        <Tab label="Affectations">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Historique d'affectation</h2>
            <div className="overflow-x-auto rounded-2xl shadow-md">
              <table className="min-w-full">
                <thead><tr className="bg-[#1a1a2e] text-white text-xs uppercase">
                  <th className="px-4 py-3 text-left">N° Série</th>
                  <th className="px-4 py-3 text-left">Marque</th>
                  <th className="px-4 py-3 text-left">Véhicule</th>
                  <th className="px-4 py-3 text-left">Position</th>
                  <th className="px-4 py-3 text-left">Date Montage</th>
                  <th className="px-4 py-3 text-left">Date Démontage</th>
                </tr></thead>
                <tbody>
                  {pneus.flatMap(p => p.affectations.map((a, i) => (
                    <tr key={`${p.id}-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm font-mono">{p.numeroSerie}</td>
                      <td className="px-4 py-3 text-sm">{p.marque}</td>
                      <td className="px-4 py-3 text-sm font-medium">{a.vehicule}</td>
                      <td className="px-4 py-3 text-sm">{a.position}</td>
                      <td className="px-4 py-3 text-sm">{a.dateMontage}</td>
                      <td className="px-4 py-3 text-sm">{a.dateDemontage || <span className="text-green-600 text-xs font-semibold">En service</span>}</td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>

            <h2 className="text-lg font-semibold text-gray-800 mt-6">Position des pneus par véhicule</h2>
            {(() => {
              const vehicleMap: Record<string, { position: string; pneu: Pneu }[]> = {};
              pneus.filter(p => p.statut === 'Monté').forEach(p => {
                const last = p.affectations[p.affectations.length - 1];
                if (!last) return;
                if (!vehicleMap[last.vehicule]) vehicleMap[last.vehicule] = [];
                vehicleMap[last.vehicule].push({ position: last.position, pneu: p });
              });
              return Object.entries(vehicleMap).map(([veh, tires]) => (
                <div key={veh} className="bg-white rounded-2xl shadow-md p-5 mb-4">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Truck className="w-4 h-4 text-blue-600" />{veh}</h3>
                  <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                    {['Avant gauche','Avant droit','Arrière gauche','Arrière droit'].map(pos => {
                      const t = tires.find(t => t.position === pos);
                      return (
                        <div key={pos} className={`rounded-xl p-3 text-center text-xs ${t ? (t.pneu.profondeur < 3 ? 'bg-red-50 ring-2 ring-red-300' : 'bg-green-50 ring-1 ring-green-200') : 'bg-gray-100'}`}>
                          <CircleDot className={`w-8 h-8 mx-auto mb-1 ${t ? (t.pneu.profondeur < 3 ? 'text-red-500' : 'text-green-600') : 'text-gray-300'}`} />
                          <p className="font-semibold text-gray-700">{pos}</p>
                          {t ? (<><p className="text-[10px] text-gray-500">{t.pneu.marque} &bull; {t.pneu.profondeur}mm</p>{alertBadge(t.pneu)}</>) : <p className="text-gray-400">Vide</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        </Tab>

        {/* TAB 3: Analyse CPK */}
        <Tab label="Analyse & CPK">
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-600" /> Calculateur CPK Automatique</h2>
            <p className="text-sm text-gray-500">CPK = Prix / (km actuel − km montage)</p>
            <div className="overflow-x-auto rounded-2xl shadow-md">
              <table className="min-w-full">
                <thead><tr className="bg-[#1a1a2e] text-white text-xs uppercase">
                  <th className="px-4 py-3 text-left">N° Série</th>
                  <th className="px-4 py-3 text-left">Marque</th>
                  <th className="px-4 py-3 text-left">Prix (FCFA)</th>
                  <th className="px-4 py-3 text-left">Km Montage</th>
                  <th className="px-4 py-3 text-left">Km Actuel</th>
                  <th className="px-4 py-3 text-left">Km Parcourus</th>
                  <th className="px-4 py-3 text-left">CPK (FCFA/km)</th>
                </tr></thead>
                <tbody>
                  {pneus.filter(p => p.km - p.kmMontage > 0).sort((a, b) => cpk(a.prix, a.km, a.kmMontage) - cpk(b.prix, b.km, b.kmMontage)).map((p, idx) => {
                    const delta = p.km - p.kmMontage;
                    const c = cpk(p.prix, p.km, p.kmMontage);
                    return (
                      <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm font-mono">{p.numeroSerie}</td>
                        <td className="px-4 py-3 text-sm">{p.marque}</td>
                        <td className="px-4 py-3 text-sm">{p.prix.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm">{p.kmMontage.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm">{p.km.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm font-medium">{delta.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm font-bold text-blue-700">{c.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <h2 className="text-lg font-semibold text-gray-800 mt-6">Comparateur de Marques</h2>
            <div className="overflow-x-auto rounded-2xl shadow-md">
              <table className="min-w-full">
                <thead><tr className="bg-[#1a1a2e] text-white text-xs uppercase">
                  <th className="px-4 py-3 text-left">Marque</th>
                  <th className="px-4 py-3 text-left">Nb Pneus</th>
                  <th className="px-4 py-3 text-left">CPK Moyen</th>
                  <th className="px-4 py-3 text-left">Prix Moyen</th>
                  <th className="px-4 py-3 text-left">Km Moyen</th>
                </tr></thead>
                <tbody>
                  {(() => {
                    const map: Record<string, { count: number; totalCpk: number; totalPrix: number; totalKm: number }> = {};
                    pneus.forEach(p => {
                      if (!map[p.marque]) map[p.marque] = { count: 0, totalCpk: 0, totalPrix: 0, totalKm: 0 };
                      map[p.marque].count++;
                      map[p.marque].totalCpk += cpk(p.prix, p.km, p.kmMontage);
                      map[p.marque].totalPrix += p.prix;
                      map[p.marque].totalKm += (p.km - p.kmMontage);
                    });
                    return Object.entries(map).map(([marque, d], idx) => (
                      <tr key={marque} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm font-semibold">{marque}</td>
                        <td className="px-4 py-3 text-sm">{d.count}</td>
                        <td className="px-4 py-3 text-sm font-bold text-blue-700">{d.count > 0 ? (d.totalCpk / d.count).toFixed(2) : '—'}</td>
                        <td className="px-4 py-3 text-sm">{formatCleanAmount(Math.round(d.totalPrix / d.count), 'FCFA')}</td>
                        <td className="px-4 py-3 text-sm">{Math.round(d.totalKm / d.count).toLocaleString()} km</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </Tab>

        {/* TAB 4: Maintenance */}
        <Tab label="Maintenance">
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><Wrench className="w-5 h-5 text-violet-600" /> Alertes & Maintenance</h2>
            {stats.enStock < 4 && (
              <div className="bg-white rounded-2xl shadow-md p-5">
                <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2"><Package className="w-4 h-4" /> Faible stock de pneus neufs</h3>
                <div className="bg-red-50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-red-800">Seulement <strong>{stats.enStock}</strong> pneu{stats.enStock > 1 ? 's' : ''} en stock (seuil recommandé : 4)</span>
                  <button onClick={() => { setActionFlow('stock'); setActionModal(true); }} className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors">+ Ajouter</button>
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Pneus à remplacer (profondeur &lt; 3 mm)</h3>
              {pneus.filter(p => p.profondeur < 3).length === 0
                ? <p className="text-sm text-gray-400">Aucun pneu en alerte</p>
                : (<div className="space-y-2">
                    {pneus.filter(p => p.profondeur < 3).map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3">
                        <div><span className="font-mono text-sm">{p.numeroSerie}</span><span className="ml-2 text-sm text-gray-600">{p.marque} {p.modele}</span></div>
                        <div className="text-right"><span className="text-red-700 font-bold text-sm">{p.profondeur} mm</span><span className="ml-3 text-xs text-gray-500">{p.pression} bar</span></div>
                      </div>
                    ))}
                  </div>)}
            </div>
            <div className="bg-white rounded-2xl shadow-md p-5">
              <h3 className="font-semibold text-orange-700 mb-3 flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Pneus à permuter (&gt;10 000 km)</h3>
              {pneus.filter(p => p.statut === 'Monté' && p.km - p.kmMontage > 10000).length === 0
                ? <p className="text-sm text-gray-400">Aucun pneu à permuter</p>
                : (<div className="space-y-2">
                    {pneus.filter(p => p.statut === 'Monté' && p.km - p.kmMontage > 10000).map(p => {
                      const aff = p.affectations[p.affectations.length - 1];
                      return (
                        <div key={p.id} className="flex items-center justify-between bg-orange-50 rounded-xl px-4 py-3">
                          <div><span className="font-mono text-sm">{p.numeroSerie}</span><span className="ml-2 text-sm text-gray-600">{p.marque}</span>{aff && <span className="ml-2 text-xs text-gray-500">{aff.vehicule} &bull; {aff.position}</span>}</div>
                          <span className="text-orange-700 font-bold text-sm">{(p.km - p.kmMontage).toLocaleString()} km</span>
                        </div>
                      );
                    })}
                  </div>)}
            </div>
            <div className="bg-white rounded-2xl shadow-md p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Pneus à rebuter</h3>
              {pneus.filter(p => p.statut === 'À rebuter').length === 0
                ? <p className="text-sm text-gray-400">Aucun</p>
                : pneus.filter(p => p.statut === 'À rebuter').map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 mb-2">
                      <div><span className="font-mono text-sm">{p.numeroSerie}</span><span className="ml-2 text-sm text-gray-600">{p.marque} {p.modele}</span></div>
                      <span className="text-xs text-gray-500">{p.km.toLocaleString()} km</span>
                    </div>
                  ))}
            </div>
          </div>
        </Tab>
      </Tabs>

      {/* ACTION MODAL */}
      <Modal isOpen={actionModal} onClose={closeAction} title={actionFlow ? (actionFlow === 'stock' ? (editId ? 'Modifier Pneu' : 'Entrée en Stock') : actionFlow === 'affectation' ? 'Affectation / Changement' : "Contrôle d'Usure") : 'Action Pneumatique'} size="lg">
        {!actionFlow ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
            <button onClick={() => setActionFlow('stock')} className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-blue-50 hover:bg-blue-100 transition-colors">
              <Package className="w-8 h-8 text-blue-600" />
              <span className="font-semibold text-blue-800">A) Entrée en Stock</span>
              <span className="text-xs text-gray-500 text-center">Nouveau pneu acheté</span>
            </button>
            <button onClick={() => setActionFlow('affectation')} className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-violet-50 hover:bg-violet-100 transition-colors">
              <Truck className="w-8 h-8 text-violet-600" />
              <span className="font-semibold text-violet-800">B) Affectation / Parc</span>
              <span className="text-xs text-gray-500 text-center">Monter sur véhicule</span>
            </button>
            <button onClick={() => setActionFlow('controle')} className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-orange-50 hover:bg-orange-100 transition-colors">
              <Gauge className="w-8 h-8 text-orange-600" />
              <span className="font-semibold text-orange-800">C) Contrôle Usure</span>
              <span className="text-xs text-gray-500 text-center">Profondeur & pression</span>
            </button>
          </div>
        ) : actionFlow === 'stock' ? (
          <StockForm editId={editId} pneus={pneus} onDone={closeAction} />
        ) : actionFlow === 'affectation' ? (
          <AffectationForm pneus={pneus} vehicles={vehicles} onDone={closeAction} />
        ) : (
          <ControleForm pneus={pneus} onDone={closeAction} />
        )}
      </Modal>
    </div>
  );
}

/* FLOW A: Stock Entry / Edit */
function StockForm({ editId, pneus, onDone }: { editId: number | null; pneus: Pneu[]; onDone: () => void }) {
  const existing = editId ? pneus.find(p => p.id === editId) : null;
  const [f, setF] = useState({
    numeroSerie: existing?.numeroSerie || '',
    marque: existing?.marque || '',
    modele: existing?.modele || '',
    dimension: existing?.dimension || '',
    indice: existing?.indice || '',
    prix: existing?.prix?.toString() || '',
    dateAchat: existing?.dateAchat || today(),
    dateLivraison: existing?.dateLivraison || '',
    fournisseurNom: existing?.fournisseurNom || '',
    fournisseurTel: existing?.fournisseurTel || '',
    fournisseurAdresse: existing?.fournisseurAdresse || '',
    agentAchat: existing?.agentAchat || '',
    numeroFacture: existing?.numeroFacture || '',
    statut: existing?.statut || 'En stock',
    km: existing?.km?.toString() || '0',
    kmMontage: existing?.kmMontage?.toString() || '0',
    profondeur: existing?.profondeur?.toString() || '8',
    pression: existing?.pression?.toString() || '2.5',
  });
  const h = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(prev => ({ ...prev, [e.target.name]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const data: any = { ...f, prix: Number(f.prix), km: Number(f.km), kmMontage: Number(f.kmMontage), profondeur: Number(f.profondeur), pression: Number(f.pression), affectations: existing?.affectations || [] };
    if (editId) { pneumatiqueStore.update(editId, data); } else { pneumatiqueStore.add(data); }
    onDone();
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
      <Input label="N° Série DOT" name="numeroSerie" value={f.numeroSerie} onChange={h} required />
      <Input label="Marque" name="marque" value={f.marque} onChange={h} required />
      <Input label="Modèle" name="modele" value={f.modele} onChange={h} required />
      <Input label="Dimension" name="dimension" value={f.dimension} onChange={h} required />
      <Input label="Indice" name="indice" value={f.indice} onChange={h} required />
      <Input label="Prix (FCFA)" name="prix" value={f.prix} onChange={h} type="number" required />
      <Input label="Date Achat" name="dateAchat" value={f.dateAchat} onChange={h} type="date" required />
      <Input label="Date Livraison" name="dateLivraison" value={f.dateLivraison} onChange={h} type="date" />
      <Input label="Fournisseur (Nom)" name="fournisseurNom" value={f.fournisseurNom} onChange={h} required />
      <Input label="Fournisseur (Tél)" name="fournisseurTel" value={f.fournisseurTel} onChange={h} />
      <Input label="Fournisseur (Adresse)" name="fournisseurAdresse" value={f.fournisseurAdresse} onChange={h} />
      <Input label="Agent Achat" name="agentAchat" value={f.agentAchat} onChange={h} />
      <Input label="N° Facture" name="numeroFacture" value={f.numeroFacture} onChange={h} />
      <Select label="Statut" name="statut" value={f.statut} onChange={h} options={[
        { value: 'En stock', label: 'En stock' },
        { value: 'Monté', label: 'Monté' },
        { value: 'En réparation', label: 'En réparation' },
        { value: 'À rebuter', label: 'À rebuter' },
      ]} />
      <Input label="Km actuel" name="km" value={f.km} onChange={h} type="number" />
      <Input label="Km au montage" name="kmMontage" value={f.kmMontage} onChange={h} type="number" />
      <Input label="Profondeur (mm)" name="profondeur" value={f.profondeur} onChange={h} type="number" />
      <Input label="Pression (bar)" name="pression" value={f.pression} onChange={h} type="number" />
      <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
        <Button type="submit" variant="primary">{editId ? 'Enregistrer' : 'Ajouter au Stock'}</Button>
      </div>
    </form>
  );
}

/* FLOW B: Affectation / Changement via Parc */
function AffectationForm({ pneus, vehicles, onDone }: { pneus: Pneu[]; vehicles: any[]; onDone: () => void }) {
  const enStock = pneus.filter(p => p.statut === 'En stock');
  const [f, setF] = useState({ pneuId: '', vehicule: '', position: '', kmMontage: '' });
  const h = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(prev => ({ ...prev, [e.target.name]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = Number(f.pneuId);
    const pneu = pneus.find(p => p.id === id);
    if (!pneu) return;
    const newAff = { vehicule: f.vehicule, position: f.position, dateMontage: today() };
    pneumatiqueStore.update(id, { statut: 'Monté' as const, kmMontage: Number(f.kmMontage), affectations: [...pneu.affectations, newAff] });
    onDone();
  }

  const vehicleOptions = vehicles.length > 0
    ? vehicles.map((v: any) => ({ value: v.registration || v.immatriculation || v.name || `${v.brand} ${v.model}`, label: v.registration || v.immatriculation || `${v.brand} ${v.model}` }))
    : [{ value: 'IVECO 12T', label: 'IVECO 12T' }, { value: 'Renault Midlum', label: 'Renault Midlum' }];

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
      <Select label="Pneu (en stock)" name="pneuId" value={f.pneuId} onChange={h}
        options={enStock.map(p => ({ value: p.id, label: `${p.numeroSerie} — ${p.marque} ${p.modele}` }))} required />
      <Select label="Véhicule (Parc)" name="vehicule" value={f.vehicule} onChange={h}
        options={vehicleOptions} required />
      <Select label="Position" name="position" value={f.position} onChange={h}
        options={positions.map(p => ({ value: p, label: p }))} required />
      <Input label="Km véhicule au montage" name="kmMontage" value={f.kmMontage} onChange={h} type="number" required />
      <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
        <Button type="submit" variant="primary">Affecter au Véhicule</Button>
      </div>
    </form>
  );
}

/* FLOW C: Controle d'Usure */
function ControleForm({ pneus, onDone }: { pneus: Pneu[]; onDone: () => void }) {
  const montes = pneus.filter(p => p.statut === 'Monté');
  const [f, setF] = useState({ pneuId: '', profondeur: '', pression: '', km: '' });
  const h = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(prev => ({ ...prev, [e.target.name]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = Number(f.pneuId);
    pneumatiqueStore.update(id, { profondeur: Number(f.profondeur), pression: Number(f.pression), km: Number(f.km) });
    onDone();
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
      <div className="sm:col-span-2">
        <Select label="Pneu monté" name="pneuId" value={f.pneuId} onChange={h}
          options={montes.map(p => { const a = p.affectations[p.affectations.length - 1]; return { value: p.id, label: `${p.numeroSerie} — ${p.marque} (${a?.vehicule || ''} ${a?.position || ''})` }; })} required />
      </div>
      <Input label="Profondeur sculpture (mm)" name="profondeur" value={f.profondeur} onChange={h} type="number" required />
      <Input label="Pression (bar)" name="pression" value={f.pression} onChange={h} type="number" required />
      <Input label="Km actuel véhicule" name="km" value={f.km} onChange={h} type="number" required />
      <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
        <Button type="submit" variant="primary">Enregistrer Contrôle</Button>
      </div>
      {f.pneuId && (() => {
        const sel = pneus.find(p => p.id === Number(f.pneuId));
        if (!sel) return null;
        const depth = f.profondeur ? Number(f.profondeur) : sel.profondeur;
        const kmVal = f.km ? Number(f.km) : sel.km;
        return (
          <div className="sm:col-span-2 bg-gray-50 rounded-xl p-4 space-y-1 text-sm">
            <p>Profondeur actuelle : <span className={depth < 3 ? 'text-red-600 font-bold' : 'text-green-600 font-semibold'}>{depth} mm</span>
              {depth < 3 && <span className="ml-2 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">À remplacer</span>}
            </p>
            <p>Km parcourus depuis montage : <span className="font-semibold">{(kmVal - sel.kmMontage).toLocaleString()} km</span>
              {kmVal - sel.kmMontage > 10000 && <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">À permuter</span>}
            </p>
            <p>CPK estimé : <span className="font-bold text-blue-700">{cpk(sel.prix, kmVal, sel.kmMontage).toFixed(2)} FCFA/km</span></p>
          </div>
        );
      })()}
    </form>
  );
}
