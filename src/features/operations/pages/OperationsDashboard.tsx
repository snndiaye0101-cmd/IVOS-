import { useContextSelector } from '../../../shared/contexts/ContextProvider';
import { useState } from "react";
import { Search, List, LayoutGrid, Edit2, Trash2, Eye } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ClipboardList, Plus, FileText } from "lucide-react";
import { toast } from "sonner";
import type { Operation } from '../operation.types';
// STATUS_COLUMNS importé mais non utilisé, supprimé pour éviter l'avertissement
import NewOperationModal from './NewOperationModal';

const KANBAN_COLUMNS = [
  { key: 'A_PLANIFIER', label: 'À planifier', color: 'border-blue-400 bg-blue-50' },
  { key: 'EN_COURS', label: 'En cours', color: 'border-amber-400 bg-amber-50' },
  { key: 'TERMINE', label: 'Terminé', color: 'border-lime-400 bg-lime-50' },
];

const MOCK_OPERATIONS: Operation[] = [
  {
    id: "MS-202604-001",
    client: "SEDIMA",
    type: "Tank Cleaning",
    responsable: "A. Diop",
    avatarUrl: "https://randomuser.me/api/portraits/men/32.jpg",
    status: "A_PLANIFIER",
    heureDebut: "08:30",
    heureFin: "12:00",
    retard: false,
    progression: 0,
    checkpoints: { equipement: false, arrivee: false, operation: false, bon: false },
    personnel: ["A. Diop", "B. Sarr"],
    materiel: ["Camion 12T", "Pompe HP"],
    documents: [{ id: "d1", name: "Fiche Sécurité.pdf", url: "#" }],
    vehicle: "SN-0001-AB", driver: "A. Diop", chefDeOperation: "A. Diop",
    coDrivers: [], startDate: "", startTime: "", endDate: "", endTime: "", distance: "", wasteForm: false,
  },
  {
    id: "MS-202604-002",
    client: "TOTAL",
    type: "Nettoyage Cuve",
    responsable: "B. Sarr",
    avatarUrl: "https://randomuser.me/api/portraits/men/45.jpg",
    status: "EN_COURS",
    heureDebut: "09:00",
    heureFin: "13:00",
    retard: true,
    progression: 60,
    checkpoints: { equipement: true, arrivee: true, operation: false, bon: false },
    personnel: ["B. Sarr", "C. Fall"],
    materiel: ["Camion 8T", "EPI"],
    documents: [{ id: "d2", name: "Bon Livraison.pdf", url: "#" }],
    vehicle: "SN-0002-AB", driver: "B. Sarr", chefDeOperation: "B. Sarr",
    coDrivers: [], startDate: "", startTime: "", endDate: "", endTime: "", distance: "", wasteForm: false,
  },
  {
    id: "MS-202604-003",
    client: "SENEGAL MINES",
    type: "Transport Déchets",
    responsable: "C. Fall",
    avatarUrl: "https://randomuser.me/api/portraits/women/68.jpg",
    status: "TERMINE",
    heureDebut: "07:00",
    heureFin: "10:00",
    retard: false,
    progression: 100,
    checkpoints: { equipement: true, arrivee: true, operation: true, bon: true },
    personnel: ["C. Fall", "D. Ba"],
    materiel: ["Camion 16T", "Badge Accès"],
    documents: [{ id: "d3", name: "Rapport.pdf", url: "#" }],
    vehicle: "SN-0003-AB", driver: "C. Fall", chefDeOperation: "C. Fall",
    coDrivers: [], startDate: "", startTime: "", endDate: "", endTime: "", distance: "", wasteForm: false,
  },
];

// Imports inutilisés supprimés

export default function OperationsDashboard() {
  const { site, year } = useContextSelector();
  const [operations, setOperations] = useState<Operation[]>(MOCK_OPERATIONS);
  const [modalOpen, setModalOpen] = useState(false);
  const [archiveMode, setArchiveMode] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Filtrage contextuel
  const filteredOperations = operations.filter(m =>
    site ? m.siteCode === site.code : true
  ).filter(m => archiveMode ? m.archived : !m.archived);

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'A_PLANIFIER': return 'À planifier';
      case 'EN_COURS': return 'En cours';
      case 'TERMINE': return 'Terminé';
      default: return status;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      'A_PLANIFIER': 'bg-blue-100 text-blue-700 border-blue-300',
      'EN_COURS': 'bg-amber-100 text-amber-700 border-amber-300',
      'TERMINE': 'bg-green-100 text-green-700 border-green-300',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'}`}>
        {getStatusLabel(status)}
      </span>
    );
  };

  return (
    <>
      <div className="w-full min-h-screen">
        <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-6 mb-6 text-white flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center"><ClipboardList className="w-7 h-7" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Tableau de Bord Opérationnel</h1>
              <p className="text-sm text-gray-300">
                Suivi des opérations en temps réel — {viewMode === 'kanban' ? 'Kanban' : 'Liste'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {/* Toggle Kanban/Liste */}
            <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  viewMode === 'kanban' ? 'bg-white text-[#1a1a2e]' : 'text-white/80 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" /> Tableau de Bord
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  viewMode === 'list' ? 'bg-white text-[#1a1a2e]' : 'text-white/80 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" /> Liste des Opérations
              </button>
            </div>
            <button
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-sm transition-all shadow-md"
              onClick={() => setModalOpen(true)}
              disabled={archiveMode}
              style={archiveMode ? { opacity: 0.5, pointerEvents: 'none' } : {}}
            >
              <Plus className="w-4 h-4" /> Nouvelle Opération
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md border ${archiveMode ? 'bg-orange-100 border-orange-400 text-orange-700' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
              onClick={() => setArchiveMode(a => !a)}
            >
              <Search className="w-4 h-4" /> {archiveMode ? 'Quitter les Archives' : 'Archives'}
            </button>
          </div>
        </div>
        <NewOperationModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          existingCount={operations.length}
          onCreate={operation => {
            setOperations(prev => [
              { ...operation, status: 'A_PLANIFIER', progression: 0, checkpoints: { equipement: false, arrivee: false, operation: false, bon: false }, documents: [], avatarUrl: '', materiel: [], id: operation.ref },
              ...prev
            ]);
            // Automatisation : chat + calendrier (à brancher sur vos services)
            toast.success('Opération enregistrée et équipe notifiée !');
          }}
        />
        {archiveMode && (
          <div className="flex items-center justify-center mb-4">
            <span className="px-4 py-2 rounded-2xl bg-orange-100 border-2 border-orange-400 text-orange-700 font-bold text-lg shadow uppercase tracking-wider select-none">
              ARCHIVE SÉCURISÉE – Lecture seule
            </span>
          </div>
        )}

        {/* Vue Kanban */}
        {viewMode === 'kanban' && (
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 px-2 md:px-4 pb-8 overflow-x-auto w-full">
            {KANBAN_COLUMNS.map((col) => (
              <div key={col.key} className={`w-full md:flex-1 min-w-[90vw] md:min-w-[340px] rounded-2xl p-2 md:p-4 border-2 ${col.color} shadow-sm flex flex-col`}>
                <h2 className="text-lg font-bold mb-4 text-slate-700 tracking-tight">{col.label}</h2>
                <div className="space-y-4 min-h-[120px] flex-1">
                  <AnimatePresence>
                    {filteredOperations.filter((m) => m.status === col.key).length === 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-slate-400 py-8">
                        <ClipboardList className="mx-auto mb-2" />
                        Aucune opération
                      </motion.div>
                    )}
                    {filteredOperations.filter((m) => m.status === col.key).map((operation) => (
                      <motion.div
                        key={operation.id}
                        layout
                        className={`bg-white rounded-xl shadow p-4 border border-slate-100 flex flex-col gap-2 hover:shadow-lg transition relative ${archiveMode ? 'opacity-90' : ''}`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex-1">
                            <div className="font-bold text-blue-900 text-sm">{operation.id}</div>
                            <div className="text-xs text-slate-500">{operation.client}</div>
                            <div className="text-xs text-slate-500">Resp. {operation.responsable}</div>
                          </div>
                          {!archiveMode && (
                            <button
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-semibold px-2 py-1 rounded bg-blue-50 border border-blue-100"
                              onClick={() => toast.info('Ouverture du salon de discussion pour ' + operation.id)}
                            >
                              <MessageCircle className="h-4 w-4" /> Chat
                            </button>
                          )}
                          {col.key === 'TERMINE' && !archiveMode && (
                            <button
                              className="flex items-center gap-1 text-green-700 hover:text-green-900 text-xs font-semibold px-2 py-1 rounded bg-green-50 border border-green-100"
                              onClick={() => toast.success('PDF généré pour ' + operation.id)}
                            >
                              <FileText className="h-4 w-4" /> Générer PDF
                            </button>
                          )}
                          {archiveMode && (
                            <span className="ml-2 px-2 py-0.5 rounded-xl text-xs font-bold bg-orange-100 text-orange-700 border border-orange-300 align-middle select-none">ARCHIVE SÉCURISÉE</span>
                          )}
                        </div>
                        {/* Barre de progression */}
                        <div className="w-full h-2 bg-slate-100 rounded-full mb-2">
                          <div
                            className={`h-2 rounded-full transition-all ${(operation.progression ?? 0) === 100 ? "bg-green-500" : (operation.progression ?? 0) > 0 ? "bg-amber-400" : "bg-blue-400"}`}
                            style={{ width: `${operation.progression ?? 0}%` }}
                          ></div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Vue Liste */}
        {viewMode === 'list' && (
          <div className="px-2 md:px-4 pb-8">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e]">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">ID Opération</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Client</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Type de Déchet</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Véhicule</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Chauffeur</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Statut</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {filteredOperations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                          <ClipboardList className="mx-auto mb-2 h-12 w-12" />
                          <p className="font-medium">Aucune opération disponible</p>
                        </td>
                      </tr>
                    ) : (
                      filteredOperations.map((operation) => (
                        <tr key={operation.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-bold text-blue-900 text-sm">{operation.id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-900">{operation.client}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-600">{operation.type}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-600">{operation.vehicle || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-600">{operation.driver || operation.responsable}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(operation.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                                title="Voir détails"
                                onClick={() => toast.info('Affichage des détails pour ' + operation.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                className="p-2 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                                title="Voir BSD"
                                onClick={() => window.open(`/templates/bordereau_dechets.html?id=${operation.id}`, '_blank')}
                              >
                                <FileText className="h-4 w-4" />
                              </button>
                              {!archiveMode && (
                                <>
                                  <button
                                    className="p-2 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
                                    title="Éditer"
                                    onClick={() => toast.info('Édition de ' + operation.id)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                                    title="Supprimer"
                                    onClick={() => {
                                      if (confirm(`Supprimer l'opération ${operation.id} ?`)) {
                                        setOperations(prev => prev.filter(m => m.id !== operation.id));
                                        toast.success('Opération supprimée');
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
