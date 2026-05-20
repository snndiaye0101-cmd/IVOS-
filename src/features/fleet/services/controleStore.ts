import { useState } from 'react';

export type Releve = {
  id: number;
  vehicule: string;
  position: string;
  pression: string;
  profondeur: string;
  date: string;
};

export function useControleStore() {
  const [releves, setReleves] = useState<Releve[]>([]);

  function addReleve(releve: Omit<Releve, 'id'>) {
    setReleves((prev) => [...prev, { ...releve, id: Date.now() }]);
  }

  return { releves, addReleve };
}
