

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { materielsStore, Materiel, MaintenanceEntry } from '../services/materielsStore';
import { vehiclesStore } from '../../fleet/services/vehiclesStore';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Modal from '../../../components/ui/Modal';
import { Wrench, Plus, FileText, AlertTriangle, History, Edit, Trash2, ChevronDown, ChevronUp, Search, Package, Settings, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = ['Mécanique', 'Électrique', 'Levage', 'Outillage', 'EPI', 'Autre'];
const ETATS: { value: Materiel['etat']; label: string; bg: string; text: string }[] = [
  { value: 'Opérationnel', label: 'Opérationnel', bg: 'bg-green-100', text: 'text-green-800' },
  { value: 'En maintenance', label: 'En maintenance', bg: 'bg-orange-100', text: 'text-orange-800' },
  { value: 'Hors service', label: 'Hors service', bg: 'bg-red-100', text: 'text-red-800' },
];
const DEPOT_ZONES = ['Atelier 1', 'Atelier 2', 'Magasin', 'Zone carburant', 'Dépôt principal'];
const ANNEES = ['2026', '2025', '2024'];

function etatBadge(etat: string) {
  const e = ETATS.find(x => x.value === etat);
  if (!e) return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{etat}</span>;
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${e.bg} ${e.text}`}>{e.label}</span>;
}

export default function InventaireMaintenanceMateriels() {
  const navigate = useNavigate();
  const [materiels, setMateriels] = useState<Materiel[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filtreCat, setFiltreCat] = useState('');
  const [filtreAnnee, setFiltreAnnee] = useState('2026');
  const [showAddCard, setShowAddCard] = useState(false);

  // Modals
  const [panneModal, setPanneModal] = useState(false);
  const [panneMat, setPanneMat] = useState<Materiel | null>(null);
  const [histModal, setHistModal] = useState(false);
  const [histMat, setHistMat] = useState<Materiel | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [editMat, setEditMat] = useState<Materiel | null>(null);

  const reload = useCallback(() => {
    setMateriels(materielsStore.load());
    setVehicles(vehiclesStore.load());
  }, []);

  useEffect(() => {
    reload();
    const h = () => reload();
    window.addEventListener('materiels:updated', h);
    window.addEventListener('fleetVehicles:updated', h);
    return () => {
      window.removeEventListener('materiels:updated', h);
      window.removeEventListener('fleetVehicles:updated', h);
    };
  }, [reload]);

  const stats = useMemo(() => {
    const total = materiels.length;
    const operationnels = materiels.filter(m => m.etat === 'Opérationnel').length;
    const enMaintenance = materiels.filter(m => m.etat === 'En maintenance').length;
    const horsService = materiels.filter(m => m.etat === 'Hors service').length;
    const totalDepenses = materiels.reduce((s, m) => s + m.historique.reduce((s2, h) => s2 + h.total, 0), 0);
    const rentabiliteFaible = materiels.filter(m => {
      const dep = m.historique.reduce((s, h) => s + h.total, 0);
      return m.valeurNeuf > 0 && dep / m.valeurNeuf > 0.5;
    }).length;
    return { total, operationnels, enMaintenance, horsService, totalDepenses, rentabiliteFaible };
  }, [materiels]);

  const filtered = useMemo(() => {
    return materiels.filter(m => {
      if (filtreAnnee && filtreAnnee !== 'Tous' && m.annee !== filtreAnnee) return false;
      if (filtreCat && m.categorie !== filtreCat) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return m.designation.toLowerCase().includes(q) ||
          m.codeSerie.toLowerCase().includes(q) ||
          m.categorie.toLowerCase().includes(q) ||
          m.localisation.toLowerCase().includes(q);
      }
      return true;
    });
  }, [materiels, search, filtreCat, filtreAnnee]);

  function handleRebut(mat: Materiel) {
    if (!confirm(`Mettre "${mat.designation}" au rebut (Hors service) ?`)) return;
    materielsStore.update(mat.id, { etat: 'Hors service', archived: true });
    reload();
  }

  function handleExport() {
    const lines = filtered.map(m => {
      const dep = m.historique.reduce((s, h) => s + h.total, 0);
      return `${m.codeSerie} | ${m.designation} | ${m.categorie} | ${m.etat} | ${m.localisation} | ${m.historique.length} interventions | ${dep.toLocaleString()} FCFA`;
    });
    const blob = new Blob(['Rapport Inventaire & Maintenance Matériels\n' + '='.repeat(50) + '\n\n' + lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_materiels_${filtreAnnee}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const vehicleOptions = vehicles.length > 0
    ? vehicles.map((v: any) => ({
        value: v.registration || v.immatriculation || v.name || `${v.brand} ${v.model}`,
        label: v.registration || v.immatriculation || `${v.brand} ${v.model}`,
      }))
    : [{ value: "Camion d'intervention", label: "Camion d'intervention" }, { value: 'Renault Midlum', label: 'Renault Midlum' }];

  return (
    <div className="w-full min-h-screen">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-6 mb-6 text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
            <Wrench className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inventaire & Maintenance Matériels</h1>
            <p className="text-sm text-gray-300">Gestion complète du parc matériel &mdash; Suivi, entretien et traçabilité</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filtreAnnee}
            onChange={e => setFiltreAnnee(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/10 text-white text-sm font-semibold border-0 focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            <option value="Tous" className="text-gray-900">Toutes les années</option>
            {ANNEES.map(a => <option key={a} value={a} className="text-gray-900">{a}</option>)}
          </select>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-sm transition-colors">
            <FileText className="w-4 h-4" /> Export Rapport
          </button>
        </div>
      </div>

      {/* Stat Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Matériels', value: stats.total, gradient: 'from-blue-500 to-blue-700', icon: <Package className="w-5 h-5" /> },
          { label: 'Opérationnels', value: stats.operationnels, gradient: 'from-green-500 to-green-700', icon: <Settings className="w-5 h-5" /> },
          { label: 'En Maintenance', value: stats.enMaintenance, gradient: 'from-orange-500 to-orange-700', icon: <Wrench className="w-5 h-5" /> },
          { label: 'Hors Service', value: stats.horsService, gradient: 'from-red-500 to-red-700', icon: <AlertTriangle className="w-5 h-5" /> },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center text-white shrink-0`}>{c.icon}</div>
              <div>
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className="text-xl font-bold text-gray-900">{c.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-md p-4">
          <p className="text-xs text-gray-500 mb-1">Dépenses Maintenance Totales</p>
          <p className="text-lg font-bold text-blue-700">{stats.totalDepenses.toLocaleString()} FCFA</p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-4">
          <p className="text-xs text-gray-500 mb-1">Rentabilité Faible</p>
          <p className="text-lg font-bold text-red-600">{stats.rentabiliteFaible} matériel{stats.rentabiliteFaible > 1 ? 's' : ''}</p>
          <p className="text-[10px] text-gray-400">Coût réparations &gt; 50% valeur neuf</p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-4">
          <p className="text-xs text-gray-500 mb-1">Catégories</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {CATEGORIES.map(c => {
              const count = materiels.filter(m => m.categorie === c).length;
              return count > 0 ? <span key={c} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-semibold">{c}: {count}</span> : null;
            })}
          </div>
        </div>
      </div>

      {/* Collapsible Add Card */}
      <div className="mb-6">
        <button
          onClick={() => setShowAddCard(!showAddCard)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-semibold text-sm transition-all shadow-md"
        >
          {showAddCard ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAddCard ? 'Masquer le formulaire' : 'Nouveau Matériel'}
        </button>
        {showAddCard && (
          <AddMaterielCard
            vehicleOptions={vehicleOptions}
            annee={filtreAnnee === 'Tous' ? '2026' : filtreAnnee}
            onDone={() => { setShowAddCard(false); reload(); }}
          />
        )}
      </div>

      {/* Search + Category filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher (désignation, code, catégorie, localisation…)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <select
          value={filtreCat}
          onChange={e => setFiltreCat(e.target.value)}
          className="px-4 py-2 rounded-xl bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Toutes catégories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl shadow-md mb-6">
        <table className="min-w-full">
          <thead>
            <tr className="bg-[#1a1a2e] text-white text-xs uppercase">
              <th className="px-4 py-3 text-left">Désignation</th>
              <th className="px-4 py-3 text-left">Code / Série</th>
              <th className="px-4 py-3 text-left">Catégorie</th>
              <th className="px-4 py-3 text-left">État</th>
              <th className="px-4 py-3 text-left">Localisation</th>
              <th className="px-4 py-3 text-left">Exercice</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, idx) => {
              const totalRep = m.historique.reduce((s, h) => s + h.total, 0);
              const rentaFaible = m.valeurNeuf > 0 && totalRep / m.valeurNeuf > 0.5;
              return (
                <tr key={m.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                  <td className="px-4 py-3 text-sm">
                    <span className="font-semibold">{m.designation}</span>
                    {m.archived && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-500">ARCHIVÉ</span>}
                    {rentaFaible && (
                      <span className="ml-2 inline-flex items-center gap-0.5 text-red-600 text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3" /> Rentabilité faible
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{m.codeSerie}</td>
                  <td className="px-4 py-3 text-sm">{m.categorie}</td>
                  <td className="px-4 py-3 text-sm">{etatBadge(m.etat)}</td>
                  <td className="px-4 py-3 text-sm">
                    {m.localisationType === 'vehicule' ? (
                      <button
                        onClick={() => navigate('/vehicles')}
                        className="text-blue-700 font-medium hover:underline"
                      >
                        {m.localisation}
                      </button>
                    ) : (
                      <span>{m.localisation}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">{m.annee}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setPanneMat(m); setPanneModal(true); }}
                        disabled={m.archived}
                        title="Signaler une Panne"
                        className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 disabled:opacity-40"
                      >
                        <Wrench className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setHistMat(m); setHistModal(true); }}
                        title="Historique"
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setEditMat(m); setEditModal(true); }}
                        disabled={m.archived}
                        title="Modifier"
                        className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRebut(m)}
                        disabled={m.etat === 'Hors service'}
                        title="Mettre au Rebut"
                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Aucun matériel trouvé</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: Signaler une Panne */}
      <Modal isOpen={panneModal} onClose={() => setPanneModal(false)} title={`Signaler une Panne — ${panneMat?.designation || ''}`} size="lg">
        {panneMat && <PanneForm mat={panneMat} onDone={() => { setPanneModal(false); reload(); }} />}
      </Modal>

      {/* MODAL: Historique */}
      <Modal isOpen={histModal} onClose={() => setHistModal(false)} title={`Historique — ${histMat?.designation || ''}`} size="lg">
        {histMat && <HistoriqueView mat={histMat} />}
      </Modal>

      {/* MODAL: Modifier */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title={`Modifier — ${editMat?.designation || ''}`} size="lg">
        {editMat && (
          <EditMaterielForm
            mat={editMat}
            vehicleOptions={vehicleOptions}
            onDone={() => { setEditModal(false); reload(); }}
          />
        )}
      </Modal>
    </div>
  );
}

/* ---------- Card Ajout Matériel ---------- */
function AddMaterielCard({ vehicleOptions, annee, onDone }: { vehicleOptions: { value: string; label: string }[]; annee: string; onDone: () => void }) {
  const [locType, setLocType] = useState<'vehicule' | 'depot'>('depot');
  const [f, setF] = useState({
    designation: '',
    codeSerie: '',
    categorie: '',
    etat: 'Opérationnel' as Materiel['etat'],
    localisation: '',
    valeurNeuf: '',
    annee,
  });
  const h = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(prev => ({ ...prev, [e.target.name]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    materielsStore.add({
      designation: f.designation,
      codeSerie: f.codeSerie,
      categorie: f.categorie,
      etat: f.etat,
      localisation: f.localisation,
      localisationType: locType,
      valeurNeuf: Number(f.valeurNeuf),
      annee: f.annee,
      archived: false,
      historique: [],
    });
    onDone();
  }

  return (
    <div className="mt-3 bg-white rounded-2xl shadow-md p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-green-600" /> Nouveau Matériel</h3>
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Input label="Désignation" name="designation" value={f.designation} onChange={h} required />
        <Input label="N° de Série / Code Actif" name="codeSerie" value={f.codeSerie} onChange={h} required />
        <Select label="Catégorie" name="categorie" value={f.categorie} onChange={h}
          options={CATEGORIES.map(c => ({ value: c, label: c }))} required />
        <Select label="État Initial" name="etat" value={f.etat} onChange={h}
          options={ETATS.map(e => ({ value: e.value, label: e.label }))} required />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Type de Localisation</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setLocType('depot'); setF(p => ({ ...p, localisation: '' })); }}
              className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${locType === 'depot' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Dépôt / Zone
            </button>
            <button type="button" onClick={() => { setLocType('vehicule'); setF(p => ({ ...p, localisation: '' })); }}
              className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${locType === 'vehicule' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Véhicule (Parc)
            </button>
          </div>
        </div>
        {locType === 'depot' ? (
          <Select label="Zone / Dépôt" name="localisation" value={f.localisation} onChange={h}
            options={DEPOT_ZONES.map(z => ({ value: z, label: z }))} required />
        ) : (
          <Select label="Véhicule (Parc)" name="localisation" value={f.localisation} onChange={h}
            options={vehicleOptions} required />
        )}
        <Input label="Valeur à neuf (FCFA)" name="valeurNeuf" value={f.valeurNeuf} onChange={h} type="number" required />
        <Select label="Exercice (Année)" name="annee" value={f.annee} onChange={h}
          options={ANNEES.map(a => ({ value: a, label: a }))} required />
        <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2 mt-1">
          <Button type="submit" variant="primary">+ Confirmer l'ajout</Button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Formulaire Panne ---------- */
function PanneForm({ mat, onDone }: { mat: Materiel; onDone: () => void }) {
  const [f, setF] = useState({ description: '', reparateur: '', tel: '', coutPieces: '', coutMo: '' });
  const h = (e: React.ChangeEvent<HTMLInputElement>) => setF(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const total = (Number(f.coutPieces) || 0) + (Number(f.coutMo) || 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const entry: MaintenanceEntry = {
      date: new Date().toISOString().slice(0, 10),
      description: f.description,
      reparateur: f.reparateur,
      tel: f.tel,
      coutPieces: Number(f.coutPieces),
      coutMo: Number(f.coutMo),
      total,
    };
    materielsStore.update(mat.id, {
      etat: 'En maintenance',
      historique: [...mat.historique, entry],
    });
    onDone();
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
      <div className="sm:col-span-2">
        <Input label="Description de la panne" name="description" value={f.description} onChange={h} required />
      </div>
      <Input label="Réparateur" name="reparateur" value={f.reparateur} onChange={h} required />
      <Input label="Téléphone" name="tel" value={f.tel} onChange={h} />
      <Input label="Coût Pièces (FCFA)" name="coutPieces" value={f.coutPieces} onChange={h} type="number" required />
      <Input label="Coût Main d'Œuvre (FCFA)" name="coutMo" value={f.coutMo} onChange={h} type="number" required />
      <div className="sm:col-span-2 flex items-center justify-between mt-2">
        <p className="text-sm font-semibold text-gray-700">Total : <span className="text-blue-700">{total.toLocaleString()} FCFA</span></p>
        <Button type="submit" variant="primary">Enregistrer la Panne</Button>
      </div>
    </form>
  );
}

/* ---------- Vue Historique ---------- */
function HistoriqueView({ mat }: { mat: Materiel }) {
  const totalDep = mat.historique.reduce((s, h) => s + h.total, 0);
  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{mat.historique.length} intervention{mat.historique.length !== 1 ? 's' : ''}</p>
        <p className="text-sm font-semibold">Total dépenses : <span className="text-blue-700">{totalDep.toLocaleString()} FCFA</span></p>
      </div>
      {mat.historique.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">Aucune intervention enregistrée</p>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow-sm">
          <table className="min-w-full">
            <thead>
              <tr className="bg-[#1a1a2e] text-white text-xs uppercase">
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-left">Réparateur</th>
                <th className="px-4 py-2 text-left">Pièces</th>
                <th className="px-4 py-2 text-left">M.O.</th>
                <th className="px-4 py-2 text-left">Total</th>
              </tr>
            </thead>
            <tbody>
              {mat.historique.map((h, i) => (
                <tr key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                  <td className="px-4 py-2 text-sm">{h.date}</td>
                  <td className="px-4 py-2 text-sm">{h.description}</td>
                  <td className="px-4 py-2 text-sm">{h.reparateur}</td>
                  <td className="px-4 py-2 text-sm">{h.coutPieces.toLocaleString()}</td>
                  <td className="px-4 py-2 text-sm">{h.coutMo.toLocaleString()}</td>
                  <td className="px-4 py-2 text-sm font-bold text-blue-700">{h.total.toLocaleString()} FCFA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {mat.valeurNeuf > 0 && (
        <div className="bg-gray-50 rounded-xl p-3 text-sm">
          <p>Valeur à neuf : <span className="font-semibold">{mat.valeurNeuf.toLocaleString()} FCFA</span></p>
          <p>Ratio réparations / valeur : <span className={`font-bold ${totalDep / mat.valeurNeuf > 0.5 ? 'text-red-600' : 'text-green-600'}`}>{(totalDep / mat.valeurNeuf * 100).toFixed(0)}%</span></p>
        </div>
      )}
    </div>
  );
}

/* ---------- Formulaire Modifier ---------- */
function EditMaterielForm({ mat, vehicleOptions, onDone }: { mat: Materiel; vehicleOptions: { value: string; label: string }[]; onDone: () => void }) {
  const [locType, setLocType] = useState<'vehicule' | 'depot'>(mat.localisationType);
  const [f, setF] = useState({
    designation: mat.designation,
    codeSerie: mat.codeSerie,
    categorie: mat.categorie,
    etat: mat.etat,
    localisation: mat.localisation,
    valeurNeuf: mat.valeurNeuf.toString(),
    annee: mat.annee,
  });
  const h = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(prev => ({ ...prev, [e.target.name]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    materielsStore.update(mat.id, {
      designation: f.designation,
      codeSerie: f.codeSerie,
      categorie: f.categorie,
      etat: f.etat as Materiel['etat'],
      localisation: f.localisation,
      localisationType: locType,
      valeurNeuf: Number(f.valeurNeuf),
      annee: f.annee,
    });
    onDone();
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
      <Input label="Désignation" name="designation" value={f.designation} onChange={h} required />
      <Input label="N° de Série / Code Actif" name="codeSerie" value={f.codeSerie} onChange={h} required />
      <Select label="Catégorie" name="categorie" value={f.categorie} onChange={h}
        options={CATEGORIES.map(c => ({ value: c, label: c }))} required />
      <Select label="État" name="etat" value={f.etat} onChange={h}
        options={ETATS.map(e => ({ value: e.value, label: e.label }))} required />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Type de Localisation</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => { setLocType('depot'); setF(p => ({ ...p, localisation: '' })); }}
            className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${locType === 'depot' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Dépôt / Zone
          </button>
          <button type="button" onClick={() => { setLocType('vehicule'); setF(p => ({ ...p, localisation: '' })); }}
            className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${locType === 'vehicule' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Véhicule (Parc)
          </button>
        </div>
      </div>
      {locType === 'depot' ? (
        <Select label="Zone / Dépôt" name="localisation" value={f.localisation} onChange={h}
          options={DEPOT_ZONES.map(z => ({ value: z, label: z }))} required />
      ) : (
        <Select label="Véhicule (Parc)" name="localisation" value={f.localisation} onChange={h}
          options={vehicleOptions} required />
      )}
      <Input label="Valeur à neuf (FCFA)" name="valeurNeuf" value={f.valeurNeuf} onChange={h} type="number" required />
      <Select label="Exercice (Année)" name="annee" value={f.annee} onChange={h}
        options={ANNEES.map(a => ({ value: a, label: a }))} required />
      <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
        <Button type="submit" variant="primary">Enregistrer</Button>
      </div>
    </form>
  );
}
