// Ce hook permet de récupérer la liste des véhicules pour une filiale donnée via React Query et le service vehicleService.
// Usage : const { data, isLoading } = useVehicles(subsidiaryId)

import { useQuery } from '@tanstack/react-query';
import { vehicleService } from '../services/vehicleService';

export const useVehicles = (subsidiaryId: string) => {
  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', subsidiaryId],
    queryFn: () => vehicleService.getVehicles(subsidiaryId),
  });

  return { data, isLoading };
};

// Mobile/offline : Vérifier la gestion du cache, la synchronisation différée et la robustesse offline dans les hooks de données.