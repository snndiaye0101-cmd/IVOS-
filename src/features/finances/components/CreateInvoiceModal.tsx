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

export default function CreateInvoiceModal({
  isOpen,
  onClose,
  onSubmit,
  clients,
}: CreateInvoiceModalProps) {
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
    },
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
      },
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
  const selectedClient = clients.find((c) => c.id === selectedClientId);

  // Soumission du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId) {
      alert('Veuillez sélectionner un client');
      return;
    }

    if (lignes.some((l) => !l.description.trim())) {
      alert('Veuillez renseigner toutes les descriptions');
      return;
    }

    if (!dateEcheance) {
      alert("Veuillez définir une date d'échéance");
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
      lignes: lignes.map((l) => ({ ...l })),
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
    setLignes([
      {
        description: '',
        quantite: 1,
        unite: 'forfait',
        prixUnitaireHT: 0,
        totalHT: 0,
      },
    ]);
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="pointer-events-auto max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* En-tête */}
          <div className="sticky top-0 flex items-center justify-between border-b border-indigo-700 bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 text-white">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6" />
              <div>
                <h2 className="text-xl font-bold">Créer une Facture Libre</h2>
                <p className="mt-0.5 text-xs text-indigo-100">Facture sans lien BSD</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            {/* Section Client */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-700">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                  1
                </span>
                Informations Client
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Client *
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Sélectionner un client --</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} {client.siret ? `(${client.siret})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedClient && (
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm">
                    <div className="font-semibold text-indigo-900">{selectedClient.name}</div>
                    {selectedClient.siret && (
                      <div className="mt-1 text-xs text-indigo-700">
                        SIRET: {selectedClient.siret}
                      </div>
                    )}
                    {selectedClient.address && (
                      <div className="mt-1 text-xs text-indigo-600">{selectedClient.address}</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Section Prestations */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                    2
                  </span>
                  Prestations
                </h3>
                <button
                  type="button"
                  onClick={addLigne}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter une ligne
                </button>
              </div>

              <div className="space-y-3">
                {lignes.map((ligne, index) => (
                  <div
                    key={index}
                    className="space-y-2 rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-semibold text-gray-600">
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
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {lignes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLigne(index)}
                          className="mt-6 rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                          title="Supprimer cette ligne"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-600">
                          Quantité *
                        </label>
                        <input
                          type="number"
                          value={ligne.quantite}
                          onChange={(e) =>
                            updateLigneTotal(
                              index,
                              parseFloat(e.target.value) || 0,
                              ligne.prixUnitaireHT
                            )
                          }
                          min="0"
                          step="0.01"
                          required
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-600">
                          Unité
                        </label>
                        <select
                          value={ligne.unite}
                          onChange={(e) => {
                            const newLignes = [...lignes];
                            newLignes[index].unite = e.target.value;
                            setLignes(newLignes);
                          }}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
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
                        <label className="mb-1 block text-xs font-semibold text-gray-600">
                          Prix Unit. HT *
                        </label>
                        <input
                          type="number"
                          value={ligne.prixUnitaireHT}
                          onChange={(e) =>
                            updateLigneTotal(index, ligne.quantite, parseFloat(e.target.value) || 0)
                          }
                          min="0"
                          step="1"
                          required
                          placeholder="FCFA"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-600">
                          Total HT
                        </label>
                        <div className="rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-bold text-gray-800">
                          {formatCleanAmount(ligne.totalHT, 'FCFA')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section Paramètres */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-700">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                  3
                </span>
                Paramètres de Facturation
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Date d'échéance *
                  </label>
                  <input
                    type="date"
                    value={dateEcheance}
                    onChange={(e) => setDateEcheance(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Taux TVA (%)
                  </label>
                  <input
                    type="number"
                    value={tauxTVA}
                    onChange={(e) => setTauxTVA(parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Mode de règlement
                  </label>
                  <select
                    value={modeReglement}
                    onChange={(e) => setModeReglement(e.target.value as PaymentMethod)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-indigo-500"
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
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Notes (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Notes ou commentaires sur cette facture..."
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Récapitulatif Totaux */}
            <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-indigo-900">Récapitulatif</h3>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">Total HT</span>
                  <span className="font-semibold text-gray-900">
                    {formatCleanAmount(totalHT, 'FCFA')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">TVA ({tauxTVA}%)</span>
                  <span className="font-semibold text-gray-900">
                    {formatCleanAmount(totalTVA, 'FCFA')}
                  </span>
                </div>
                <div className="my-2 h-px bg-indigo-300" />
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-indigo-900">Total TTC</span>
                  <span className="text-xl font-bold text-indigo-600">
                    {formatCleanAmount(totalTTC, 'FCFA')}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => {
                  handleReset();
                  onClose();
                }}
                className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 font-semibold text-white shadow-md transition-colors hover:from-indigo-700 hover:to-blue-700"
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
