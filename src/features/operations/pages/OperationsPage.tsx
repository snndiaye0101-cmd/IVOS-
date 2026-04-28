
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Plus, Search, MapPin, Edit, Eye, Trash2, FileText, Truck, User, Upload, X, Users, Clock, Paperclip, ClipboardList, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import Textarea from '../../../components/ui/Textarea';
import type { Operation, DocType, OperationDocument } from '../operation.types';
import { exportOperationsToPDF } from '../exportOperationsPDF';
import { exportOperationsToExcel } from '../exportOperationsExcel';
import { vehiclesStore, isVisiteTechniqueExpired } from '../../fleet/services/vehiclesStore';

const INITIAL_OPERATIONS: Operation[] = [
  {
    id: 'SN-OPERATION-202603-0001',
    vehicle: 'SN-8765-AB',
    driver: 'Yao Kouamé',
    chefDeOperation: 'Diallo Mamadou',
    coDrivers: ['Koné Ibrahim'],
    origin: 'Usine Pharmaceutique ABC',
    destination: 'Centre de Traitement EcoWaste',
    status: 'EN_COURS',
    startDate: '2026-03-11',
    startTime: '07:30',
    endDate: '2026-03-11',
    endTime: '14:00',
    distance: '45.5 km',
    wasteForm: true,
    documents: [],
    notes: 'Transport de déchets pharmaceutiques dangereux',
    deliveryNoteNumber: undefined,
  },
  {
    id: 'SN-OPERATION-202603-0002',
    vehicle: 'SN-9876-CD',
    driver: 'Abou Traoré',
    chefDeOperation: 'Soro Fatou',
    coDrivers: [],
    origin: 'Raffinerie Pétrolière XYZ',
    destination: 'Centre de Traitement Sud',
    status: 'VALIDE',
    startDate: '2026-03-11',
    startTime: '09:00',
    endDate: '2026-03-11',
    endTime: '16:00',
    distance: '32.0 km',
    wasteForm: false,
    documents: [],
    notes: 'Opération régulière',
    deliveryNoteNumber: undefined,
  },
];

export default function OperationsPage() {
  const [operations, setOperations] = useState<Operation[]>(INITIAL_OPERATIONS);

  // Génération des numéros uniques
  const getNextOperationNumber = () => `OM-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(operations.length + 1).padStart(4, '0')}`;
  const getNextBSDNumber = () => `BSD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(operations.filter(m => m.notes?.startsWith('BSD')).length + 1).padStart(4, '0')}`;
  const getNextBLNumber = () => `BL-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(operations.filter(m => m.notes?.startsWith('Delivery Note')).length + 1).padStart(4, '0')}`;
  const nextOperationNumber = getNextOperationNumber();
  const nextBSDNumber = getNextBSDNumber();
  const nextBLNumber = getNextBLNumber();
  // Ajout du type de document sélectionné et des champs spécifiques
  const [docType, setDocType] = useState<DocType>('BSD');
  const [bsdFields, setBsdFields] = useState({ codeDechet: '', poids: '', exutoire: '' });
  const [deliveryFields, setDeliveryFields] = useState({ referenceBL: '', quantite: '', destinataire: '' });
  // State pour le formulaire de création/édition
    const [formData, setFormData] = useState<Omit<Operation, 'id'> & { deliveryNoteNumber?: string }>({
    vehicle: '',
    driver: '',
    chefDeOperation: '',
    coDrivers: [],
    origin: '',
    destination: '',
    status: 'BROUILLON',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    distance: '',
    wasteForm: false,
    documents: [],
      notes: '',
      deliveryNoteNumber: ''
  });

  useEffect(() => {
    function handleOperationCreated(e: CustomEvent) {
      const operation = e.detail;
      if (operation && (operation.operationStatus === 'authorized' || operation.notes?.toLowerCase().includes('conforme'))) {
        const omNumber = `OM-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}-${Math.floor(1000 + Math.random()*9000)}`;
        const operationWithOM = { ...operation, id: omNumber };
        setOperations(prev => [operationWithOM, ...prev] as Operation[]);
        toast.success(`Opération conforme ajoutée (OM: ${omNumber})`);
      } else {
        toast.error('Opération non conforme : contrôle pré-départ non validé.');
      }
    }
    window.addEventListener('operation:created', handleOperationCreated as EventListener);
    return () => window.removeEventListener('operation:created', handleOperationCreated as EventListener);
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(null);
  const { isAdmin, user } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coDriverInput, setCoDriverInput] = useState('');

  // Load fleet vehicles for vehicle selector + VT blocking
  const fleetVehicles = vehiclesStore.load();
  const vehicleOptions = fleetVehicles.map((v: any) => {
    const expired = isVisiteTechniqueExpired(v.technicalControlExpiry);
    return {
      value: v.registration,
      label: expired
        ? `⛔ ${v.registration} — ${v.brand} ${v.model} (VT Expirée)`
        : `${v.registration} — ${v.brand} ${v.model}`,
      disabled: expired,
    };
  });

  const filteredOperations = operations.filter(operation => {
    const matchesSearch = 
      operation.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      operation.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      operation.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (operation.origin ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (operation.destination ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || operation.status === filterStatus
    
    return matchesSearch && matchesStatus
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Gestion des champs BSD/Delivery Note
  const handleBsdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBsdFields((prev) => ({ ...prev, [name]: value }));
  };
  const handleDeliveryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDeliveryFields((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      vehicle: '',
      driver: '',
      chefDeOperation: '',
      coDrivers: [],
      origin: '',
      destination: '',
      status: 'BROUILLON',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      distance: '',
      wasteForm: false,
      documents: [],
      notes: '',
      deliveryNoteNumber: ''
    });
    setCoDriverInput('');
  };

  const addCoDriver = () => {
    const name = coDriverInput.trim();
    if (name && !formData.coDrivers.includes(name)) {
      setFormData((prev) => ({ ...prev, coDrivers: [...prev.coDrivers, name] }));
      setCoDriverInput('');
    }
  };

  const removeCoDriver = (name: string) => {
    setFormData((prev) => ({ ...prev, coDrivers: prev.coDrivers.filter((n: string) => n !== name) }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} dépasse 20 Mo`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const doc: OperationDocument = {
          id: Date.now().toString() + Math.random().toString(36).slice(2),
          name: file.name,
          url: reader.result as string,
          size: file.size,
          dataUrl: reader.result as string,
          uploadedAt: new Date().toISOString(),
        };
        setFormData((prev) => ({ ...prev, documents: [...prev.documents, doc] }));
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeDocument = (docId: string) => {
    setFormData((prev) => ({ ...prev, documents: prev.documents.filter((d: OperationDocument) => d.id !== docId) }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' o'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko'
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo'
  }

  // Mock sendNotification si non importé
  const sendNotification = async (_notif: any) => {
    // Remplacer par l'import réel si disponible
    toast.info('Notification envoyée (mock)');
    return Promise.resolve();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    // Blocage si visite technique expirée
    const selectedVehicle = fleetVehicles.find((v: any) => v.registration === formData.vehicle);
    if (selectedVehicle && isVisiteTechniqueExpired(selectedVehicle.technicalControlExpiry)) {
      toast.error(`Véhicule ${formData.vehicle} — Visite Technique expirée. Affectation impossible.`);
      return;
    }
    // Validation : au moins un des deux documents doit être rempli
    let valid = false;
    if (docType === 'BSD') {
      valid = Boolean(bsdFields.codeDechet.trim() && bsdFields.poids.trim() && bsdFields.exutoire.trim());
    } else {
      valid = Boolean(deliveryFields.referenceBL.trim() && deliveryFields.quantite.trim() && deliveryFields.destinataire.trim());
    }
    if (!valid) {
      toast.error('Veuillez renseigner tous les champs du document d\'accompagnement.');
      return;
    }
    // Génération des numéros
    const omNumber = nextOperationNumber;
    const bsdNumber = docType === 'BSD' ? nextBSDNumber : undefined;
    const blNumber = docType === 'DeliveryNote' ? nextBLNumber : undefined;
    const newOperation: Operation = {
      id: omNumber,
      ...formData,
      notes: docType === 'BSD'
        ? `BSD - N°: ${bsdNumber}, Code déchet: ${bsdFields.codeDechet}, Poids: ${bsdFields.poids}, Exutoire: ${bsdFields.exutoire}`
        : `Delivery Note - N°: ${blNumber}, Réf BL: ${deliveryFields.referenceBL}, Qté: ${deliveryFields.quantite}, Destinataire: ${deliveryFields.destinataire}`,
      deliveryNoteNumber: docType === 'DeliveryNote' ? (formData.deliveryNoteNumber || blNumber) : undefined,
    };
    setOperations([newOperation, ...operations]);
    setIsCreateModalOpen(false);
    resetForm();
    setBsdFields({ codeDechet: '', poids: '', exutoire: '' });
    setDeliveryFields({ referenceBL: '', quantite: '', destinataire: '' });
    toast.success('Opération créée avec succès');
    // Envoi notification au chauffeur (si user présent)
    if (user && newOperation.driver) {
      try {
        await sendNotification({
          userId: user.id, // À adapter pour cibler le vrai chauffeur
          type: 'operation_assigned',
          title: 'Nouvelle opération assignée',
          message: `Vous avez été assigné à l'opération ${newOperation.id} (${newOperation.origin} → ${newOperation.destination})`,
          entityType: 'operation',
          entityId: newOperation.id,
          metadata: { driver: newOperation.driver },
        });
      } catch (err) {
        // Optionnel : afficher une erreur ou log
        console.error('Erreur notification opération', err);
      }
    }
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOperation) return;
    // Blocage si visite technique expirée
    const editVehicle = fleetVehicles.find((v: any) => v.registration === formData.vehicle);
    if (editVehicle && isVisiteTechniqueExpired(editVehicle.technicalControlExpiry)) {
      toast.error(`Véhicule ${formData.vehicle} — Visite Technique expirée. Affectation impossible.`);
      return;
    }
    setOperations(operations.map((m) =>
      m.id === selectedOperation.id ? { ...m, ...formData } : m
    ));
    setIsEditModalOpen(false);
    setSelectedOperation(null);
    resetForm();
    toast.success('Opération modifiée avec succès');
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette opération ?')) {
      setOperations(operations.filter(m => m.id !== id))
      setIsEditModalOpen(false)
      setSelectedOperation(null)
      toast.success('Opération supprimée avec succès')
    }
  }

  const openEditModal = (operation: Operation) => {
    setSelectedOperation(operation)
    setFormData({
      vehicle: operation.vehicle,
      driver: operation.driver,
      chefDeOperation: operation.chefDeOperation,
      coDrivers: [...operation.coDrivers],
      origin: operation.origin ?? '',
      destination: operation.destination ?? '',
      status: operation.status,
      startDate: operation.startDate,
      startTime: operation.startTime,
      endDate: operation.endDate,
      endTime: operation.endTime,
      distance: operation.distance,
      wasteForm: operation.wasteForm,
      documents: [...operation.documents],
      notes: operation.notes || ''
    })
    setCoDriverInput('')
    setIsEditModalOpen(true)
  }

  const openViewModal = (operation: Operation) => {
    setSelectedOperation(operation)
    setIsViewModalOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Brouillon':
        return 'bg-gray-100 text-gray-800'
      case 'Validé':
        return 'bg-green-100 text-green-800'
      case 'En cours':
        return 'bg-blue-100 text-blue-800'
      case 'Terminé':
        return 'bg-purple-100 text-purple-800'
      case 'Clôturé':
        return 'bg-slate-100 text-slate-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <>
      <div className="w-full min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-6 mb-6 text-white flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center"><ClipboardList className="w-7 h-7" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ordres d'Opération</h1>
            <p className="text-sm text-gray-300">Gérez les opérations et leurs workflows</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2.5 bg-red-500/80 hover:bg-red-600 rounded-xl text-xs font-semibold shadow-md transition-all"
            onClick={() => exportOperationsToPDF(filteredOperations)}
          >
            Export PDF
          </button>
          <button
            className="px-4 py-2.5 bg-green-500/80 hover:bg-green-600 rounded-xl text-xs font-semibold shadow-md transition-all"
            onClick={() => exportOperationsToExcel(filteredOperations)}
          >
            Export Excel
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-sm transition-all shadow-md"
          >
            <Plus className="h-4 w-4" />
            Nouvelle Opération
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-md rounded-2xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 border border-gray-200"
              placeholder="Rechercher une opération..."
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 border border-gray-200"
          >
            <option value="all">Tous les statuts</option>
            <option value="Brouillon">Brouillon</option>
            <option value="Validé">Validé</option>
            <option value="En cours">En cours</option>
            <option value="Terminé">Terminé</option>
            <option value="Clôturé">Clôturé</option>
          </select>
        </div>
      </div>

      {/* Operations List */}
      <div className="bg-white shadow-md rounded-2xl overflow-hidden">
        {filteredOperations.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">Aucune opération trouvée</h3>
            <p className="text-sm text-gray-500">
              Aucun résultat à afficher. Vérifiez vos filtres ou créez une opération.
            </p>
            <div className="mt-4 text-xs text-gray-400">(opérations = {operations.length})</div>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs md:text-sm">
            <thead>
              <tr className="bg-[#1a1a2e] text-white text-xs uppercase">
                <th className="px-4 py-3 text-left">Opération ID</th>
                <th className="px-4 py-3 text-left">Véhicule</th>
                <th className="px-4 py-3 text-left">Équipe</th>
                <th className="px-4 py-3 text-left">Trajet</th>
                <th className="px-4 py-3 text-left">Période</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOperations.map((operation) => (
                <tr key={operation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">{operation.id}</div>
                      {operation.wasteForm && (
                        <span title="BSD attaché"><FileText className="ml-2 h-4 w-4 text-orange-600" /></span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Truck className="h-4 w-4 mr-2 text-gray-400" />
                      {operation.vehicle}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="flex items-center text-gray-900 font-medium">
                        <User className="h-4 w-4 mr-1 text-gray-400" />
                        {operation.driver}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">Chef: {operation.chefDeOperation}</div>
                      {operation.coDrivers.length > 0 && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          <Users className="h-3 w-3 inline mr-1" />
                          {operation.coDrivers.join(', ')}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium">{operation.origin}</div>
                          <div className="text-gray-500">→ {operation.destination}</div>
                          <div className="text-xs text-gray-400 mt-1">{operation.distance}</div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span>{new Date(operation.startDate).toLocaleDateString('fr-FR')} {operation.startTime}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      → {new Date(operation.endDate).toLocaleDateString('fr-FR')} {operation.endTime}
                    </div>
                    {operation.documents.length > 0 && (
                      <div className="text-xs text-blue-600 mt-0.5">
                        <Paperclip className="h-3 w-3 inline mr-0.5" />
                        {operation.documents.length} doc(s)
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(operation.status)}`}>
                      {operation.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => openViewModal(operation)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => openEditModal(operation)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); resetForm() }} title="Nouvelle Opération" size="xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Select label="Véhicule" name="vehicle" value={formData.vehicle} onChange={handleInputChange} required options={[{ value: '', label: 'Sélectionner un véhicule...' }, ...vehicleOptions]} />
              {formData.vehicle && isVisiteTechniqueExpired(fleetVehicles.find((v: any) => v.registration === formData.vehicle)?.technicalControlExpiry) && (
                <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Visite Technique expirée — affectation bloquée
                </div>
              )}
            </div>
            <Input label="Chauffeur principal" name="driver" value={formData.driver} onChange={handleInputChange} placeholder="Nom du chauffeur" required />
          </div>
          <Input label="Chef d'opération" name="chefDeOperation" value={formData.chefDeOperation} onChange={handleInputChange} placeholder="Nom du chef d'opération" required />

          {/* Numéros générés en lecture seule */}
          <div className="grid grid-cols-3 gap-4 mb-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Ordre d'Opération</label>
              <input type="text" className="w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-gray-700" value={nextOperationNumber} readOnly />
            </div>
            {docType === 'BSD' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">N° BSD</label>
                <input type="text" className="w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-gray-700" value={nextBSDNumber} readOnly />
              </div>
            )}
            {docType === 'DeliveryNote' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">N° BL</label>
                <input type="text" className="w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-gray-700" value={nextBLNumber} readOnly />
              </div>
            )}
          </div>
          {/* Sélecteur de type de document d'accompagnement */}
          <div className="mb-4">
            <span className="block text-sm font-medium text-gray-700 mb-1">Type de Document d'Accompagnement</span>
            <div className="flex gap-4">
              <button type="button" onClick={() => setDocType('BSD')} className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${docType === 'BSD' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'}`}>Collecte de Déchets (BSD)</button>
              <button type="button" onClick={() => setDocType('DeliveryNote')} className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${docType === 'DeliveryNote' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'}`}>Transport Standard (Delivery Note)</button>
            </div>
          </div>

          {/* Champs conditionnels BSD/Delivery Note */}
          {docType === 'BSD' ? (
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Input label="Code déchet" name="codeDechet" value={bsdFields.codeDechet} onChange={handleBsdChange} required />
              <Input label="Poids (kg)" name="poids" value={bsdFields.poids} onChange={handleBsdChange} required />
              <Input label="Exutoire" name="exutoire" value={bsdFields.exutoire} onChange={handleBsdChange} required />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Input label="Référence BL" name="referenceBL" value={deliveryFields.referenceBL} onChange={handleDeliveryChange} required />
              <Input label="Quantité" name="quantite" value={deliveryFields.quantite} onChange={handleDeliveryChange} required />
              <Input label="Destinataire" name="destinataire" value={deliveryFields.destinataire} onChange={handleDeliveryChange} required />
            </div>
          )}

          {/* Co-chauffeurs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Co-chauffeurs / Accompagnants</label>
            <div className="flex gap-2">
              <input type="text" value={coDriverInput} onChange={(e) => setCoDriverInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCoDriver() } }} placeholder="Nom de l'accompagnant" className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" />
              <button type="button" onClick={addCoDriver} className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm hover:bg-gray-200"><Plus className="h-4 w-4" /></button>
            </div>
            {formData.coDrivers.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.coDrivers.map(name => (
                  <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                    {name}
                    <button type="button" onClick={() => removeCoDriver(name)} className="text-blue-400 hover:text-blue-600"><X className="h-3.5 w-3.5" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Point de départ" name="origin" value={formData.origin ?? ''} onChange={handleInputChange} placeholder="Adresse de départ" required />
            <Input label="Destination" name="destination" value={formData.destination ?? ''} onChange={handleInputChange} placeholder="Adresse de destination" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Date de début" name="startDate" type="date" value={formData.startDate} onChange={handleInputChange} required />
            <Input label="Heure de début" name="startTime" type="time" value={formData.startTime} onChange={handleInputChange} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date de fin" name="endDate" type="date" value={formData.endDate} onChange={handleInputChange} required />
            <Input label="Heure de fin" name="endTime" type="time" value={formData.endTime} onChange={handleInputChange} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Distance" name="distance" value={formData.distance} onChange={handleInputChange} placeholder="Ex: 45.5 km" required />
            <Select label="Statut" name="status" value={formData.status} onChange={handleInputChange} options={[
              { value: 'Brouillon', label: 'Brouillon' },
              { value: 'Validé', label: 'Validé' },
              { value: 'En cours', label: 'En cours' },
              { value: 'Terminé', label: 'Terminé' },
              { value: 'Clôturé', label: 'Clôturé' }
            ]} required />
          </div>

          <Textarea label="Notes" name="notes" value={formData.notes || ''} onChange={handleInputChange} placeholder="Instructions particulières ou observations..." rows={3} />

          {/* Delivery Notes textarea */}
          {docType === 'DeliveryNote' && (
            <Textarea label="Delivery Notes" name="deliveryNoteNumber" value={formData.deliveryNoteNumber || ''} onChange={handleInputChange} placeholder="Notes de livraison..." rows={2} />
          )}

          <div className="flex items-center gap-2">
            <input type="checkbox" id="wasteForm" name="wasteForm" checked={formData.wasteForm} onChange={handleInputChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
            <label htmlFor="wasteForm" className="text-sm font-medium text-gray-700">BSD attaché à cette opération</label>
          </div>

          {/* Documents Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Documents d'opération (BSD signé, autorisations, etc.)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">Cliquez pour ajouter des fichiers</p>
              <p className="text-xs text-gray-400 mt-1">PDF, images, documents — max 20 Mo par fichier</p>
            </div>
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif" onChange={handleFileUpload} className="hidden" />
            {formData.documents.length > 0 && (
              <div className="mt-3 space-y-2">
                {formData.documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{doc.name}</span>
                      <span className="text-xs text-gray-400">{formatFileSize(doc.size ?? 0)}</span>
                    </div>
                    <button type="button" onClick={() => removeDocument(doc.id)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setIsCreateModalOpen(false); resetForm() }}>Annuler</Button>
            <Button type="submit" variant="primary">Créer l'opération</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setSelectedOperation(null); resetForm() }} title="Modifier l'Opération" size="xl">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Select label="Véhicule" name="vehicle" value={formData.vehicle} onChange={handleInputChange} required options={[{ value: '', label: 'Sélectionner un véhicule...' }, ...vehicleOptions]} />
              {formData.vehicle && isVisiteTechniqueExpired(fleetVehicles.find((v: any) => v.registration === formData.vehicle)?.technicalControlExpiry) && (
                <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Visite Technique expirée — affectation bloquée
                </div>
              )}
            </div>
            <Input label="Chauffeur principal" name="driver" value={formData.driver} onChange={handleInputChange} required />
          </div>
          <Input label="Chef d'opération" name="chefDeOperation" value={formData.chefDeOperation} onChange={handleInputChange} required />

          {/* Co-chauffeurs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Co-chauffeurs / Accompagnants</label>
            <div className="flex gap-2">
              <input type="text" value={coDriverInput} onChange={(e) => setCoDriverInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCoDriver() } }} placeholder="Nom de l'accompagnant" className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" />
              <button type="button" onClick={addCoDriver} className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm hover:bg-gray-200"><Plus className="h-4 w-4" /></button>
            </div>
            {formData.coDrivers.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.coDrivers.map(name => (
                  <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                    {name}
                    <button type="button" onClick={() => removeCoDriver(name)} className="text-blue-400 hover:text-blue-600"><X className="h-3.5 w-3.5" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Point de départ" name="origin" value={formData.origin ?? ''} onChange={handleInputChange} required />
            <Input label="Destination" name="destination" value={formData.destination ?? ''} onChange={handleInputChange} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Date de début" name="startDate" type="date" value={formData.startDate} onChange={handleInputChange} required />
            <Input label="Heure de début" name="startTime" type="time" value={formData.startTime} onChange={handleInputChange} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date de fin" name="endDate" type="date" value={formData.endDate} onChange={handleInputChange} required />
            <Input label="Heure de fin" name="endTime" type="time" value={formData.endTime} onChange={handleInputChange} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Distance" name="distance" value={formData.distance} onChange={handleInputChange} required />
            <Select label="Statut" name="status" value={formData.status} onChange={handleInputChange} options={[
              { value: 'Brouillon', label: 'Brouillon' },
              { value: 'Validé', label: 'Validé' },
              { value: 'En cours', label: 'En cours' },
              { value: 'Terminé', label: 'Terminé' },
              { value: 'Clôturé', label: 'Clôturé' }
            ]} required />
          </div>

          <Textarea label="Notes" name="notes" value={formData.notes || ''} onChange={handleInputChange} rows={3} />

          {/* Delivery Notes textarea */}
          {docType === 'DeliveryNote' && (
            <Textarea label="Delivery Notes" name="deliveryNoteNumber" value={formData.deliveryNoteNumber || ''} onChange={handleInputChange} placeholder="Notes de livraison..." rows={2} />
          )}

          <div className="flex items-center gap-2">
            <input type="checkbox" id="wasteForm-edit" name="wasteForm" checked={formData.wasteForm} onChange={handleInputChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
            <label htmlFor="wasteForm-edit" className="text-sm font-medium text-gray-700">BSD attaché à cette opération</label>
          </div>

          {/* Documents Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Documents d'opération</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">Cliquez pour ajouter des fichiers</p>
              <p className="text-xs text-gray-400 mt-1">PDF, images, documents — max 20 Mo par fichier</p>
            </div>
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif" onChange={handleFileUpload} className="hidden" />
            {formData.documents.length > 0 && (
              <div className="mt-3 space-y-2">
                {formData.documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{doc.name}</span>
                      <span className="text-xs text-gray-400">{formatFileSize(doc.size ?? 0)}</span>
                    </div>
                    <button type="button" onClick={() => removeDocument(doc.id)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setIsEditModalOpen(false); setSelectedOperation(null); resetForm() }}>Annuler</Button>
              {isAdmin && (
                <Button variant="danger" onClick={() => { if (selectedOperation) handleDelete(selectedOperation.id) }}><Trash2 className="h-4 w-4 mr-2" />Supprimer</Button>
              )}
            <Button type="submit" variant="primary">Enregistrer</Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewModalOpen} onClose={() => { setIsViewModalOpen(false); setSelectedOperation(null) }} title="Détails de l'Opération" size="lg">
        {selectedOperation && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-900">{selectedOperation.id}</h3>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedOperation.status)}`}>
                  {selectedOperation.status}
                </span>
              </div>
              {selectedOperation.wasteForm && (
                <div className="flex items-center gap-2 text-orange-700 text-sm">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">Bordereau de Suivi des Déchets attaché</span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Véhicule</p>
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-gray-400" />
                  {selectedOperation.vehicle}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Chauffeur principal</p>
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  {selectedOperation.driver}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Chef d'opération</p>
                <p className="font-medium text-gray-900">{selectedOperation.chefDeOperation}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Distance</p>
                <p className="font-medium text-gray-900">{selectedOperation.distance}</p>
              </div>
            </div>

            {selectedOperation.coDrivers.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Co-chauffeurs / Accompagnants</p>
                <div className="flex flex-wrap gap-2">
                  {selectedOperation.coDrivers.map(name => (
                    <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                      <Users className="h-3.5 w-3.5" />
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-sm text-gray-500 mb-2">Période d'opération</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-green-600 font-medium">DÉBUT</p>
                  <p className="font-semibold text-gray-900">{new Date(selectedOperation.startDate).toLocaleDateString('fr-FR')}</p>
                  <p className="text-sm text-gray-600">{selectedOperation.startTime}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-xs text-red-600 font-medium">FIN</p>
                  <p className="font-semibold text-gray-900">{new Date(selectedOperation.endDate).toLocaleDateString('fr-FR')}</p>
                  <p className="text-sm text-gray-600">{selectedOperation.endTime}</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-500 mb-2">Itinéraire</p>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Départ</p>
                    <p className="font-medium text-gray-900">{selectedOperation.origin}</p>
                  </div>
                  <div className="border-l-2 border-gray-300 h-6 ml-2"></div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Arrivée</p>
                    <p className="font-medium text-gray-900">{selectedOperation.destination}</p>
                  </div>
                </div>
              </div>
            </div>

            {selectedOperation.notes && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">Notes</p>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedOperation.notes}</p>
              </div>
            )}

            {/* Documents */}

            <div className="border-t pt-4">
              <p className="text-sm text-gray-500 mb-2">Documents joints ({selectedOperation.documents.length})</p>
              {selectedOperation.documents.length > 0 ? (
                <div className="space-y-2">
                  {selectedOperation.documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">{doc.name}</p>
                          <p className="text-xs text-gray-400">{formatFileSize(doc.size ?? 0)} — {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('fr-FR') : ''}</p>
                        </div>
                      </div>
                      <a href={doc.dataUrl ?? doc.url} download={doc.name} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Télécharger</a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">Aucun document joint</p>
              )}
            </div>

            {/* Delivery Notes textarea */}
            <div className="border-t pt-4">
              <div className="mb-2 text-xs text-pink-600 font-mono">DEBUG deliveryNoteNumber: {String(selectedOperation.deliveryNoteNumber)}</div>
              {selectedOperation.deliveryNoteNumber && (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Notes</label>
                  <textarea
                    className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    rows={2}
                    value={selectedOperation.deliveryNoteNumber}
                    readOnly
                    placeholder="Notes de livraison..."
                  />
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => { setIsViewModalOpen(false); setSelectedOperation(null) }}>
                Fermer
              </Button>
              <Button variant="primary" onClick={() => { setIsViewModalOpen(false); openEditModal(selectedOperation) }}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            </div>
          </div>
        )}
      </Modal>
      </div>
    </>
  )
}
