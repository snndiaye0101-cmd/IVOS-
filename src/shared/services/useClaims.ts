import { useState, useEffect, useCallback, useMemo } from 'react';
import { claimsStore } from '../../features/fleet/services/claimsStore';
import { personalVehiclesStore } from '../../features/fleet/services/personalVehiclesStore';
import type { Claim } from '../../features/fleet/types/claims.types';
import { toast } from 'sonner';

export function useClaims() {
  const [parcClaims, setParcClaims] = useState<Claim[]>(() => {
    const stored = claimsStore.load();
    return stored.map((c: any) => ({ ...c, source: 'parc' } as Claim));
  });

  const [personnelClaims, setPersonnelClaims] = useState<Claim[]>([]);

  const loadPersonnelClaims = useCallback(() => {
    const pvs = personalVehiclesStore.load();
    const claims: Claim[] = [];
    pvs.forEach((pv: any) => {
      const claimItems = Array.isArray(pv.claims) ? pv.claims : [];
      if (claimItems.length > 0) {
        claimItems.forEach((c: any) => {
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
      setParcClaims(stored.map((c: any) => ({ ...c, source: 'parc' } as Claim)));
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
    const newClaim: Claim = {
      id: Date.now().toString(),
      ...newClaimData,
    };
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