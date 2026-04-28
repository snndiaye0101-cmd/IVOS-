
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { X, User, Shield, FileText } from 'lucide-react';

// --- Configuration IVOS Panorama ---
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export const PersonnelForm = ({ defaultRole, onSubmit, onCancel }: any) => {
  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      prenom: '', nom: '', matricule: '', role: defaultRole || 'Administratif',
      departement: '', poste: '', typeContrat: '',
      numPiece: '', dateValiditePiece: '',
      numPermis: '', dateValiditePermis: '',
      medicalDate: '', medicalValidity: '',
      groupeSanguin: '',
      urgence1Nom: '', urgence1Tel: '', urgence1Lien: '',
      urgence2Nom: '', urgence2Tel: '', urgence2Lien: ''
    }
  });

  const selectedRole = watch('role');
  const formRef = useRef<HTMLFormElement>(null);

  // Fermer avec la touche Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  // Overlay click handler
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCancel?.();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
      style={{ zIndex: 50 }}
    >
      <form
        ref={formRef}
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] overflow-hidden flex flex-col max-h-[90vh]"
        style={{ zIndex: 55 }}
      >
        {/* HEADER */}
        <div className="bg-[#003366] p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Nouveau Membre - Base KIGNABOUR</h2>
            <p className="text-blue-200 text-sm">Saisie libre (Zéro champ obligatoire)</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="hover:bg-white/20 p-2 rounded-full"
            style={{ zIndex: 60, position: 'relative' }}
            aria-label="Fermer"
          >
            <X size={24} />
          </button>
        </div>

        {/* CORPS DU FORMULAIRE : 3 COLONNES HORIZONTALES */}
        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-y-auto flex-1 min-h-0">
          
          {/* COLONNE 1 : IDENTITÉ & POSTE */}
          <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-100 min-h-[350px]">
            <div className="flex items-center gap-2 text-[#003366] font-bold border-b pb-2 mb-4">
              <User size={18} /> <h3 className="uppercase text-sm">I. Identité & Poste</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input {...register("prenom")} placeholder="Prénom" className="p-2 border rounded" />
              <input {...register("nom")} placeholder="Nom" className="p-2 border rounded" />
            </div>
            <input {...register("matricule")} placeholder="Matricule IVOS" className="w-full p-2 border rounded" />
            
            {selectedRole === 'Administratif' && (
              <div className="pt-2 space-y-3 border-t border-dashed">
                <select {...register("departement")} className="w-full p-2 border rounded bg-white">
                  <option value="">-- Département --</option>
                  <option value="RH">RH</option>
                  <option value="Logistique">Logistique</option>
                  <option value="Finances">Finances</option>
                  <option value="HSE">HSE</option>
                </select>
                <input {...register("poste")} placeholder="Poste précis" className="w-full p-2 border rounded" />
              </div>
            )}
          </div>

          {/* COLONNE 2 : DOCUMENTS & VALIDITÉS */}
          <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 text-[#003366] font-bold border-b pb-2 mb-4">
              <FileText size={18} /> <h3 className="uppercase text-sm">II. Documents & Dates</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">PIÈCE D'IDENTITÉ</label>
                <div className="flex gap-2">
                  <input {...register("numPiece")} placeholder="N°" className="flex-1 p-2 border rounded" />
                  <input type="date" {...register("dateValiditePiece")} className="p-2 border rounded text-xs" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">PERMIS DE CONDUIRE</label>
                <div className="flex gap-2">
                  <input {...register("numPermis")} placeholder="N°" className="flex-1 p-2 border rounded" />
                  <input type="date" {...register("dateValiditePermis")} className="p-2 border rounded text-xs" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">VISITE MÉDICALE</label>
                <input type="date" {...register("medicalValidity")} className="w-full p-2 border rounded text-xs" />
              </div>
            </div>
          </div>

          {/* COLONNE 3 : SÉCURITÉ & URGENCE (2 CONTACTS) */}
          <div className="space-y-4 bg-red-50/30 p-6 rounded-xl border border-red-100">
            <div className="flex items-center gap-2 text-red-700 font-bold border-b border-red-200 pb-2 mb-4">
              <Shield size={18} /> <h3 className="uppercase text-sm">III. Sécurité & Urgence</h3>
            </div>
            <select {...register("groupeSanguin")} className="w-full p-2 border rounded border-red-200 bg-white">
              <option value="">-- Groupe Sanguin --</option>
              {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
            </select>
            
            <div className="space-y-3">
              <div className="p-3 bg-white rounded border border-red-100">
                <p className="text-[10px] font-bold text-red-600 mb-2 uppercase">Contact Urgence 1</p>
                <div className="grid grid-cols-2 gap-2">
                  <input {...register("urgence1Nom")} placeholder="Nom" className="p-1 border-b text-sm" />
                  <input {...register("urgence1Tel")} placeholder="Téléphone" className="p-1 border-b text-sm" />
                </div>
              </div>
              <div className="p-3 bg-white rounded border border-red-100">
                <p className="text-[10px] font-bold text-red-600 mb-2 uppercase">Contact Urgence 2</p>
                <div className="grid grid-cols-2 gap-2">
                  <input {...register("urgence2Nom")} placeholder="Nom" className="p-1 border-b text-sm" />
                  <input {...register("urgence2Tel")} placeholder="Téléphone" className="p-1 border-b text-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-6 bg-gray-50 border-t flex justify-end gap-4" style={{ zIndex: 60, position: 'relative' }}>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-gray-500 hover:bg-gray-200 rounded-lg"
            style={{ zIndex: 60, position: 'relative' }}
          >
            Annuler
          </button>
          <button type="submit" className="px-10 py-2 bg-[#003366] text-white rounded-lg font-bold shadow-lg hover:bg-[#002244] transition-all">
            Enregistrer à KIGNABOUR
          </button>
        </div>
      </form>
    </div>
  );
};