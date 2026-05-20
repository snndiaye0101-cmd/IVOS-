import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { X, User, Shield, FileText } from 'lucide-react';

// --- Configuration IVOS Panorama ---
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export const PersonnelForm = ({ defaultRole, onSubmit, onCancel }: any) => {
  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      prenom: '',
      nom: '',
      matricule: '',
      role: defaultRole || 'Administratif',
      departement: '',
      poste: '',
      typeContrat: '',
      numPiece: '',
      dateValiditePiece: '',
      numPermis: '',
      dateValiditePermis: '',
      medicalDate: '',
      medicalValidity: '',
      groupeSanguin: '',
      urgence1Nom: '',
      urgence1Tel: '',
      urgence1Lien: '',
      urgence2Nom: '',
      urgence2Tel: '',
      urgence2Lien: '',
    },
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleOverlayClick}
      style={{ zIndex: 50 }}
    >
      <form
        ref={formRef}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit(onSubmit)}
        className="flex max-h-[90vh] w-full max-w-[95vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ zIndex: 55 }}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between bg-[#003366] p-6 text-white">
          <div>
            <h2 className="text-2xl font-bold">Nouveau Membre - Base KIGNABOUR</h2>
            <p className="text-sm text-blue-200">Saisie libre (Zéro champ obligatoire)</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-2 hover:bg-white/20"
            style={{ zIndex: 60, position: 'relative' }}
            aria-label="Fermer"
          >
            <X size={24} />
          </button>
        </div>

        {/* CORPS DU FORMULAIRE : 3 COLONNES HORIZONTALES */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-8 overflow-y-auto p-8 lg:grid-cols-3">
          {/* COLONNE 1 : IDENTITÉ & POSTE */}
          <div className="min-h-[350px] space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-6">
            <div className="mb-4 flex items-center gap-2 border-b pb-2 font-bold text-[#003366]">
              <User size={18} /> <h3 className="text-sm uppercase">I. Identité & Poste</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input {...register('prenom')} placeholder="Prénom" className="rounded border p-2" />
              <input {...register('nom')} placeholder="Nom" className="rounded border p-2" />
            </div>
            <input
              {...register('matricule')}
              placeholder="Matricule IVOS"
              className="w-full rounded border p-2"
            />

            {selectedRole === 'Administratif' && (
              <div className="space-y-3 border-t border-dashed pt-2">
                <select {...register('departement')} className="w-full rounded border bg-white p-2">
                  <option value="">-- Département --</option>
                  <option value="RH">RH</option>
                  <option value="Logistique">Logistique</option>
                  <option value="Finances">Finances</option>
                  <option value="HSE">HSE</option>
                </select>
                <input
                  {...register('poste')}
                  placeholder="Poste précis"
                  className="w-full rounded border p-2"
                />
              </div>
            )}
          </div>

          {/* COLONNE 2 : DOCUMENTS & VALIDITÉS */}
          <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-6">
            <div className="mb-4 flex items-center gap-2 border-b pb-2 font-bold text-[#003366]">
              <FileText size={18} /> <h3 className="text-sm uppercase">II. Documents & Dates</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[10px] font-bold text-gray-400">
                  PIÈCE D'IDENTITÉ
                </label>
                <div className="flex gap-2">
                  <input
                    {...register('numPiece')}
                    placeholder="N°"
                    className="flex-1 rounded border p-2"
                  />
                  <input
                    type="date"
                    {...register('dateValiditePiece')}
                    className="rounded border p-2 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-gray-400">
                  PERMIS DE CONDUIRE
                </label>
                <div className="flex gap-2">
                  <input
                    {...register('numPermis')}
                    placeholder="N°"
                    className="flex-1 rounded border p-2"
                  />
                  <input
                    type="date"
                    {...register('dateValiditePermis')}
                    className="rounded border p-2 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-gray-400">
                  VISITE MÉDICALE
                </label>
                <input
                  type="date"
                  {...register('medicalValidity')}
                  className="w-full rounded border p-2 text-xs"
                />
              </div>
            </div>
          </div>

          {/* COLONNE 3 : SÉCURITÉ & URGENCE (2 CONTACTS) */}
          <div className="space-y-4 rounded-xl border border-red-100 bg-red-50/30 p-6">
            <div className="mb-4 flex items-center gap-2 border-b border-red-200 pb-2 font-bold text-red-700">
              <Shield size={18} /> <h3 className="text-sm uppercase">III. Sécurité & Urgence</h3>
            </div>
            <select
              {...register('groupeSanguin')}
              className="w-full rounded border border-red-200 bg-white p-2"
            >
              <option value="">-- Groupe Sanguin --</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>

            <div className="space-y-3">
              <div className="rounded border border-red-100 bg-white p-3">
                <p className="mb-2 text-[10px] font-bold uppercase text-red-600">
                  Contact Urgence 1
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    {...register('urgence1Nom')}
                    placeholder="Nom"
                    className="border-b p-1 text-sm"
                  />
                  <input
                    {...register('urgence1Tel')}
                    placeholder="Téléphone"
                    className="border-b p-1 text-sm"
                  />
                </div>
              </div>
              <div className="rounded border border-red-100 bg-white p-3">
                <p className="mb-2 text-[10px] font-bold uppercase text-red-600">
                  Contact Urgence 2
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    {...register('urgence2Nom')}
                    placeholder="Nom"
                    className="border-b p-1 text-sm"
                  />
                  <input
                    {...register('urgence2Tel')}
                    placeholder="Téléphone"
                    className="border-b p-1 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div
          className="flex justify-end gap-4 border-t bg-gray-50 p-6"
          style={{ zIndex: 60, position: 'relative' }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-6 py-2 text-gray-500 hover:bg-gray-200"
            style={{ zIndex: 60, position: 'relative' }}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="rounded-lg bg-[#003366] px-10 py-2 font-bold text-white shadow-lg transition-all hover:bg-[#002244]"
          >
            Enregistrer à KIGNABOUR
          </button>
        </div>
      </form>
    </div>
  );
};
