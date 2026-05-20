import React, { useState, useEffect } from 'react';
import { personnelStore, PersonnelAgent } from '../../fleet/services/personnelStore';
import BadgeDesigner from './BadgeDesigner';
import { QrCode } from 'lucide-react';

const LOGO_URL = '/logo.png'; // À ajuster selon le vrai chemin du logo

export default function ConceptionBadgesPage() {
  const [agents, setAgents] = useState<PersonnelAgent[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<PersonnelAgent | null>(null);

  useEffect(() => {
    setAgents(personnelStore.load());
  }, []);

  useEffect(() => {
    setSelectedAgent(agents.find((a) => a.id === selectedId) || null);
  }, [selectedId, agents]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-white p-8">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold text-[#1a1a2e]">
        <QrCode className="h-7 w-7 text-blue-700" /> Conception de Badges Professionnels
      </h1>
      <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-2">
        {/* Colonne de gauche : Sélection */}
        <div className="flex flex-col gap-4 rounded-2xl bg-gray-50 p-6 shadow">
          <label className="mb-1 block text-sm font-medium">Sélectionner un collaborateur :</label>
          <select
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">— Choisir —</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.firstName} {a.lastName} ({a.matricule})
              </option>
            ))}
          </select>
          {selectedAgent && (
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                {selectedAgent.photo ? (
                  <img
                    src={selectedAgent.photo}
                    alt="Photo"
                    className="h-16 w-16 rounded-full border-2 border-blue-600 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-blue-600 bg-blue-100 text-2xl font-bold text-blue-700">
                    {selectedAgent.firstName[0]}
                    {selectedAgent.lastName[0]}
                  </div>
                )}
                <div>
                  <div className="text-lg font-bold">
                    {selectedAgent.firstName} {selectedAgent.lastName}
                  </div>
                  <div className="text-xs text-gray-500">Matricule : {selectedAgent.matricule}</div>
                  <div className="text-xs text-gray-500">Fonction : {selectedAgent.poste}</div>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Colonne de droite : Live Preview */}
        <div className="flex flex-col items-center justify-center">
          {selectedAgent ? (
            <BadgeDesigner agent={selectedAgent} logoUrl={LOGO_URL} />
          ) : (
            <div className="italic text-gray-400">
              Sélectionnez un collaborateur pour prévisualiser le badge…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
