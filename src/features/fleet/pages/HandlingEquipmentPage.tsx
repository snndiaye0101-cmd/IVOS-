/**
 * ============================================
 * Page Engins de Manutention
 * Gestion des chariots élévateurs avec suivi VGP
 * ============================================
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Download,
  RefreshCw,
  Package,
} from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import Modal from '../../../components/ui/Modal';
import { toast } from 'sonner';
import type {
  HandlingEquipment,
  NewHandlingEquipmentData,
  EnergyType,
} from '../types/handlingEquipment.types';
import {
  getAllEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  generateVGPReport,
  generateVGPReportPDF,
  saveReportToArchives,
  seedHandlingEquipment,
} from '../services/handlingEquipmentService';

const EMPTY_FORM: NewHandlingEquipmentData = {
  serialNumber: '',
  type: 'Chariot élévateur',
  brand: '',
  model: '',
  energyType: 'Électrique',
  liftingCapacity: 0,
  lastVGPDate: '',
  commissioningDate: '',
  notes: '',
};

export default function HandlingEquipmentPage() {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<HandlingEquipment[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<HandlingEquipment | null>(null);
  const [form, setForm] = useState<NewHandlingEquipmentData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof NewHandlingEquipmentData, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chargement initial
  useEffect(() => {
    loadEquipment();
    const handleChange = () => loadEquipment();
    window.addEventListener('ivos_handling_equipment_change', handleChange);
    return () => window.removeEventListener('ivos_handling_equipment_change', handleChange);
  }, []);

  const loadEquipment = () => {
    const data = getAllEquipment();
    setEquipment(data);
  };

  const handleFieldChange = (key: keyof NewHandlingEquipmentData, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (formErrors[key]) setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof NewHandlingEquipmentData, string>> = {};
    if (!form.serialNumber.trim()) errors.serialNumber = 'Numéro de série requis';
    if (!form.type.trim()) errors.type = 'Type requis';
    if (!form.brand.trim()) errors.brand = 'Marque requise';
    if (!form.model.trim()) errors.model = 'Modèle requis';
    if (form.liftingCapacity <= 0) errors.liftingCapacity = 'Capacité doit être > 0';
    if (!form.lastVGPDate) errors.lastVGPDate = 'Date VGP requise';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = () => {
    if (!validateForm() || !user) return;
    setIsSubmitting(true);
    try {
      const newEquipment = createEquipment(form, user.id);
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      setFormErrors({});
      toast.success(`Engin ${newEquipment.serialNumber} créé avec succès`);
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    if (!validateForm() || !user || !selectedEquipment) return;
    setIsSubmitting(true);
    try {
      updateEquipment(selectedEquipment.id, form, user.id);
      setEditOpen(false);
      setSelectedEquipment(null);
      setForm(EMPTY_FORM);
      setFormErrors({});
      toast.success('Engin mis à jour');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!selectedEquipment) return;
    setIsSubmitting(true);
    try {
      deleteEquipment(selectedEquipment.id);
      setDeleteOpen(false);
      setSelectedEquipment(null);
      toast.success('Engin supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (eq: HandlingEquipment) => {
    setSelectedEquipment(eq);
    setForm({
      serialNumber: eq.serialNumber,
      type: eq.type,
      brand: eq.brand,
      model: eq.model,
      energyType: eq.energyType,
      liftingCapacity: eq.liftingCapacity,
      lastVGPDate: eq.lastVGPDate,
      commissioningDate: eq.commissioningDate || '',
      notes: eq.notes || '',
    });
    setEditOpen(true);
  };

  const openDelete = (eq: HandlingEquipment) => {
    setSelectedEquipment(eq);
    setDeleteOpen(true);
  };

  const handleGenerateReport = () => {
    try {
      const report = generateVGPReport();
      const pdf = generateVGPReportPDF(report);
      const pdfBlob = pdf.output('blob');
      saveReportToArchives(report, pdfBlob);
      pdf.save(`VGP_${report.reportMonth}.pdf`);
      toast.success('Rapport VGP généré et archivé');
    } catch {
      toast.error('Erreur génération rapport');
    }
  };

  const handleSeedData = () => {
    seedHandlingEquipment();
    toast.success('Données de test créées');
  };

  const getStatusBadge = (eq: HandlingEquipment) => {
    if (eq.vgpStatus === 'conforme') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-800">
          <CheckCircle className="h-3.5 w-3.5" />
          Conforme
        </span>
      );
    }
    if (eq.vgpStatus === 'à_renouveler') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-800">
          <AlertCircle className="h-3.5 w-3.5" />À renouveler (-30j)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-800">
        <AlertTriangle className="h-3.5 w-3.5" />
        Expiré — BLOQUÉ
      </span>
    );
  };

  const stats = {
    total: equipment.length,
    conforme: equipment.filter((eq) => eq.vgpStatus === 'conforme').length,
    aRenouveler: equipment.filter((eq) => eq.vgpStatus === 'à_renouveler').length,
    expire: equipment.filter((eq) => eq.vgpStatus === 'expiré').length,
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
              <Package className="h-8 w-8 text-[#1a5c3a]" />
              Engins de Manutention
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestion des chariots élévateurs et gerbeurs avec suivi VGP
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSeedData}
              className="flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Données Test
            </button>
            <button
              onClick={handleGenerateReport}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white shadow-lg transition-colors hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Rapport VGP PDF
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-[#1a5c3a] px-4 py-2 font-semibold text-white shadow-lg transition-colors hover:bg-[#14472e]"
            >
              <Plus className="h-4 w-4" />
              Nouvel Engin
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Total</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Package className="h-10 w-10 text-gray-400" />
            </div>
          </div>
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                  Conformes
                </p>
                <p className="mt-1 text-3xl font-bold text-green-900">{stats.conforme}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
                  À Renouveler
                </p>
                <p className="mt-1 text-3xl font-bold text-orange-900">{stats.aRenouveler}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-orange-600" />
            </div>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-red-700">Expirés</p>
                <p className="mt-1 text-3xl font-bold text-red-900">{stats.expire}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-red-600" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    N° Série
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    Marque / Modèle
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    Énergie
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    Capacité
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    Dernière VGP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    Prochaine VGP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {equipment.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                      <Package className="mx-auto mb-3 h-12 w-12 opacity-30" />
                      <p className="text-sm font-semibold">Aucun engin enregistré</p>
                      <p className="mt-1 text-xs">Cliquez sur "Nouvel Engin" pour commencer</p>
                    </td>
                  </tr>
                ) : (
                  equipment.map((eq) => (
                    <tr key={eq.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">
                        {eq.serialNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{eq.type}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {eq.brand} {eq.model}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span className="inline-block rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold">
                          {eq.energyType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">
                        {eq.liftingCapacity} T
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(eq.lastVGPDate).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(eq.nextVGPDate).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(eq)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEdit(eq)}
                            className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDelete(eq)}
                            className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* Modal Create */}
      <Modal
        isOpen={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setForm(EMPTY_FORM);
          setFormErrors({});
        }}
        title="Nouvel Engin de Manutention"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
                N° de Série <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.serialNumber}
                onChange={(e) => handleFieldChange('serialNumber', e.target.value)}
                placeholder="FLT-2024-001"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a5c3a]"
              />
              {formErrors.serialNumber && (
                <p className="mt-1 text-xs text-red-500">{formErrors.serialNumber}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.type}
                onChange={(e) => handleFieldChange('type', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a5c3a]"
              >
                <option value="Chariot élévateur">Chariot élévateur</option>
                <option value="Gerbeur électrique">Gerbeur électrique</option>
                <option value="Gerbeur manuel">Gerbeur manuel</option>
                <option value="Transpalette">Transpalette</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
                Marque <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => handleFieldChange('brand', e.target.value)}
                placeholder="Toyota, Caterpillar..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a5c3a]"
              />
              {formErrors.brand && <p className="mt-1 text-xs text-red-500">{formErrors.brand}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
                Modèle <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => handleFieldChange('model', e.target.value)}
                placeholder="8FD25, GC55K..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a5c3a]"
              />
              {formErrors.model && <p className="mt-1 text-xs text-red-500">{formErrors.model}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
                Type d'Énergie <span className="text-red-500">*</span>
              </label>
              <select
                value={form.energyType}
                onChange={(e) => handleFieldChange('energyType', e.target.value as EnergyType)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a5c3a]"
              >
                <option value="Électrique">Électrique</option>
                <option value="Diesel">Diesel</option>
                <option value="Gaz">Gaz</option>
                <option value="Essence">Essence</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
                Capacité de Levage (Tonnes) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.liftingCapacity || ''}
                onChange={(e) =>
                  handleFieldChange('liftingCapacity', parseFloat(e.target.value) || 0)
                }
                placeholder="2.5"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a5c3a]"
              />
              {formErrors.liftingCapacity && (
                <p className="mt-1 text-xs text-red-500">{formErrors.liftingCapacity}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
                Date Dernière VGP <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.lastVGPDate}
                onChange={(e) => handleFieldChange('lastVGPDate', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a5c3a]"
              />
              {formErrors.lastVGPDate && (
                <p className="mt-1 text-xs text-red-500">{formErrors.lastVGPDate}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
                Date de Mise en Service
              </label>
              <input
                type="date"
                value={form.commissioningDate || ''}
                onChange={(e) => handleFieldChange('commissioningDate', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a5c3a]"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
              Notes / Observations
            </label>
            <textarea
              rows={3}
              value={form.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Informations complémentaires..."
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a5c3a]"
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-2">
            <button
              onClick={() => {
                setCreateOpen(false);
                setForm(EMPTY_FORM);
                setFormErrors({});
              }}
              className="rounded-xl border border-gray-200 px-5 py-2.5 font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleCreate}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-[#1a5c3a] px-6 py-2.5 font-bold text-white shadow-lg transition-colors hover:bg-[#14472e] disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Créer
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Edit */}
      <Modal
        isOpen={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedEquipment(null);
          setForm(EMPTY_FORM);
          setFormErrors({});
        }}
        title="Modifier l'Engin"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
                N° de Série <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.serialNumber}
                onChange={(e) => handleFieldChange('serialNumber', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a5c3a]"
              />
              {formErrors.serialNumber && (
                <p className="mt-1 text-xs text-red-500">{formErrors.serialNumber}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.type}
                onChange={(e) => handleFieldChange('type', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a5c3a]"
              >
                <option value="Chariot élévateur">Chariot élévateur</option>
                <option value="Gerbeur électrique">Gerbeur électrique</option>
                <option value="Gerbeur manuel">Gerbeur manuel</option>
                <option value="Transpalette">Transpalette</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
                Marque <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => handleFieldChange('brand', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a5c3a]"
              />
              {formErrors.brand && <p className="mt-1 text-xs text-red-500">{formErrors.brand}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
                Modèle <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => handleFieldChange('model', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a5c3a]"
              />
              {formErrors.model && <p className="mt-1 text-xs text-red-500">{formErrors.model}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
                Type d'Énergie <span className="text-red-500">*</span>
              </label>
              <select
                value={form.energyType}
                onChange={(e) => handleFieldChange('energyType', e.target.value as EnergyType)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a5c3a]"
              >
                <option value="Électrique">Électrique</option>
                <option value="Diesel">Diesel</option>
                <option value="Gaz">Gaz</option>
                <option value="Essence">Essence</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
                Capacité (T) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.liftingCapacity || ''}
                onChange={(e) =>
                  handleFieldChange('liftingCapacity', parseFloat(e.target.value) || 0)
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a5c3a]"
              />
              {formErrors.liftingCapacity && (
                <p className="mt-1 text-xs text-red-500">{formErrors.liftingCapacity}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
                Date Dernière VGP <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.lastVGPDate}
                onChange={(e) => handleFieldChange('lastVGPDate', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a5c3a]"
              />
              {formErrors.lastVGPDate && (
                <p className="mt-1 text-xs text-red-500">{formErrors.lastVGPDate}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
                Date de Mise en Service
              </label>
              <input
                type="date"
                value={form.commissioningDate || ''}
                onChange={(e) => handleFieldChange('commissioningDate', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a5c3a]"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
              Notes
            </label>
            <textarea
              rows={3}
              value={form.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a5c3a]"
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-2">
            <button
              onClick={() => {
                setEditOpen(false);
                setSelectedEquipment(null);
                setForm(EMPTY_FORM);
                setFormErrors({});
              }}
              className="rounded-xl border border-gray-200 px-5 py-2.5 font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleEdit}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 font-bold text-white shadow-lg transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Edit2 className="h-4 w-4" />
              )}
              Mettre à jour
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Delete */}
      <Modal
        isOpen={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setSelectedEquipment(null);
        }}
        title="Supprimer l'Engin"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-bold text-red-900">Attention</p>
              <p className="mt-0.5 text-xs text-red-700">Cette action est irréversible.</p>
            </div>
          </div>
          {selectedEquipment && (
            <p className="text-sm text-gray-700">
              Voulez-vous vraiment supprimer l'engin{' '}
              <span className="font-bold">{selectedEquipment.serialNumber}</span> ?
            </p>
          )}
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-2">
            <button
              onClick={() => {
                setDeleteOpen(false);
                setSelectedEquipment(null);
              }}
              className="rounded-xl border border-gray-200 px-5 py-2.5 font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleDelete}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 font-bold text-white shadow-lg transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Supprimer
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
