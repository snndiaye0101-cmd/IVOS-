import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { clientsStore, Client } from '../services/clientsStore';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import { Building2, MapPin, Award, Eye, Edit, Trash2, Plus, Search, FileText, ChevronUp, Users } from 'lucide-react';

const TYPES = ['Producteur', 'Réceptionnaire', 'Les deux'] as const;
const ANNEES = ['2026', '2025', '2024'];

function typeBadge(type: string) {
  const map: Record<string, string> = { 'Producteur': 'bg-blue-100 text-blue-800', 'Réceptionnaire': 'bg-green-100 text-green-800', 'Les deux': 'bg-yellow-100 text-yellow-800' };
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${map[type] || 'bg-gray-100 text-gray-700'}`}>{type}</span>;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterAnnee, setFilterAnnee] = useState('2026');
  const [showAdd, setShowAdd] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);

  const reload = useCallback(() => setClients(clientsStore.load()), []);
  useEffect(() => {
    reload();
    const h = () => reload();
    window.addEventListener('clients:updated', h);
    return () => window.removeEventListener('clients:updated', h);
  }, [reload]);

  const filtered = useMemo(() => {
    return clients.filter(c => {
      if (filterAnnee && filterAnnee !== 'Tous' && c.annee !== filterAnnee) return false;
      if (filterType && c.type !== filterType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.contact.toLowerCase().includes(q) || c.address.toLowerCase().includes(q) || c.ninea.toLowerCase().includes(q);
      }
      return true;
    });
  }, [clients, search, filterType, filterAnnee]);

  const stats = useMemo(() => ({
    total: clients.length,
    producteurs: clients.filter(c => c.type === 'Producteur').length,
    receptionnaires: clients.filter(c => c.type === 'Réceptionnaire').length,
    lesDeux: clients.filter(c => c.type === 'Les deux').length,
  }), [clients]);

  function handleDelete(id: number) {
    if (!window.confirm('Supprimer ce client ?')) return;
    clientsStore.remove(id);
    reload();
  }

  function handleExport() {
    const lines = filtered.map(c => `${c.name} | ${c.type} | ${c.ninea} | ${c.address} | ${c.contact} | ${c.phone}`);
    const blob = new Blob(['Référentiel Clients IVOS\n' + '='.repeat(40) + '\n\n' + lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `clients_${filterAnnee}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-full min-h-screen">
      <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-6 mb-6 text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center"><Building2 className="w-7 h-7" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clients & Partenaires</h1>
            <p className="text-sm text-gray-300">Producteurs, réceptionnaires et référentiel contractuel</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)} className="px-3 py-2 rounded-xl bg-white/10 text-white text-sm font-semibold border-0 focus:outline-none focus:ring-2 focus:ring-white/30">
            <option value="Tous" className="text-gray-900">Toutes les années</option>
            {ANNEES.map(a => <option key={a} value={a} className="text-gray-900">{a}</option>)}
          </select>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-sm transition-colors"><FileText className="w-4 h-4" /> Export</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Clients', value: stats.total, gradient: 'from-blue-500 to-blue-700', icon: <Building2 className="w-5 h-5" /> },
          { label: 'Producteurs', value: stats.producteurs, gradient: 'from-indigo-500 to-indigo-700', icon: <Users className="w-5 h-5" /> },
          { label: 'Réceptionnaires', value: stats.receptionnaires, gradient: 'from-green-500 to-green-700', icon: <MapPin className="w-5 h-5" /> },
          { label: 'Double Rôle', value: stats.lesDeux, gradient: 'from-yellow-500 to-yellow-700', icon: <Award className="w-5 h-5" /> },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center text-white shrink-0`}>{c.icon}</div>
              <div><p className="text-xs text-gray-500">{c.label}</p><p className="text-xl font-bold text-gray-900">{c.value}</p></div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-semibold text-sm transition-all shadow-md">
          {showAdd ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAdd ? 'Masquer' : 'Nouveau Client'}
        </button>
        {showAdd && <AddClientCard annee={filterAnnee === 'Tous' ? '2026' : filterAnnee} onDone={() => { setShowAdd(false); reload(); }} />}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Rechercher (nom, NINEA, contact, adresse…)" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-4 py-2 rounded-xl bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">Tous les types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl shadow-md mb-6">
        <table className="min-w-full">
          <thead>
            <tr className="bg-[#1a1a2e] text-white text-xs uppercase">
              <th className="px-4 py-3 text-left">Nom</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">NINEA</th>
              <th className="px-4 py-3 text-left">Contact</th>
              <th className="px-4 py-3 text-left">Téléphone</th>
              <th className="px-4 py-3 text-left">Certifications</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, idx) => (
              <tr key={c.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                <td className="px-4 py-3 text-sm font-semibold">{c.name}{c.archived && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-500">ARCHIVÉ</span>}</td>
                <td className="px-4 py-3 text-sm">{typeBadge(c.type)}</td>
                <td className="px-4 py-3 text-sm font-mono text-gray-600">{c.ninea}</td>
                <td className="px-4 py-3 text-sm">{c.contact}</td>
                <td className="px-4 py-3 text-sm">{c.phone}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap gap-1">{c.certifications.map(cert => <span key={cert} className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold">{cert}</span>)}</div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex gap-1">
                    <button onClick={() => { setViewClient(c); setViewModal(true); }} title="Voir" className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => { setEditClient(c); setEditModal(true); }} title="Modifier" className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(c.id)} title="Supprimer" className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Aucun client trouvé</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal isOpen={viewModal} onClose={() => setViewModal(false)} title={viewClient?.name || ''} size="lg">
        {viewClient && (
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">Type</p>{typeBadge(viewClient.type)}</div>
              <div><p className="text-xs text-gray-500">NINEA</p><p className="font-mono font-semibold">{viewClient.ninea}</p></div>
              <div><p className="text-xs text-gray-500">Adresse</p><p className="text-sm">{viewClient.address}</p></div>
              <div><p className="text-xs text-gray-500">Contact</p><p className="text-sm font-semibold">{viewClient.contact}</p></div>
              <div><p className="text-xs text-gray-500">Téléphone</p><p className="text-sm">{viewClient.phone}</p></div>
              <div><p className="text-xs text-gray-500">Email</p><p className="text-sm">{viewClient.email}</p></div>
            </div>
            {viewClient.certifications.length > 0 && (
              <div><p className="text-xs text-gray-500 mb-1">Certifications</p><div className="flex flex-wrap gap-1">{viewClient.certifications.map(c => <span key={c} className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">{c}</span>)}</div></div>
            )}
            {viewClient.notes && <div><p className="text-xs text-gray-500 mb-1">Notes</p><p className="text-sm bg-gray-50 rounded-xl p-3">{viewClient.notes}</p></div>}
          </div>
        )}
      </Modal>

      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title={`Modifier — ${editClient?.name || ''}`} size="lg">
        {editClient && <EditClientForm client={editClient} onDone={() => { setEditModal(false); reload(); }} />}
      </Modal>
    </div>
  );
}

function AddClientCard({ annee, onDone }: { annee: string; onDone: () => void }) {
  const [f, setF] = useState({ name: '', type: 'Producteur' as Client['type'], ninea: '', address: '', contact: '', phone: '', email: '', certifications: '', notes: '', annee });
  const h = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF(prev => ({ ...prev, [e.target.name]: e.target.value }));
  function submit(e: React.FormEvent) {
    e.preventDefault();
    clientsStore.add({ ...f, certifications: f.certifications.split(',').map(s => s.trim()).filter(Boolean), archived: false });
    onDone();
  }
  return (
    <div className="mt-3 bg-white rounded-2xl shadow-md p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-green-600" /> Nouveau Client</h3>
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Input label="Raison Sociale" name="name" value={f.name} onChange={h} required />
        <Select label="Type" name="type" value={f.type} onChange={h} options={TYPES.map(t => ({ value: t, label: t }))} required />
        <Input label="NINEA" name="ninea" value={f.ninea} onChange={h} required />
        <Input label="Adresse" name="address" value={f.address} onChange={h} required />
        <Input label="Contact principal" name="contact" value={f.contact} onChange={h} required />
        <Input label="Téléphone" name="phone" value={f.phone} onChange={h} />
        <Input label="Email" name="email" value={f.email} onChange={h} type="email" />
        <Input label="Certifications (séparées par virgule)" name="certifications" value={f.certifications} onChange={h} />
        <Input label="Notes" name="notes" value={f.notes} onChange={h} />
        <div className="sm:col-span-2 lg:col-span-3 flex justify-end"><Button type="submit" variant="primary">+ Confirmer</Button></div>
      </form>
    </div>
  );
}

function EditClientForm({ client, onDone }: { client: Client; onDone: () => void }) {
  const [f, setF] = useState({ name: client.name, type: client.type, ninea: client.ninea, address: client.address, contact: client.contact, phone: client.phone, email: client.email, certifications: client.certifications.join(', '), notes: client.notes, annee: client.annee });
  const h = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF(prev => ({ ...prev, [e.target.name]: e.target.value }));
  function submit(e: React.FormEvent) {
    e.preventDefault();
    clientsStore.update(client.id, { ...f, certifications: f.certifications.split(',').map(s => s.trim()).filter(Boolean) });
    onDone();
  }
  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
      <Input label="Raison Sociale" name="name" value={f.name} onChange={h} required />
      <Select label="Type" name="type" value={f.type} onChange={h} options={TYPES.map(t => ({ value: t, label: t }))} required />
      <Input label="NINEA" name="ninea" value={f.ninea} onChange={h} required />
      <Input label="Adresse" name="address" value={f.address} onChange={h} required />
      <Input label="Contact principal" name="contact" value={f.contact} onChange={h} required />
      <Input label="Téléphone" name="phone" value={f.phone} onChange={h} />
      <Input label="Email" name="email" value={f.email} onChange={h} type="email" />
      <Input label="Certifications (séparées par virgule)" name="certifications" value={f.certifications} onChange={h} />
      <div className="sm:col-span-2"><Input label="Notes" name="notes" value={f.notes} onChange={h} /></div>
      <div className="sm:col-span-2 flex justify-end"><Button type="submit" variant="primary">Enregistrer</Button></div>
    </form>
  );
}
