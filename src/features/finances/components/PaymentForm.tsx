/**
 * PaymentForm
 * Formulaire de saisie de paiement avec 4 modes de règlement
 */

import React, { useState } from 'react';
import { Save, X, DollarSign, CreditCard, Banknote, FileText, AlertCircle } from 'lucide-react';
import { formatCleanAmount } from '../../../shared/utils/formatAmount';
import type { PaymentMethod, PaymentDetails } from '../../finances/services/paymentService';
import { createPayment } from '../../finances/services/paymentService';
import type { WorkflowInvoice } from '../../finances/services/workflowInvoiceService';

interface PaymentFormProps {
  invoice: WorkflowInvoice;
  onClose: () => void;
  onSuccess: () => void;
  currentUserName: string;
}

export default function PaymentForm({
  invoice,
  onClose,
  onSuccess,
  currentUserName,
}: PaymentFormProps) {
  const [method, setMethod] = useState<PaymentMethod>('virement');
  const [montant, setMontant] = useState<string>(invoice.montantHT.toString());
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Champs spécifiques par mode
  const [referenceBancaire, setReferenceBancaire] = useState('');
  const [banqueEmettrice, setBanqueEmettrice] = useState('');
  const [numeroCheque, setNumeroCheque] = useState('');
  const [banqueCheque, setBanqueCheque] = useState('');
  const [nomRemettant, setNomRemettant] = useState('');
  const [autreDetails, setAutreDetails] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    const montantNum = parseFloat(montant);

    if (isNaN(montantNum) || montantNum <= 0) {
      newErrors.montant = 'Montant invalide';
    }

    if (method === 'virement') {
      if (!referenceBancaire.trim()) newErrors.ref = 'Référence bancaire requise';
      if (!banqueEmettrice.trim()) newErrors.banque = 'Banque émettrice requise';
    }

    if (method === 'cheque') {
      if (!numeroCheque.trim()) newErrors.numCheque = 'Numéro de chèque requis';
      if (!banqueCheque.trim()) newErrors.banqueCheque = 'Banque requise';
    }

    if (method === 'especes') {
      if (!nomRemettant.trim()) newErrors.remettant = 'Nom du remettant requis';
    }

    if (method === 'autre') {
      if (!autreDetails.trim()) newErrors.autre = 'Détails requis';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Construire les détails
    const details: PaymentDetails = {};

    switch (method) {
      case 'virement':
        details.referenceBancaire = referenceBancaire;
        details.banqueEmettrice = banqueEmettrice;
        break;
      case 'cheque':
        details.numeroCheque = numeroCheque;
        details.banqueCheque = banqueCheque;
        break;
      case 'especes':
        details.nomRemettant = nomRemettant;
        break;
      case 'autre':
        details.autreDetails = autreDetails;
        break;
    }

    // Créer le paiement
    createPayment(
      invoice.id,
      invoice.numeroOfficiel,
      invoice.clientNom,
      montantNum,
      method,
      details,
      currentUserName,
      notes || undefined
    );

    onSuccess();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between border-b border-green-700 bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-6 w-6 text-white" />
              <div>
                <h2 className="text-lg font-bold text-white">Enregistrer un Paiement</h2>
                <p className="text-sm text-green-100">Facture {invoice.numeroOfficiel}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 transition hover:bg-white/10">
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            {/* Info Client */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-semibold text-gray-600">Client:</span>
                  <p className="font-medium text-gray-900">{invoice.clientNom}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-600">Montant Facture:</span>
                  <p className="font-bold text-gray-900">
                    {formatCleanAmount(invoice.montantHT, 'FCFA')}
                  </p>
                </div>
              </div>
            </div>

            {/* Montant */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Montant du Paiement (FCFA)
              </label>
              <input
                type="number"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400"
                min="0"
                step="1"
              />
              {errors.montant && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {errors.montant}
                </p>
              )}
            </div>

            {/* Mode de Paiement */}
            <div>
              <label className="mb-3 block text-sm font-semibold text-gray-700">
                Mode de Règlement
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'virement', label: 'Virement Bancaire', icon: CreditCard },
                  { value: 'cheque', label: 'Chèque', icon: FileText },
                  { value: 'especes', label: 'Espèces', icon: Banknote },
                  { value: 'autre', label: 'Autre', icon: FileText },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMethod(value as PaymentMethod)}
                    className={`rounded-xl border-2 p-4 transition-all ${
                      method === value
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon
                      className={`mx-auto mb-2 h-5 w-5 ${
                        method === value ? 'text-green-600' : 'text-gray-400'
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        method === value ? 'text-green-900' : 'text-gray-600'
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Champs spécifiques */}
            {method === 'virement' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Référence Bancaire
                    </label>
                    <input
                      type="text"
                      value={referenceBancaire}
                      onChange={(e) => setReferenceBancaire(e.target.value)}
                      placeholder="Ex: VIR-2026-12345"
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-400"
                    />
                    {errors.ref && <p className="mt-1 text-xs text-red-600">{errors.ref}</p>}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Banque Émettrice
                    </label>
                    <input
                      type="text"
                      value={banqueEmettrice}
                      onChange={(e) => setBanqueEmettrice(e.target.value)}
                      placeholder="Ex: CBAO, SGBS, etc."
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-400"
                    />
                    {errors.banque && <p className="mt-1 text-xs text-red-600">{errors.banque}</p>}
                  </div>
                </div>
              </>
            )}

            {method === 'cheque' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Numéro du Chèque
                    </label>
                    <input
                      type="text"
                      value={numeroCheque}
                      onChange={(e) => setNumeroCheque(e.target.value)}
                      placeholder="Ex: 1234567"
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-400"
                    />
                    {errors.numCheque && (
                      <p className="mt-1 text-xs text-red-600">{errors.numCheque}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Banque</label>
                    <input
                      type="text"
                      value={banqueCheque}
                      onChange={(e) => setBanqueCheque(e.target.value)}
                      placeholder="Ex: CBAO"
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-400"
                    />
                    {errors.banqueCheque && (
                      <p className="mt-1 text-xs text-red-600">{errors.banqueCheque}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {method === 'especes' && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Nom de la Personne Ayant Remis les Fonds
                  </label>
                  <input
                    type="text"
                    value={nomRemettant}
                    onChange={(e) => setNomRemettant(e.target.value)}
                    placeholder="Ex: Jean Dupont"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-400"
                  />
                  {errors.remettant && (
                    <p className="mt-1 text-xs text-red-600">{errors.remettant}</p>
                  )}
                </div>
              </>
            )}

            {method === 'autre' && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Détails du Mode de Règlement
                  </label>
                  <textarea
                    value={autreDetails}
                    onChange={(e) => setAutreDetails(e.target.value)}
                    placeholder="Précisez le mode de règlement utilisé..."
                    rows={3}
                    className="w-full resize-none rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-400"
                  />
                  {errors.autre && <p className="mt-1 text-xs text-red-600">{errors.autre}</p>}
                </div>
              </>
            )}

            {/* Notes */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Notes (optionnel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informations complémentaires..."
                rows={2}
                className="w-full resize-none rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-gray-300 px-6 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 font-semibold text-white transition hover:bg-green-700"
              >
                <Save className="h-4 w-4" />
                Enregistrer le Paiement
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
