/**
 * Modal de création de facture libre (sans BSD)
 * Accessible uniquement aux Super Admin
 */

import { useState } from 'react';
import { X, Plus, Trash2, FileText, DollarSign } from 'lucide-react';
import { formatCleanAmount } from '../../../shared/utils/formatAmount';
import type { NewInvoiceData, InvoiceLine, PaymentMethod } from '../types/invoice.types';

interface Client {
  id: string;
  name: string;
  siret?: string;
  address?: string;
}

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewInvoiceData) => void;
  clients: Client[];
}

export default function CreateInvoiceModal({ isOpen, onClose, onSubmit, clients }: CreateInvoiceModalProps) {
  // États du formulaire
  const [selectedClientId, setSelectedClientId] = useState('');
  const [dateEcheance, setDateEcheance] = useState('');
  const [tauxTVA, setTauxTVA] = useState(18);
  const [modeReglement, setModeReglement] = useState<PaymentMethod>('Virement');
  const [notes, setNotes] = useState('');
  
  // Lignes de facturation
  const [lignes, setLignes] = useState<Omit<InvoiceLine, 'id'>[]>([
    {
      description: '',
      quantite: 1,
      unite: 'forfait',
      prixUnitaireHT: 0,
      totalHT: 0,
    }
  ]);

  if (!isOpen) return null;

  // Calcul automatique du total d'une ligne
  const updateLigneTotal = (index: number, quantite: number, prixUnitaire: number) => {
    const newLignes = [...lignes];
    newLignes[index].quantite = quantite;
    newLignes[index].prixUnitaireHT = prixUnitaire;
    newLignes[index].totalHT = quantite * prixUnitaire;
    setLignes(newLignes);
  };

  // Ajouter une ligne
  const addLigne = () => {
    setLignes([
      ...lignes,
      {
        description: '',
        quantite: 1,
        unite: 'forfait',
        prixUnitaireHT: 0,
        totalHT: 0,
      }
    ]);
  };

  // Supprimer une ligne
  const removeLigne = (index: number) => {
    if (lignes.length > 1) {
      setLignes(lignes.filter((_, i) => i !== index));
    }
  };

  // Calcul des totaux
  const totalHT = lignes.reduce((sum, ligne) => sum + ligne.totalHT, 0);
  const totalTVA = totalHT * (tauxTVA / 100);
  const totalTTC = totalHT + totalTVA;

  // Client sélectionné
  const selectedClient = clients.find(c => c.id === selectedClientId);

  // Soumission du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId) {
      alert('Veuillez sélectionner un client');
      return;
    }

    if (lignes.some(l => !l.description.trim())) {
      alert('Veuillez renseigner toutes les descriptions');
      return;
    }

    if (!dateEcheance) {
      alert('Veuillez définir une date d\'échéance');
      return;
    }

    const data: NewInvoiceData = {
      clientId: selectedClientId,
      clientNom: selectedClient!.name,
      clientAdresse: selectedClient?.address,
      clientSiret: selectedClient?.siret,
      typeFacture: 'Facture libre',
      dateEcheance,
      tauxTVA,
      lignes: lignes.map(l => ({ ...l })),
      notes: notes.trim() || undefined,
      modeReglement,
    };

    onSubmit(data);
    handleReset();
  };

  // Réinitialiser le formulaire
  const handleReset = () => {
    setSelectedClientId('');
    setDateEcheance('');
    setTauxTVA(18);
    setModeReglement('Virement');
    setNotes('');
    setLignes([{
      description: '',
      quantite: 1,
      unite: 'forfait',
      prixUnitaireHT: 0,
      totalHT: 0,
    }]);
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* En-tête */}
          <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-4 flex items-center justify-between border-b border-indigo-700">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold">Créer une Facture Libre</h2>
                <p className="text-xs text-indigo-100 mt-0.5">Facture sans lien BSD</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Section Client */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                Informations Client
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Client *
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">-- Sélectionner un client --</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} {client.siret ? `(${client.siret})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedClient && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm">
                    <div className="font-semibold text-indigo-900">{selectedClient.name}</div>
                    {selectedClient.siret && (
                      <div className="text-indigo-700 text-xs mt-1">SIRET: {selectedClient.siret}</div>
                    )}
                    {selectedClient.address && (
                      <div className="text-indigo-600 text-xs mt-1">{selectedClient.address}</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Section Prestations */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  Prestations
                </h3>
                <button
                  type="button"
                  onClick={addLigne}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter une ligne
                </button>
              </div>

              <div className="space-y-3">
                {lignes.map((ligne, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-gray-200 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Description de la prestation *
                        </label>
                        <input
                          type="text"
                          value={ligne.description}
                          onChange={(e) => {
                            const newLignes = [...lignes];
                            newLignes[index].description = e.target.value;
                            setLignes(newLignes);
                          }}
                          placeholder="Ex: Conseil stratégique, Audit QHSE, Vente d'EPI..."
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                      
                      {lignes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLigne(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-6"
                          title="Supprimer cette ligne"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Quantité *
                        </label>
                        <input
                          type="number"
                          value={ligne.quantite}
                          onChange={(e) => updateLigneTotal(index, parseFloat(e.target.value) || 0, ligne.prixUnitaireHT)}
                          min="0"
                          step="0.01"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Unité
                        </label>
                        <select
                          value={ligne.unite}
                          onChange={(e) => {
                            const newLignes = [...lignes];
                            newLignes[index].unite = e.target.value;
                            setLignes(newLignes);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                        >
                          <option value="forfait">forfait</option>
                          <option value="heure">heure</option>
                          <option value="jour">jour</option>
                          <option value="unité">unité</option>
                          <option value="tonne">tonne</option>
                          <option value="m³">m³</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Prix Unit. HT *
                        </label>
                        <input
                          type="number"
                          value={ligne.prixUnitaireHT}
                          onChange={(e) => updateLigneTotal(index, ligne.quantite, parseFloat(e.target.value) || 0)}
                          min="0"
                          step="1"
                          required
                          placeholder="FCFA"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Total HT
                        </label>
                        <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-bold text-gray-800">
                          {formatCleanAmount(ligne.totalHT, 'FCFA')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section Paramètres */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                Paramètres de Facturation
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Date d'échéance *
                  </label>
                  <input
                    type="date"
                    value={dateEcheance}
                    onChange={(e) => setDateEcheance(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Taux TVA (%)
                  </label>
                  <input
                    type="number"
                    value={tauxTVA}
                    onChange={(e) => setTauxTVA(parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Mode de règlement
                  </label>
                  <select
                    value={modeReglement}
                    onChange={(e) => setModeReglement(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Virement">Virement</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Espèces">Espèces</option>
                    <option value="Carte">Carte</option>
                    <option value="Prélèvement">Prélèvement</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Notes (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Notes ou commentaires sur cette facture..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            {/* Récapitulatif Totaux */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border-2 border-indigo-200">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-indigo-900">Récapitulatif</h3>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">Total HT</span>
                  <span className="font-semibold text-gray-900">{formatCleanAmount(totalHT, 'FCFA')}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">TVA ({tauxTVA}%)</span>
                  <span className="font-semibold text-gray-900">{formatCleanAmount(totalTVA, 'FCFA')}</span>
                </div>
                <div className="h-px bg-indigo-300 my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-indigo-900">Total TTC</span>
                  <span className="text-xl font-bold text-indigo-600">{formatCleanAmount(totalTTC, 'FCFA')}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  handleReset();
                  onClose();
                }}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-colors font-semibold shadow-md"
              >
                Créer la Facture
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
