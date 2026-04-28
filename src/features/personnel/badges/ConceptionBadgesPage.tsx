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
    setSelectedAgent(agents.find(a => a.id === selectedId) || null);
  }, [selectedId, agents]);

  return (
    <div className="w-full min-h-screen bg-white flex flex-col p-8">
      <h1 className="text-2xl font-bold text-[#1a1a2e] mb-6 flex items-center gap-2">
        <QrCode className="w-7 h-7 text-blue-700" /> Conception de Badges Professionnels
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {/* Colonne de gauche : Sélection */}
        <div className="bg-gray-50 rounded-2xl p-6 shadow flex flex-col gap-4">
          <label className="block text-sm font-medium mb-1">Sélectionner un collaborateur :</label>
          <select
            className="w-full px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm"
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
          >
            <option value="">— Choisir —</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.firstName} {a.lastName} ({a.matricule})</option>
            ))}
          </select>
          {selectedAgent && (
            <div className="flex flex-col gap-2 mt-4">
              <div className="flex items-center gap-3">
                {selectedAgent.photo ? (
                  <img src={selectedAgent.photo} alt="Photo" className="w-16 h-16 rounded-full object-cover border-2 border-blue-600" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-700 border-2 border-blue-600">
                    {selectedAgent.firstName[0]}{selectedAgent.lastName[0]}
                  </div>
                )}
                <div>
                  <div className="font-bold text-lg">{selectedAgent.firstName} {selectedAgent.lastName}</div>
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
            <div className="text-gray-400 italic">Sélectionnez un collaborateur pour prévisualiser le badge…</div>
          )}
        </div>
      </div>
    </div>
  );
}
