import { useState, FormEvent } from 'react';
import { YearProvider, useYear, YearSelector } from '../../../shared/contexts/YearContext';
import { formatCleanAmount } from '@/shared/utils/formatAmount';
import { Wrench, Eye, Edit2, Trash2, X, CheckCircle, AlertTriangle, Package } from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import {
  createEquipment,
  updateEquipment as updateHandlingEquipment,
} from '../../fleet/services/handlingEquipmentService';
import type { EnergyType } from '../../fleet/types/handlingEquipment.types';
import { toast } from 'sonner';

type Historique = {
  reparateur: string;
  date: string;
  cout: number;
};

type Materiel = {
  designation: string;
  categorie: string;
  etat: string;
  localisation: string;
  photo: string;
  historique: Historique[];
  annee?: number;
  archived?: boolean;
  // Champs spécifiques pour catégorie Levage
  energyType?: EnergyType;
  liftingCapacity?: number;
  liftingHeight?: number;
  lastVGPDate?: string;
  handlingEquipmentId?: string; // Lien avec l'engin de manutention
};

const CATEGORIES = ['Mécanique', 'Électrique', 'Levage'];
const LOCALISATIONS = ['Atelier 1', 'Magasin', "Camion d'intervention"];
const ETATS = [
  { label: 'Opérationnel', color: 'bg-green-600' },
  { label: 'En réparation', color: 'bg-orange-400' },
  { label: 'HS', color: 'bg-red-600' },
];

function ArchiveBadge() {
  return (
    <span className="ml-4 rounded-full border border-yellow-300 bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800 shadow">
      ARCHIVE SÉCURISÉE
    </span>
  );
}

export default function InventaireMateriels() {
  const { year } = useYear();
  const { user } = useAuth();
  const [materiels, setMateriels] = useState<Materiel[]>([]); // Remplacez [] par EXEMPLE si nécessaire
  const [archiveMode, setArchiveMode] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [matToDelete, setMatToDelete] = useState<number | null>(null);
  const [showFiche, setShowFiche] = useState(false);
  const [ficheMat, setFicheMat] = useState<Materiel | null>(null);
  const [showPanne, setShowPanne] = useState(false);
  const [panneIdx, setPanneIdx] = useState<number | null>(null);
  const [panneForm, setPanneForm] = useState<{ reparateur: string; cout: string }>({
    reparateur: '',
    cout: '',
  });
  const [notif, setNotif] = useState<string | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState<Materiel>({
    designation: '',
    categorie: '',
    etat: '',
    localisation: '',
    photo: '',
    historique: [],
    annee: new Date().getFullYear(),
    archived: false,
    energyType: undefined,
    liftingCapacity: undefined,
    liftingHeight: undefined,
    lastVGPDate: '',
    handlingEquipmentId: undefined,
  });

  // Filtrage multi-site/année/archives
  const filteredMateriels = materiels.filter(
    (mat) =>
      (archiveMode ? mat.archived : !mat.archived) && (year ? String(mat.annee) === year : true)
  );

  // Synchronisation avec le module Engins de Manutention
  const syncWithHandlingEquipment = async (materiel: Materiel): Promise<string | undefined> => {
    if (materiel.categorie !== 'Levage' || !user) return undefined;

    try {
      // Vérifier que les champs obligatoires sont remplis
      if (!materiel.energyType || !materiel.liftingCapacity || !materiel.lastVGPDate) {
        toast.warning('Champs Levage incomplets — Engin non synchronisé avec le module Flotte');
        return undefined;
      }

      // Si l'engin existe déjà, le mettre à jour
      if (materiel.handlingEquipmentId) {
        const updated = updateHandlingEquipment(
          materiel.handlingEquipmentId,
          {
            serialNumber: materiel.designation,
            type: 'Chariot élévateur',
            brand: 'Inventaire',
            model: materiel.designation,
            energyType: materiel.energyType,
            liftingCapacity: materiel.liftingCapacity,
            lastVGPDate: materiel.lastVGPDate,
            notes: `Enregistré depuis l'inventaire — Localisation: ${materiel.localisation}`,
          },
          user.id
        );
        if (updated) {
          toast.success('✅ Engin de manutention mis à jour');
          return materiel.handlingEquipmentId;
        }
      } else {
        // Créer un nouvel engin de manutention
        const equipment = createEquipment(
          {
            serialNumber: materiel.designation,
            type: 'Chariot élévateur',
            brand: 'Inventaire',
            model: materiel.designation,
            energyType: materiel.energyType,
            liftingCapacity: materiel.liftingCapacity,
            lastVGPDate: materiel.lastVGPDate,
            notes: `Enregistré depuis l'inventaire — Localisation: ${materiel.localisation}`,
          },
          user.id
        );
        toast.success('✅ Engin de manutention créé et synchronisé avec la Flotte');
        return equipment.id;
      }
    } catch (error) {
      console.error('Erreur synchronisation:', error);
      toast.error('Erreur lors de la synchronisation avec le module Flotte');
    }
    return undefined;
  };

  // Ajout/édition
  const handleAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Synchroniser avec le module Engins de Manutention si catégorie Levage
    const handlingEquipmentId = await syncWithHandlingEquipment(form);

    const materielToSave = {
      ...form,
      handlingEquipmentId: handlingEquipmentId || form.handlingEquipmentId,
    };

    if (editIdx !== null) {
      const next = [...materiels];
      next[editIdx] = materielToSave;
      setMateriels(next);
      setEditIdx(null);
    } else {
      setMateriels([...materiels, { ...materielToSave, historique: [] }]);
    }
    setForm({
      designation: '',
      categorie: '',
      etat: '',
      localisation: '',
      photo: '',
      historique: [],
      annee: new Date().getFullYear(),
      archived: false,
      energyType: undefined,
      liftingCapacity: undefined,
      liftingHeight: undefined,
      lastVGPDate: '',
      handlingEquipmentId: undefined,
    });
  };

  // Edition
  const handleEdit = (idx: number) => {
    setForm(materiels[idx]);
    setEditIdx(idx);
  };

  // Suppression
  const handleDelete = (idx: number) => {
    setMatToDelete(idx);
    setShowDelete(true);
  };
  const confirmDelete = () => {
    if (matToDelete !== null) {
      setMateriels(materiels.filter((_, i) => i !== matToDelete));
      setMatToDelete(null);
      setShowDelete(false);
    }
  };

  // Aperçu
  const handlePreview = (mat: Materiel) => {
    setFicheMat(mat);
    setShowFiche(true);
  };

  // Changement de statut
  const handleStatusChange = (idx: number, value: string) => {
    const next = [...materiels];
    const prevEtat = next[idx].etat;
    next[idx].etat = value;
    if (value === 'Opérationnel' && (prevEtat === 'En Panne' || prevEtat === 'En réparation')) {
      const now = new Date();
      next[idx].historique = [
        ...next[idx].historique,
        {
          reparateur: panneForm.reparateur || 'N/A',
          date: now.toLocaleDateString(),
          cout: Number(panneForm.cout) || 0,
        },
      ];
      setPanneForm({ reparateur: '', cout: '' });
      setShowPanne(false);
      setPanneIdx(null);
    }
    setMateriels(next);
    setNotif('Statut mis à jour avec succès');
    setTimeout(() => setNotif(null), 2000);
    if (value === 'En Panne') {
      setPanneIdx(idx);
      setShowPanne(true);
      setPanneForm({ reparateur: '', cout: '' });
    }
  };

  return (
    <div className="mt-10 min-h-[calc(100vh-4rem)] w-full rounded-2xl border border-blue-100 bg-white p-8 shadow-xl">
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
            <Wrench className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Inventaire & Maintenance Matériels
            </h1>
            <p className="text-sm text-gray-300">
              Suivi complet du parc matériel, maintenance, pannes et réparations pour KIGNABOUR.
            </p>
          </div>
          {archiveMode && (
            <span className="ml-4 rounded-full border border-yellow-400/30 bg-yellow-400/20 px-3 py-1 text-xs font-bold text-yellow-200">
              ARCHIVE SÉCURISÉE
            </span>
          )}
        </div>
      </div>
      <div className="mb-8 flex flex-wrap items-center justify-end gap-2">
        <div className="flex items-center gap-4">
          <YearSelector />
          <div className="rounded-2xl bg-blue-50 px-4 py-1 text-sm font-bold text-blue-900 shadow-sm">
            {filteredMateriels.length} matériels
          </div>
        </div>
      </div>
      <form onSubmit={handleAdd} className="mb-8 space-y-4 rounded-2xl bg-blue-50 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <input
            required
            placeholder="Désignation"
            className="min-w-[180px] flex-1 rounded-2xl border px-4 py-2 text-lg font-semibold"
            value={form.designation}
            onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
          />
          <select
            required
            className="rounded-2xl border px-4 py-2 text-lg font-semibold"
            value={form.categorie}
            onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))}
          >
            <option value="">Catégorie</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            required
            className="rounded-2xl border px-4 py-2 text-lg font-semibold"
            value={form.etat}
            onChange={(e) => setForm((f) => ({ ...f, etat: e.target.value }))}
          >
            <option value="">État</option>
            {ETATS.map((e) => (
              <option key={e.label} value={e.label}>
                {e.label}
              </option>
            ))}
          </select>
          <select
            required
            className="rounded-2xl border px-4 py-2 text-lg font-semibold"
            value={form.localisation}
            onChange={(e) => setForm((f) => ({ ...f, localisation: e.target.value }))}
          >
            <option value="">Localisation</option>
            {LOCALISATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* Section conditionnelle pour catégorie Levage */}
        {form.categorie === 'Levage' && (
          <div className="rounded-2xl border-2 border-[#1a5c3a] bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Package className="h-5 w-5 text-[#1a5c3a]" />
              <h3 className="text-lg font-bold text-[#1a5c3a]">Spécifications Manutention</h3>
              <span className="ml-auto rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-800">
                Synchronisé avec Flotte
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  Type d'Énergie *
                </label>
                <select
                  className="w-full rounded-xl border px-3 py-2 text-sm font-semibold"
                  value={form.energyType || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, energyType: e.target.value as EnergyType }))
                  }
                  required={form.categorie === 'Levage'}
                >
                  <option value="">Sélectionner...</option>
                  <option value="Électrique">Électrique</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Gaz">Gaz</option>
                  <option value="Essence">Essence</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  Capacité de Levage (Tonnes) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="w-full rounded-xl border px-3 py-2 text-sm font-semibold"
                  placeholder="2.5"
                  value={form.liftingCapacity || ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      liftingCapacity: parseFloat(e.target.value) || undefined,
                    }))
                  }
                  required={form.categorie === 'Levage'}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  Hauteur de Levée (Mètres)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="w-full rounded-xl border px-3 py-2 text-sm font-semibold"
                  placeholder="3.5"
                  value={form.liftingHeight || ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      liftingHeight: parseFloat(e.target.value) || undefined,
                    }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  Date Dernière VGP *
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border px-3 py-2 text-sm font-semibold"
                  value={form.lastVGPDate || ''}
                  onChange={(e) => setForm((f) => ({ ...f, lastVGPDate: e.target.value }))}
                  required={form.categorie === 'Levage'}
                />
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3">
              <p className="text-xs text-green-800">
                <strong>ℹ️ Synchronisation automatique :</strong> Les données VGP seront
                automatiquement enregistrées dans le module{' '}
                <strong>Flotte {'>'} Engins de Manutention</strong> et intégrées aux rapports
                mensuels QHSE.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded-2xl bg-green-600 px-5 py-2 font-bold text-white shadow hover:bg-green-700"
          >
            Valider
          </button>
          <button
            type="button"
            className="font-bold text-red-600"
            onClick={() =>
              setForm({
                designation: '',
                categorie: '',
                etat: '',
                localisation: '',
                photo: '',
                historique: [],
                annee: new Date().getFullYear(),
                archived: false,
                energyType: undefined,
                liftingCapacity: undefined,
                liftingHeight: undefined,
                lastVGPDate: '',
                handlingEquipmentId: undefined,
              })
            }
          >
            Annuler
          </button>
        </div>
      </form>
      {notif && (
        <div className="animate-fade-in fixed left-1/2 top-6 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-lg font-bold text-white shadow-xl">
          <CheckCircle size={22} className="inline" /> {notif}
        </div>
      )}
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[900px] overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
          <thead className="bg-[#1a1a2e]">
            <tr className="text-xs uppercase text-white">
              <th className="p-3 font-bold">Désignation</th>
              <th className="p-3 font-bold">Catégorie</th>
              <th className="p-3 font-bold">État</th>
              <th className="p-3 font-bold">Localisation</th>
              <th className="p-3 font-bold">Année</th>
              <th className="p-3 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMateriels.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  Aucune donnée
                </td>
              </tr>
            )}
            {filteredMateriels.map((m, idx) => (
              <tr
                key={idx}
                className={`border-b transition-colors last:border-b-0 hover:bg-blue-50 ${m?.archived ? 'opacity-80' : ''}`}
              >
                <td className="max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap p-3 text-lg font-semibold">
                  {m?.designation ?? ''}
                  {m?.archived && (
                    <span className="ml-2 rounded-xl border border-gray-300 bg-gray-200 px-2 py-0.5 align-middle text-xs font-bold text-gray-600">
                      ARCHIVE
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap p-3 font-semibold text-blue-900">
                  {m?.categorie ?? ''}
                </td>
                <td className="min-w-[180px] p-3">
                  <div className="group relative flex items-center gap-2">
                    <span
                      className={`mr-1 inline-block h-3 w-3 rounded-full align-middle ${
                        m?.etat === 'Opérationnel'
                          ? 'bg-green-500'
                          : m?.etat === 'En réparation'
                            ? 'bg-orange-400'
                            : 'bg-red-600'
                      }`}
                      aria-label={m?.etat}
                    />
                    <select
                      value={m?.etat}
                      aria-label={`Statut de ${m?.designation}`}
                      onChange={(e) => handleStatusChange(idx, e.target.value)}
                      className={`cursor-pointer appearance-none rounded-2xl border-0 bg-opacity-90 px-3 py-1 text-sm font-bold text-white shadow transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${m?.etat === 'Opérationnel' ? 'bg-green-600' : m?.etat === 'En réparation' ? 'bg-orange-400' : 'bg-red-600'} hover:brightness-95`}
                      style={{ minWidth: 140, boxShadow: '0 2px 8px 0 rgb(0 0 0 / 0.04)' }}
                      disabled={m?.archived}
                    >
                      <option value="Opérationnel" className="bg-white text-emerald-700">
                        Opérationnel
                      </option>
                      <option value="En Panne" className="bg-white text-red-700">
                        En Panne
                      </option>
                      <option value="En réparation" className="bg-white text-orange-700">
                        En réparation
                      </option>
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white opacity-60 group-hover:opacity-100">
                      ▼
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap p-3 font-semibold">{m?.localisation ?? ''}</td>
                <td className="whitespace-nowrap p-3 font-semibold">{m?.annee ?? ''}</td>
                <td className="flex min-w-[180px] gap-3 whitespace-nowrap p-3">
                  <button
                    title="Aperçu"
                    className="rounded-full p-2 hover:bg-blue-100"
                    onClick={() => handlePreview(m)}
                  >
                    <Eye size={20} className="text-blue-700" />
                  </button>
                  {!m?.archived && (
                    <>
                      <button
                        title="Modifier"
                        className="rounded-full p-2 hover:bg-yellow-100"
                        onClick={() => handleEdit(idx)}
                      >
                        <Edit2 size={20} className="text-orange-500" />
                      </button>
                      <button
                        title="Supprimer"
                        className="rounded-full p-2 hover:bg-red-100"
                        onClick={() => handleDelete(idx)}
                      >
                        <Trash2 size={20} className="text-red-600" />
                      </button>
                    </>
                  )}
                  {m?.archived && (
                    <button
                      title="Consulter"
                      className="rounded-full p-2 hover:bg-blue-100"
                      onClick={() => handlePreview(m)}
                    >
                      <Eye size={20} className="text-blue-700" />
                    </button>
                  )}
                  <button
                    title="Signaler Panne"
                    className={`rounded-full p-2 hover:bg-red-100 ${m?.etat === 'En Panne' || m?.archived ? 'cursor-not-allowed opacity-50' : ''}`}
                    onClick={() => {
                      setPanneIdx(idx);
                      setShowPanne(true);
                      setPanneForm({ reparateur: '', cout: '' });
                    }}
                    disabled={m?.etat === 'En Panne' || m?.archived}
                  >
                    <AlertTriangle size={20} className="text-red-600" />
                  </button>
                  {['En Panne', 'En réparation'].includes(m?.etat ?? '') && !m?.archived && (
                    <button
                      title="Terminer la Réparation"
                      className="rounded-full p-2 hover:bg-emerald-100"
                      onClick={() => handleStatusChange(idx, 'Opérationnel')}
                    >
                      <CheckCircle size={20} className="text-emerald-600" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Modale Fiche Technique */}
      {showFiche && ficheMat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="relative w-full max-w-xl rounded-2xl border-2 border-blue-200 bg-white p-8 shadow-xl">
            <button
              className="absolute right-3 top-3 text-gray-400 hover:text-red-600"
              onClick={() => setShowFiche(false)}
            >
              <X size={24} />
            </button>
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-black text-[#003366]">
              <Eye size={24} /> Fiche Technique
            </h2>
            <div className="mb-6 flex gap-6">
              <div className="flex h-36 w-36 items-center justify-center rounded-2xl border border-blue-100 bg-gray-100">
                {ficheMat.photo ? (
                  <img
                    src={ficheMat.photo}
                    alt="Photo matériel"
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  <span className="text-gray-400">Aucune photo</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <span className="font-bold">Désignation :</span> {ficheMat.designation}
                </div>
                <div>
                  <span className="font-bold">Catégorie :</span> {ficheMat.categorie}
                </div>
                <div>
                  <span className="font-bold">État :</span>{' '}
                  <span
                    className={`rounded-2xl px-2 py-1 text-sm font-bold text-white shadow ${
                      ficheMat.etat === 'Opérationnel'
                        ? 'bg-green-600'
                        : ficheMat.etat === 'En réparation'
                          ? 'bg-orange-400'
                          : 'bg-red-600'
                    }`}
                  >
                    {ficheMat.etat}
                  </span>
                </div>
                <div>
                  <span className="font-bold">Localisation :</span> {ficheMat.localisation}
                </div>
                {ficheMat.categorie === 'Levage' && ficheMat.handlingEquipmentId && (
                  <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-2">
                    <span className="text-xs font-bold text-green-800">
                      🔗 Synchronisé avec la Flotte
                    </span>
                  </div>
                )}
              </div>
            </div>
            {ficheMat.categorie === 'Levage' && (
              <div className="mb-4 rounded-xl border-2 border-[#1a5c3a] bg-white p-4">
                <h3 className="mb-3 flex items-center gap-2 font-bold text-[#1a5c3a]">
                  <Package className="h-5 w-5" />
                  Spécifications Manutention
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-bold">Énergie :</span> {ficheMat.energyType || 'N/A'}
                  </div>
                  <div>
                    <span className="font-bold">Capacité :</span>{' '}
                    {ficheMat.liftingCapacity ? `${ficheMat.liftingCapacity} T` : 'N/A'}
                  </div>
                  <div>
                    <span className="font-bold">Hauteur levée :</span>{' '}
                    {ficheMat.liftingHeight ? `${ficheMat.liftingHeight} m` : 'N/A'}
                  </div>
                  <div>
                    <span className="font-bold">Dernière VGP :</span>{' '}
                    {ficheMat.lastVGPDate
                      ? new Date(ficheMat.lastVGPDate).toLocaleDateString('fr-FR')
                      : 'N/A'}
                  </div>
                </div>
              </div>
            )}
            <h3 className="mb-2 mt-4 font-bold text-blue-900">Historique des réparations</h3>
            <table className="mb-2 min-w-full overflow-hidden rounded-2xl border border-blue-100">
              <thead className="bg-blue-50">
                <tr className="text-base text-blue-900">
                  <th className="p-2 font-bold">Réparateur</th>
                  <th className="p-2 font-bold">Date</th>
                  <th className="p-2 font-bold">Coût</th>
                </tr>
              </thead>
              <tbody>
                {ficheMat.historique.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-gray-400">
                      Aucune réparation
                    </td>
                  </tr>
                )}
                {ficheMat.historique.map((h, idx) => (
                  <tr key={idx} className="border-b last:border-b-0">
                    <td className="p-2">{h.reparateur}</td>
                    <td className="p-2">{h.date}</td>
                    <td className="p-2">{formatCleanAmount(h.cout, 'FCFA')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Modale Suppression */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="relative w-full max-w-md rounded-2xl border-2 border-red-200 bg-white p-8 shadow-xl">
            <button
              className="absolute right-3 top-3 text-gray-400 hover:text-red-600"
              onClick={() => setShowDelete(false)}
            >
              <X size={24} />
            </button>
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-black text-red-700">
              <Trash2 size={24} /> Suppression
            </h2>
            <div className="mb-6 text-lg">
              Voulez-vous vraiment supprimer ce matériel de l'inventaire de KIGNABOUR ?
            </div>
            <div className="flex justify-end gap-4">
              <button
                className="rounded-2xl bg-gray-100 px-5 py-2 font-bold hover:bg-gray-200"
                onClick={() => setShowDelete(false)}
              >
                Annuler
              </button>
              <button
                className="rounded-2xl bg-red-600 px-5 py-2 font-bold text-white hover:bg-red-700"
                onClick={confirmDelete}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modale Signaler Panne */}
      {showPanne && panneIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="relative w-full max-w-md rounded-2xl border-2 border-red-200 bg-white p-8 shadow-xl">
            <button
              className="absolute right-3 top-3 text-gray-400 hover:text-red-600"
              onClick={() => setShowPanne(false)}
            >
              <X size={24} />
            </button>
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-black text-red-700">
              <AlertTriangle size={24} /> Déclaration de Panne
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowPanne(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1 block font-bold text-blue-900">Réparateur</label>
                <input
                  required
                  className="w-full rounded-2xl border px-4 py-2 text-lg font-semibold"
                  value={panneForm.reparateur}
                  onChange={(e) => setPanneForm((f) => ({ ...f, reparateur: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-blue-900">Coût estimé (FCFA)</label>
                <input
                  required
                  type="number"
                  min={0}
                  className="w-full rounded-2xl border px-4 py-2 text-lg font-semibold"
                  value={panneForm.cout}
                  onChange={(e) => setPanneForm((f) => ({ ...f, cout: e.target.value }))}
                />
              </div>
              <div className="mt-6 flex justify-end gap-4">
                <button
                  className="rounded-2xl bg-gray-100 px-5 py-2 font-bold hover:bg-gray-200"
                  type="button"
                  onClick={() => setShowPanne(false)}
                >
                  Annuler
                </button>
                <button
                  className="rounded-2xl bg-red-600 px-5 py-2 font-bold text-white hover:bg-red-700"
                  type="submit"
                >
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function InventaireMaterielsWithProvider() {
  return (
    <YearProvider>
      <InventaireMateriels />
    </YearProvider>
  );
}
