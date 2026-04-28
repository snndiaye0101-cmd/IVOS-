import { useState, useEffect, useCallback, useMemo } from 'react';
import { claimsStore } from '../services/claimsStore';
import { personalVehiclesStore } from '../services/personalVehiclesStore';
import { toast } from 'sonner';
import type { Claim } from '../types/claims.types';

type PersonalVehicleClaimRecord = {
  id: string;
  reportNumber: string;
  date: string;
  type?: Claim['type'];
  severity?: Claim['severity'];
  location?: string;
  status?: Claim['status'];
  costEstimate?: number;
  description?: string;
};

type PersonalVehicleWithClaims = {
  registration: string;
  agentName: string;
  claims?: PersonalVehicleClaimRecord[];
};

export function useClaims() {
  const [parcClaims, setParcClaims] = useState<Claim[]>(() => {
    const stored = claimsStore.load();
    return stored.map(c => ({ ...c, source: 'parc' as const }));
  });

  const [personnelClaims, setPersonnelClaims] = useState<Claim[]>([]);

  const loadPersonnelClaims = useCallback(() => {
    const pvs = personalVehiclesStore.load() as PersonalVehicleWithClaims[];
    const claims: Claim[] = [];
    pvs.forEach((pv) => {
      const claimItems = Array.isArray(pv.claims) ? pv.claims : [];
      if (claimItems.length > 0) {
        claimItems.forEach((c) => {
          claims.push({
            id: c.id,
            reportNumber: c.reportNumber,
            date: c.date,
            vehicle: pv.registration,
            driver: pv.agentName,
            type: (c.type || 'Autre') as Claim['type'],
            severity: (c.severity || 'Mineur') as Claim['severity'],
            location: c.location || '',
            status: (c.status || 'Ouvert') as Claim['status'],
            costEstimate: c.costEstimate || 0,
            description: c.description || '',
            source: 'personnel',
          });
        });
      }
    });
    setPersonnelClaims(claims);
  }, []);

  useEffect(() => {
    loadPersonnelClaims();
    const handlePersonnelUpdate = () => loadPersonnelClaims();
    window.addEventListener('personalVehicles:updated', handlePersonnelUpdate);
    return () => window.removeEventListener('personalVehicles:updated', handlePersonnelUpdate);
  }, [loadPersonnelClaims]);

  useEffect(() => {
    const handleParcUpdate = () => {
      const stored = claimsStore.load();
      setParcClaims(stored.map(c => ({ ...c, source: 'parc' as const })));
    };
    window.addEventListener('claims:updated', handleParcUpdate);
    return () => window.removeEventListener('claims:updated', handleParcUpdate);
  }, []);

  const allClaims = useMemo(() => [...parcClaims, ...personnelClaims], [parcClaims, personnelClaims]);

  const generateReportNumber = useCallback(() => {
    const year = new Date().getFullYear();
    const count = allClaims.length + 1;
    return `SIN-${year}-${count.toString().padStart(4, '0')}`;
  }, [allClaims.length]);

  const createClaim = useCallback((newClaimData: Omit<Claim, 'id'>) => {
    const newClaim: Claim = { id: Date.now().toString(), ...newClaimData };
    if (newClaim.source === 'parc') {
      const updated = [...parcClaims, newClaim];
      setParcClaims(updated);
      claimsStore.save(updated);
      toast.success('Sinistre déclaré avec succès');
    }
  }, [parcClaims]);

  const updateClaim = useCallback((id: string, updatedData: Claim) => {
    if (updatedData.source === 'parc') {
      const updated = parcClaims.map(c => (c.id === id ? updatedData : c));
      setParcClaims(updated);
      claimsStore.save(updated);
      toast.success('Sinistre modifié');
    }
  }, [parcClaims]);

  const deleteClaim = useCallback((id: string) => {
    const updated = parcClaims.filter(c => c.id !== id);
    setParcClaims(updated);
    claimsStore.save(updated);
    toast.success('Sinistre supprimé');
  }, [parcClaims]);

  return { parcClaims, personnelClaims, allClaims, createClaim, updateClaim, deleteClaim, generateReportNumber };
}
