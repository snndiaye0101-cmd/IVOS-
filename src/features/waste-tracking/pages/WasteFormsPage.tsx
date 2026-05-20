import { useContextSelector } from '../../../shared/contexts/ContextProvider';
import { useState } from 'react';
import { FileText, Download, Edit, CheckCircle2, Clock, Plus, Search } from 'lucide-react';
import { YearProvider, useYear, YearSelector } from '../../../shared/contexts/YearContext';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';

// 1. Types et Interfaces
type BSDStatus =
  | 'Brouillon'
  | 'Validé'
  | 'En attente transport'
  | 'En transit'
  | 'Réceptionné'
  | 'Signé';

interface WasteForm {
  id: string;
  mission_id: string;
  producer: string;
  destination: string;
  waste_type: string;
  quantity: string;
  status: BSDStatus;
  signatures: {
    producer: boolean;
    transporter: boolean;
    receiver: boolean;
  };
  created_at: string;
  updated_at: string;
  notes?: string;
  annee: string;
  archived: boolean;
}

// 2. Composant Interne pour la logique
function WasteFormsContent() {
  const { site, year } = useContextSelector();
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<WasteForm | null>(null);
  const [archiveMode, setArchiveMode] = useState(false);

  // Exemple de fonction de couleur (à adapter selon tes utilitaires)
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Brouillon: 'bg-gray-100 text-gray-800',
      Signé: 'bg-green-100 text-green-800',
      'En transit': 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-orange-100 text-orange-800';
  };

  const handleDownloadPDF = (id: string) => console.log('Téléchargement BSD:', id);
  const openEditModal = (form: WasteForm) => console.log('Edition:', form.id);

  // Simule une liste de BSD pour la démo
  const MOCK_BSD: WasteForm[] = [
    {
      id: 'BSD-2026-001',
      mission_id: 'M-26-04',
      producer: 'IVOS',
      destination: 'Centre de Traitement Dakar',
      waste_type: 'Boues pétrolières',
      quantity: '5000L',
      status: 'En transit',
      signatures: { producer: true, transporter: false, receiver: false },
      created_at: '2026-04-08',
      updated_at: '2026-04-08',
      annee: '2026',
      archived: false,
    },
    {
      id: 'BSD-2025-002',
      mission_id: 'M-25-01',
      producer: 'IVOS',
      destination: 'Centre de Traitement Abidjan',
      waste_type: 'DASRI',
      quantity: '2000L',
      status: 'Signé',
      signatures: { producer: true, transporter: true, receiver: true },
      created_at: '2025-03-12',
      updated_at: '2025-03-12',
      annee: '2025',
      archived: true,
    },
  ];
  const filteredBSD = MOCK_BSD.filter((bsd) =>
    site ? bsd.destination.includes(site.name) : true
  ).filter((bsd) => (archiveMode ? bsd.archived : !bsd.archived));

  return (
    <div className="p-6">
      {/* Header avec sélecteur d'année et accès archives */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6 text-white lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
            <FileText className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Suivi des Déchets (BSD)</h1>
            <p className="text-sm text-gray-300">Gestion et traçabilité QHSE - Campagne {year}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <YearSelector />
          <Button
            variant="primary"
            disabled={archiveMode}
            className={archiveMode ? 'pointer-events-none opacity-50' : ''}
          >
            <Plus className="mr-2 h-4 w-4" /> Nouveau BSD
          </Button>
          <Button
            variant={archiveMode ? 'danger' : 'secondary'}
            className={archiveMode ? 'border-orange-400 bg-orange-100 text-orange-700' : ''}
            onClick={() => setArchiveMode((a) => !a)}
          >
            <Search className="mr-2 h-4 w-4" />{' '}
            {archiveMode ? 'Quitter les Archives' : 'Accéder aux Archives'}
          </Button>
        </div>
      </div>
      {archiveMode && (
        <div className="mb-4 flex items-center justify-center">
          <span className="select-none rounded-2xl border-2 border-orange-400 bg-orange-100 px-4 py-2 text-lg font-bold uppercase tracking-wider text-orange-700 shadow">
            ARCHIVE SÉCURISÉE – Lecture seule
          </span>
        </div>
      )}

      {/* Liste des BSD */}
      <div className="rounded-2xl bg-white p-6 shadow-md">
        <table className="min-w-full text-sm">
          <thead className="bg-[#1a1a2e]">
            <tr className="text-xs uppercase text-white">
              <th className="p-3 font-bold">N° BSD</th>
              <th className="p-3 font-bold">Destination</th>
              <th className="p-3 font-bold">Type</th>
              <th className="p-3 font-bold">Quantité</th>
              <th className="p-3 font-bold">Statut</th>
              <th className="p-3 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBSD.map((bsd) => (
              <tr
                key={bsd.id}
                className={`border-b transition-colors last:border-b-0 hover:bg-blue-50 ${bsd.archived ? 'opacity-80' : ''}`}
              >
                <td className="max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap p-3 text-lg font-semibold">
                  {bsd?.id ?? ''}
                  {bsd?.archived && (
                    <span className="ml-2 rounded-xl border border-orange-300 bg-orange-100 px-2 py-0.5 align-middle text-xs font-bold text-orange-700">
                      ARCHIVE SÉCURISÉE
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap p-3 font-semibold text-blue-900">
                  {bsd?.destination ?? ''}
                </td>
                <td className="whitespace-nowrap p-3 font-semibold text-blue-900">
                  {bsd?.waste_type ?? ''}
                </td>
                <td className="whitespace-nowrap p-3 font-semibold text-blue-900">
                  {bsd?.quantity ?? ''}
                </td>
                <td className="whitespace-nowrap p-3 font-semibold text-blue-900">
                  {bsd?.status ?? ''}
                </td>
                <td className="flex min-w-[180px] gap-3 whitespace-nowrap p-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelectedForm(bsd);
                      setIsViewModalOpen(true);
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" /> Détails
                  </Button>
                  {!archiveMode && (
                    <Button
                      variant="primary"
                      onClick={() => {
                        setSelectedForm(bsd);
                        setIsViewModalOpen(true);
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" /> Modifier
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MODAL DE VUE (Détails) --- */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedForm(null);
        }}
        title={selectedForm?.archived ? 'Détails du BSD (ARCHIVE SÉCURISÉE)' : 'Détails du BSD'}
        size="lg"
      >
        {selectedForm && (
          <div className="space-y-6">
            <div className="rounded-lg bg-orange-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-orange-600" />
                  <h3 className="text-xl font-bold text-gray-900">{selectedForm.id}</h3>
                  {selectedForm.archived && (
                    <span className="ml-2 select-none rounded-xl border border-orange-300 bg-orange-100 px-2 py-0.5 align-middle text-xs font-bold text-orange-700">
                      ARCHIVE SÉCURISÉE
                    </span>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(selectedForm.status)}`}
                >
                  {selectedForm.status}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Opération:{' '}
                <span className="font-medium text-gray-900">{selectedForm.mission_id}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Producteur</p>
                <p className="font-medium">{selectedForm.producer}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Destination</p>
                <p className="font-medium">{selectedForm.destination}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Type de déchet</p>
                <p className="font-medium">{selectedForm.waste_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Quantité</p>
                <p className="font-medium">{selectedForm.quantity}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="mb-3 text-sm font-medium text-gray-700">État des signatures</p>
              <div className="space-y-2">
                {Object.entries(selectedForm.signatures).map(([role, signed]) => (
                  <div
                    key={role}
                    className="flex items-center justify-between rounded bg-gray-50 p-2"
                  >
                    <span className="text-sm capitalize">{role}</span>
                    {signed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t pt-4">
              <Button variant="secondary" onClick={() => handleDownloadPDF(selectedForm.id)}>
                <Download className="mr-2 h-4 w-4" /> PDF
              </Button>
              {!selectedForm.archived && !archiveMode && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    openEditModal(selectedForm);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" /> Modifier
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// 3. Export avec Provider
export default function WasteFormsPage() {
  return (
    <YearProvider>
      <WasteFormsContent />
    </YearProvider>
  );
}
