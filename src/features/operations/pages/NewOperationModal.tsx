// ============================================
// NewOperationModal → Formulaire BSD Enrichi
// Remplacement du formulaire opérations par création d'opérations BSD
// Sections 1-4 du bordereau + Transport
// ============================================
import React, { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { Leaf, RefreshCw, Truck } from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { createOperation } from '../../exploitation/services/operationService';
import type { NewOperationData } from '../../exploitation/types/operation.types';
import { toast } from 'sonner';

interface NewOperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (operation: any) => void;
  existingCount: number;
}

interface FieldProps {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; error?: string; type?: string; required?: boolean;
}
const Field: React.FC<FieldProps> = ({ label, value, onChange, placeholder, error, type = 'text', required = true }) => (
  <div>
    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-[#1a5c3a] focus:border-[#1a5c3a] outline-none transition-colors ${error ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const EMPTY_FORM: NewOperationData = {
  client: '', clientNom: '', clientTelephone: '', clientAdresse: '', clientEmail: '',
  typeDechet: '', etatDechet: '',
  typeConditionnement: '', nombreColis: '',
  quantiteKg: '', uniteComplementaire: '',
  vehicule: '', immatriculation: '', chauffeur: '',
  dateDepart: new Date().toISOString().split('T')[0],
  observations: '',
};

export default function NewOperationModal({ isOpen, onClose, onCreate }: NewOperationModalProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<NewOperationData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof NewOperationData, string>>>({});
  const [isCreating, setIsCreating] = useState(false);

  const handleFieldChange = (key: keyof NewOperationData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (formErrors[key]) setFormErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof NewOperationData, string>> = {};
    if (!form.client.trim()) errors.client = 'Champ requis';
    if (!form.typeDechet.trim()) errors.typeDechet = 'Champ requis';
    if (!form.vehicule.trim()) errors.vehicule = 'Champ requis';
    if (!form.immatriculation.trim()) errors.immatriculation = 'Champ requis';
    if (!form.chauffeur.trim()) errors.chauffeur = 'Champ requis';
    if (!form.dateDepart) errors.dateDepart = 'Champ requis';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = () => {
    if (!validateForm() || !user) return;
    setIsCreating(true);
    try {
      const op = createOperation(form, user.id, user.fullName);
      setForm(EMPTY_FORM); 
      setFormErrors({});
      onCreate(op); // Passe l'opération créée au parent
      onClose();
      toast.success(`Operation ${op.numero} lancee — BSD etabli automatiquement`, { duration: 5000 });
    } catch { 
      toast.error('Erreur lors de la creation'); 
    }
    finally { 
      setIsCreating(false); 
    }
  };

  const closeModal = () => { 
    onClose(); 
    setForm(EMPTY_FORM); 
    setFormErrors({}); 
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title="Nouvelle Operation BSD" size="xxl">
      <div className="space-y-5">
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
          <Leaf className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-900">BSD genere automatiquement au lancement</p>
            <p className="text-xs text-emerald-700 mt-0.5">Remplissez les sections 1 à 4 du bordereau. Les sections transporteur seront completees ulterieurement.</p>
          </div>
        </div>
        
        {/* SECTION 1 — CLIENT */}
        <div className="border-l-4 border-l-[#1a5c3a] pl-4 pb-3">
          <h3 className="text-sm font-bold text-[#1a5c3a] uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="bg-[#1a5c3a] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
            Client / Producteur de dechet
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Producteur de dechet" value={form.client} onChange={v => handleFieldChange('client', v)} placeholder="ex : TOTAL ENERGIES Senegal" error={formErrors.client} />
            </div>
            <Field label="Nom contact" value={form.clientNom ?? ''} onChange={v => handleFieldChange('clientNom', v)} placeholder="Nom complet du contact" required={false} />
            <Field label="Telephone" value={form.clientTelephone ?? ''} onChange={v => handleFieldChange('clientTelephone', v)} placeholder="+221 ..." type="tel" required={false} />
            <Field label="Adresse" value={form.clientAdresse ?? ''} onChange={v => handleFieldChange('clientAdresse', v)} placeholder="Adresse complete" required={false} />
            <Field label="Email" value={form.clientEmail ?? ''} onChange={v => handleFieldChange('clientEmail', v)} placeholder="contact@client.sn" type="email" required={false} />
          </div>
        </div>
        
        {/* SECTION 2 — DENOMINATION */}
        <div className="border-l-4 border-l-[#1a5c3a] pl-4 pb-3">
          <h3 className="text-sm font-bold text-[#1a5c3a] uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="bg-[#1a5c3a] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
            Denomination du dechet
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Denomination usuelle" value={form.typeDechet} onChange={v => handleFieldChange('typeDechet', v)} placeholder="ex : Huiles usagees, Boues de forage..." error={formErrors.typeDechet} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Etat physique</label>
              <select value={form.etatDechet ?? ''} onChange={e => handleFieldChange('etatDechet', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-[#1a5c3a] outline-none">
                <option value="">-- Selectionner --</option>
                <option value="gazeux">Gazeux / Gaz</option>
                <option value="liquide">Liquide(s)</option>
                <option value="boues">Boues / Pateux</option>
                <option value="solide">Solide</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* SECTION 3 — CONDITIONNEMENT */}
        <div className="border-l-4 border-l-[#1a5c3a] pl-4 pb-3">
          <h3 className="text-sm font-bold text-[#1a5c3a] uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="bg-[#1a5c3a] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
            Conditionnement
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Type de conditionnement</label>
              <select value={form.typeConditionnement ?? ''} onChange={e => handleFieldChange('typeConditionnement', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-[#1a5c3a] outline-none">
                <option value="">-- Selectionner --</option>
                <option value="benne">Benne(s) / Waste skip</option>
                <option value="citerne">Citerne(s) / Tank</option>
                <option value="grv">GRV / IBC</option>
                <option value="fut">Fut(s) / Drum</option>
                <option value="sac">Sac poubelle / Garbage bag</option>
              </select>
            </div>
            <Field label="Nombre de colis" value={form.nombreColis ?? ''} onChange={v => handleFieldChange('nombreColis', v)} placeholder="ex : 5" type="number" required={false} />
          </div>
        </div>
        
        {/* SECTION 4 — QUANTITE */}
        <div className="border-l-4 border-l-[#1a5c3a] pl-4 pb-3">
          <h3 className="text-sm font-bold text-[#1a5c3a] uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="bg-[#1a5c3a] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">4</span>
            Quantite
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Quantite (kg)" value={form.quantiteKg ?? ''} onChange={v => handleFieldChange('quantiteKg', v)} placeholder="0.00" type="number" required={false} />
            <Field label="Unite complementaire" value={form.uniteComplementaire ?? ''} onChange={v => handleFieldChange('uniteComplementaire', v)} placeholder="m³, L, unites..." required={false} />
          </div>
        </div>
        
        {/* TRANSPORT */}
        <div className="border-l-4 border-l-orange-500 pl-4 pb-3">
          <h3 className="text-sm font-bold text-orange-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Transport IVOS
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Vehicule" value={form.vehicule} onChange={v => handleFieldChange('vehicule', v)} placeholder="Benne 10T" error={formErrors.vehicule} />
            <Field label="Immatriculation" value={form.immatriculation} onChange={v => handleFieldChange('immatriculation', v)} placeholder="DK-123-AB" error={formErrors.immatriculation} />
            <Field label="Chauffeur" value={form.chauffeur} onChange={v => handleFieldChange('chauffeur', v)} placeholder="Nom complet" error={formErrors.chauffeur} />
            <Field label="Date de depart" value={form.dateDepart} onChange={v => handleFieldChange('dateDepart', v)} type="date" error={formErrors.dateDepart} />
          </div>
        </div>
        
        {/* OBSERVATIONS */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
            Observations <span className="text-gray-400 font-normal normal-case">(optionnel)</span>
          </label>
          <textarea value={form.observations ?? ''} onChange={e => handleFieldChange('observations', e.target.value)}
            rows={2} placeholder="Instructions particulieres, remarques..."
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-[#1a5c3a] outline-none resize-none" />
        </div>
        
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={closeModal} type="button" className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">Annuler</button>
          <button onClick={handleCreate} disabled={isCreating} type="button"
            className="px-6 py-2.5 rounded-xl bg-[#1a5c3a] text-white font-bold flex items-center gap-2 hover:bg-[#14472e] transition-colors disabled:opacity-50 shadow-lg">
            {isCreating ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generation...</> : <><Leaf className="w-4 h-4" /> Lancer l&apos;operation</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}
