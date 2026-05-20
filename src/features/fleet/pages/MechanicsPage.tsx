import {
  Plus,
  Search,
  Phone,
  Mail,
  Edit,
  Eye,
  Trash2,
  Calendar,
  CreditCard,
  Upload,
  X,
  Paperclip,
  Globe,
  Camera,
  Wrench,
} from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import Textarea from '../../../components/ui/Textarea';
import { sendNotification } from '../../../shared/services/notificationService';
import { useAuth } from '../../../shared/contexts/AuthContext';

interface IdDocumentFile {
  name: string;
  size: number;
  dataUrl: string;
}

interface Mechanic {
  id: string;
  name: string;
  phone: string;
  email: string;
  position: string;
  specialization: string;
  certifications?: string;
  nationality: string;
  idDocumentType: 'CNI' | 'Passeport';
  idDocumentNumber: string;
  idDocumentFile?: IdDocumentFile;
  hireDate: string;
  experience: number;
  status: 'Disponible' | 'En intervention' | 'Repos';
  assignedVehicle?: string;
  licenseNumber: string;
  licenseType: string;
  licenseIssueDate: string;
  licenseExpiryDate: string;
  lastTraining?: string;
  nextTraining?: string;
  notes?: string;
  photo?: string;
}

const MECHANICS_KEY = 'ivos_mechanics_v1';

const defaultMechanics: Mechanic[] = [
  {
    id: 'm1',
    name: 'Amina Diop',
    phone: '+221 77 111 22 33',
    email: 'amina.diop@ivos.sn',
    position: 'Mécanicien',
    specialization: 'Moteur & Transmission',
    certifications: 'Certificat maintenance lourde (2020)',
    hireDate: '2019-04-01',
    experience: 7,
    status: 'Disponible',
    assignedVehicle: 'SN-8765-AB',
    nationality: 'Sénégalaise',
    idDocumentType: 'CNI',
    idDocumentNumber: 'SN-CNI-19045678',
    licenseNumber: 'SN-2019-045678',
    licenseType: 'B, C',
    licenseIssueDate: '2019-03-15',
    licenseExpiryDate: '2029-03-15',
    lastTraining: '2025-05-20',
    nextTraining: '2026-05-20',
    notes: 'Expert en diagnostics moteur',
  },
];

export default function MechanicsPage() {
  const { allUsers } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);

  const [mechanics, setMechanics] = useState<Mechanic[]>(() => {
    try {
      const raw = localStorage.getItem(MECHANICS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.length > 0) return parsed;
      }
    } catch {}
    return defaultMechanics;
  });

  useEffect(() => {
    try {
      localStorage.setItem(MECHANICS_KEY, JSON.stringify(mechanics));
    } catch {}
  }, [mechanics]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    position: '',
    specialization: '',
    certifications: '',
    nationality: '',
    idDocumentType: 'CNI' as Mechanic['idDocumentType'],
    idDocumentNumber: '',
    hireDate: '',
    experience: 0,
    status: 'Disponible' as Mechanic['status'],
    assignedVehicle: '',
    licenseNumber: '',
    licenseType: 'B',
    licenseIssueDate: '',
    licenseExpiryDate: '',
    lastTraining: '',
    nextTraining: '',
    notes: '',
  });
  const [idDocFile, setIdDocFile] = useState<IdDocumentFile | undefined>(undefined);
  const idFileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(undefined);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image trop volumineuse (max 20 Mo)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const filtered = mechanics.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: ['experience'].includes(name)
        ? parseInt(value) || 0
        : type === 'checkbox'
          ? checked
          : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      position: '',
      specialization: '',
      certifications: '',
      nationality: '',
      idDocumentType: 'CNI',
      idDocumentNumber: '',
      hireDate: '',
      experience: 0,
      status: 'Disponible',
      assignedVehicle: '',
      licenseNumber: '',
      licenseType: 'B',
      licenseIssueDate: '',
      licenseExpiryDate: '',
      lastTraining: '',
      nextTraining: '',
      notes: '',
    });
    setIdDocFile(undefined);
    setPhotoPreview(undefined);
  };

  const handleIdFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 20 Mo)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setIdDocFile({ name: file.name, size: file.size, dataUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const formatFileSize = (bytes: number) =>
    bytes < 1024
      ? bytes + ' o'
      : bytes < 1048576
        ? (bytes / 1024).toFixed(1) + ' Ko'
        : (bytes / 1048576).toFixed(1) + ' Mo';

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newMech: Mechanic = {
      id: Date.now().toString(),
      ...formData,
      idDocumentFile: idDocFile,
      photo: photoPreview,
    };
    setMechanics([...mechanics, newMech]);
    setIsCreateModalOpen(false);
    resetForm();
    toast.success('Mécanicien ajouté');
    // Notification au mécanicien si trouvé
    const mechanicUser = allUsers.find((u: { fullName: string }) => u.fullName === newMech.name);
    if (mechanicUser) {
      sendNotification({
        userId: mechanicUser.id,
        type: 'other',
        title: 'Nouveau compte mécanicien',
        message: `Un nouveau compte mécanicien a été créé pour ${newMech.name}.`,
        entityType: 'mechanic',
        entityId: newMech.id,
        metadata: { mechanic: newMech.name },
      });
    }
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMechanic) return;
    setMechanics(
      mechanics.map((m) =>
        m.id === selectedMechanic.id
          ? { ...m, ...formData, idDocumentFile: idDocFile, photo: photoPreview }
          : m
      )
    );
    setIsEditModalOpen(false);
    setSelectedMechanic(null);
    resetForm();
    toast.success('Mécanicien modifié');
    // Correction : définir user ou remplacer par l'utilisateur courant
    // sendNotification({ userId: currentUser.id, ... })
  };

  const openEdit = (m: Mechanic) => {
    setSelectedMechanic(m);
    setFormData({
      name: m.name,
      phone: m.phone,
      email: m.email,
      position: m.position,
      specialization: m.specialization,
      certifications: m.certifications || '',
      nationality: m.nationality,
      idDocumentType: m.idDocumentType,
      idDocumentNumber: m.idDocumentNumber,
      hireDate: m.hireDate,
      experience: m.experience,
      status: m.status,
      assignedVehicle: m.assignedVehicle || '',
      licenseNumber: m.licenseNumber,
      licenseType: m.licenseType,
      licenseIssueDate: m.licenseIssueDate,
      licenseExpiryDate: m.licenseExpiryDate,
      lastTraining: m.lastTraining || '',
      nextTraining: m.nextTraining || '',
      notes: m.notes || '',
    });
    setIdDocFile(m.idDocumentFile);
    setPhotoPreview(m.photo);
    setIsEditModalOpen(true);
  };

  const openView = (m: Mechanic) => {
    setSelectedMechanic(m);
    setIsViewModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer ce mécanicien ?')) {
      setMechanics(mechanics.filter((m) => m.id !== id));
      setIsEditModalOpen(false);
      setSelectedMechanic(null);
      toast.success('Supprimé');
    }
  };

  return (
    <div className="min-h-screen w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
            <Wrench className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mécaniciens</h1>
            <p className="text-sm text-gray-300">Gestion des équipes de maintenance</p>
          </div>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nouveau
        </button>
      </div>

      <div className="mb-6 rounded-2xl bg-white p-4 shadow-md">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center shadow-md">
          <Wrench className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="mb-1 text-sm font-medium text-gray-900">Aucun mécanicien trouvé</h3>
          <p className="text-sm text-gray-500">
            {searchTerm ? 'Modifiez votre recherche' : 'Ajoutez votre premier mécanicien'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl bg-white p-6 shadow-md transition-all duration-200 hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {m.photo ? (
                    <img
                      src={m.photo}
                      alt={m.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                      {m.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{m.name}</h3>
                    <p className="text-sm text-gray-500">
                      {m.position} — {m.specialization}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-gray-500">{m.status}</div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {m.phone}
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {m.email}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Embauché: {new Date(m.hireDate).toLocaleDateString('fr-FR')}
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Permis: {m.licenseType}
                  {new Date(m.licenseExpiryDate) <
                    new Date(new Date().setMonth(new Date().getMonth() + 3)) && (
                    <span className="ml-1 rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                      Expire bientôt
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  {m.nationality}
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  {m.idDocumentType}: {m.idDocumentNumber}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => openView(m)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                >
                  {' '}
                  <Eye className="h-4 w-4" />{' '}
                </button>
                <button
                  onClick={() => openEdit(m)}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700"
                >
                  <Edit className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Nouveau Mécanicien"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Photo du mécanicien */}
          <div className="flex flex-col items-center gap-2">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Photo"
                  className="h-24 w-24 rounded-full border-2 border-blue-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotoPreview(undefined)}
                  className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => photoInputRef.current?.click()}
                className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-100 hover:border-blue-400"
              >
                <Camera className="h-6 w-6 text-gray-400" />
                <span className="mt-1 text-xs text-gray-400">Photo</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Changer la photo
            </button>
            <p className="text-xs text-gray-400">Max 20 Mo — JPG, PNG</p>
          </div>
          <Input
            label="Nom complet"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Téléphone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Poste"
              name="position"
              value={formData.position}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Spécialisation"
              name="specialization"
              value={formData.specialization}
              onChange={handleInputChange}
              required
            />
          </div>
          <Input
            label="Certifications"
            name="certifications"
            value={formData.certifications}
            onChange={handleInputChange}
          />

          {/* Nationalité & Pièce d'identité */}
          <div className="border-t pt-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-700">
              🌍 Nationalité & Pièce d'identité
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Nationalité"
                name="nationality"
                value={formData.nationality}
                onChange={handleInputChange}
                placeholder="Sénégalaise"
                required
              />
              <Select
                label="Type de pièce"
                name="idDocumentType"
                value={formData.idDocumentType}
                onChange={handleInputChange}
                options={[
                  { value: 'CNI', label: "Carte Nationale d'Identité" },
                  { value: 'Passeport', label: 'Passeport' },
                ]}
                required
              />
              <Input
                label="N° de pièce"
                name="idDocumentNumber"
                value={formData.idDocumentNumber}
                onChange={handleInputChange}
                placeholder="SN-CNI-XXXXXXXX"
                required
              />
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Scan / Photo de la pièce
              </label>
              <input
                ref={idFileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleIdFileUpload}
                className="hidden"
              />
              {idDocFile ? (
                <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">{idDocFile.name}</span>
                    <span className="text-xs text-green-600">
                      ({formatFileSize(idDocFile.size)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIdDocFile(undefined)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => idFileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500"
                >
                  <Upload className="h-4 w-4" />
                  Cliquer pour uploader (max 20 Mo)
                </button>
              )}
            </div>
          </div>

          {/* Permis de conduire */}
          <div className="border-t pt-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-700">🪪 Permis de conduire</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="N° de permis"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleInputChange}
                placeholder="SN-XXXX-XXXXXX"
                required
              />
              <Select
                label="Catégorie(s)"
                name="licenseType"
                value={formData.licenseType}
                onChange={handleInputChange}
                options={[
                  { value: 'A', label: 'A — Moto' },
                  { value: 'B', label: 'B — Véhicule léger' },
                  { value: 'C', label: 'C — Poids lourd' },
                  { value: 'D', label: 'D — Transport en commun' },
                  { value: 'B, C', label: 'B + C' },
                  { value: 'B, D', label: 'B + D' },
                  { value: 'B, C, D', label: 'B + C + D' },
                  { value: 'C, D', label: 'C + D' },
                ]}
                required
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <Input
                label="Date de délivrance"
                name="licenseIssueDate"
                type="date"
                value={formData.licenseIssueDate}
                onChange={handleInputChange}
                required
              />
              <Input
                label="Date d'expiration"
                name="licenseExpiryDate"
                type="date"
                value={formData.licenseExpiryDate}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date d'embauche"
              name="hireDate"
              type="date"
              value={formData.hireDate}
              onChange={handleInputChange}
            />
            <Input
              label="Années d'expérience"
              name="experience"
              type="number"
              value={formData.experience}
              onChange={handleInputChange}
            />
          </div>
          <Textarea
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
            >
              Annuler
            </Button>
            <Button type="submit" variant="primary">
              Créer
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedMechanic(null);
          resetForm();
        }}
        title="Modifier Mécanicien"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          {/* Photo du mécanicien */}
          <div className="flex flex-col items-center gap-2">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Photo"
                  className="h-24 w-24 rounded-full border-2 border-blue-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotoPreview(undefined)}
                  className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => photoInputRef.current?.click()}
                className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-100 hover:border-blue-400"
              >
                <Camera className="h-6 w-6 text-gray-400" />
                <span className="mt-1 text-xs text-gray-400">Photo</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Changer la photo
            </button>
            <p className="text-xs text-gray-400">Max 20 Mo — JPG, PNG</p>
          </div>
          <Input
            label="Nom complet"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Téléphone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Poste"
              name="position"
              value={formData.position}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Spécialisation"
              name="specialization"
              value={formData.specialization}
              onChange={handleInputChange}
              required
            />
          </div>
          <Input
            label="Certifications"
            name="certifications"
            value={formData.certifications}
            onChange={handleInputChange}
          />

          {/* Nationalité & Pièce d'identité */}
          <div className="border-t pt-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-700">
              🌍 Nationalité & Pièce d'identité
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Nationalité"
                name="nationality"
                value={formData.nationality}
                onChange={handleInputChange}
                placeholder="Sénégalaise"
                required
              />
              <Select
                label="Type de pièce"
                name="idDocumentType"
                value={formData.idDocumentType}
                onChange={handleInputChange}
                options={[
                  { value: 'CNI', label: "Carte Nationale d'Identité" },
                  { value: 'Passeport', label: 'Passeport' },
                ]}
                required
              />
              <Input
                label="N° de pièce"
                name="idDocumentNumber"
                value={formData.idDocumentNumber}
                onChange={handleInputChange}
                placeholder="SN-CNI-XXXXXXXX"
                required
              />
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Scan / Photo de la pièce
              </label>
              <input
                ref={idFileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleIdFileUpload}
                className="hidden"
              />
              {idDocFile ? (
                <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">{idDocFile.name}</span>
                    <span className="text-xs text-green-600">
                      ({formatFileSize(idDocFile.size)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIdDocFile(undefined)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => idFileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500"
                >
                  <Upload className="h-4 w-4" />
                  Cliquer pour uploader (max 20 Mo)
                </button>
              )}
            </div>
          </div>

          {/* Permis de conduire */}
          <div className="border-t pt-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-700">🪪 Permis de conduire</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="N° de permis"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleInputChange}
                placeholder="SN-XXXX-XXXXXX"
                required
              />
              <Select
                label="Catégorie(s)"
                name="licenseType"
                value={formData.licenseType}
                onChange={handleInputChange}
                options={[
                  { value: 'A', label: 'A — Moto' },
                  { value: 'B', label: 'B — Véhicule léger' },
                  { value: 'C', label: 'C — Poids lourd' },
                  { value: 'D', label: 'D — Transport en commun' },
                  { value: 'B, C', label: 'B + C' },
                  { value: 'B, D', label: 'B + D' },
                  { value: 'B, C, D', label: 'B + C + D' },
                  { value: 'C, D', label: 'C + D' },
                ]}
                required
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <Input
                label="Date de délivrance"
                name="licenseIssueDate"
                type="date"
                value={formData.licenseIssueDate}
                onChange={handleInputChange}
                required
              />
              <Input
                label="Date d'expiration"
                name="licenseExpiryDate"
                type="date"
                value={formData.licenseExpiryDate}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date d'embauche"
              name="hireDate"
              type="date"
              value={formData.hireDate}
              onChange={handleInputChange}
            />
            <Input
              label="Années d'expérience"
              name="experience"
              type="number"
              value={formData.experience}
              onChange={handleInputChange}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="danger"
              onClick={() => {
                if (selectedMechanic) handleDelete(selectedMechanic.id);
              }}
            >
              {' '}
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
            <Button type="submit" variant="primary">
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedMechanic(null);
        }}
        title="Détails du Mécanicien"
      >
        {selectedMechanic && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {selectedMechanic.photo ? (
                <img
                  src={selectedMechanic.photo}
                  alt={selectedMechanic.name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                  {selectedMechanic.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold">{selectedMechanic.name}</h3>
                <p className="text-sm text-gray-500">
                  {selectedMechanic.position} — {selectedMechanic.specialization}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-sm text-gray-500">Téléphone</p>
                <p className="font-medium text-gray-900">{selectedMechanic.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{selectedMechanic.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Certifications</p>
                <p className="font-medium text-gray-900">
                  {selectedMechanic.certifications || '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Expérience</p>
                <p className="font-medium text-gray-900">{selectedMechanic.experience} ans</p>
              </div>
            </div>

            {/* Nationalité & Pièce d'identité */}
            <div className="border-t pt-4">
              <h4 className="mb-3 text-sm font-semibold text-gray-700">
                🌍 Nationalité & Pièce d'identité
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Nationalité</p>
                  <p className="font-medium text-gray-900">{selectedMechanic.nationality}</p>
                </div>
                <div>
                  <p className="text-gray-500">Type de pièce</p>
                  <p className="font-medium text-gray-900">
                    {selectedMechanic.idDocumentType === 'CNI'
                      ? "Carte Nationale d'Identité"
                      : 'Passeport'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">N° de pièce</p>
                  <p className="font-medium text-gray-900">{selectedMechanic.idDocumentNumber}</p>
                </div>
                {selectedMechanic.idDocumentFile && (
                  <div>
                    <p className="text-gray-500">Fichier joint</p>
                    <a
                      href={selectedMechanic.idDocumentFile.dataUrl}
                      download={selectedMechanic.idDocumentFile.name}
                      className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800"
                    >
                      <Paperclip className="h-4 w-4" />
                      {selectedMechanic.idDocumentFile.name}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Permis de conduire */}
            <div className="border-t pt-4">
              <h4 className="mb-3 text-sm font-semibold text-gray-700">🪪 Permis de conduire</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">N° de permis</p>
                  <p className="font-medium text-gray-900">{selectedMechanic.licenseNumber}</p>
                </div>
                <div>
                  <p className="text-gray-500">Catégorie(s)</p>
                  <p className="font-medium text-gray-900">{selectedMechanic.licenseType}</p>
                </div>
                <div>
                  <p className="text-gray-500">Date de délivrance</p>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedMechanic.licenseIssueDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Date d'expiration</p>
                  <p
                    className={`font-medium ${new Date(selectedMechanic.licenseExpiryDate) < new Date(new Date().setMonth(new Date().getMonth() + 3)) ? 'text-red-600' : 'text-gray-900'}`}
                  >
                    {new Date(selectedMechanic.licenseExpiryDate).toLocaleDateString('fr-FR')}
                    {new Date(selectedMechanic.licenseExpiryDate) < new Date() && (
                      <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                        Expiré
                      </span>
                    )}
                    {new Date(selectedMechanic.licenseExpiryDate) >= new Date() &&
                      new Date(selectedMechanic.licenseExpiryDate) <
                        new Date(new Date().setMonth(new Date().getMonth() + 3)) && (
                        <span className="ml-2 rounded-full bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700">
                          Expire bientôt
                        </span>
                      )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedMechanic(null);
                }}
              >
                Fermer
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  if (selectedMechanic) openEdit(selectedMechanic);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
