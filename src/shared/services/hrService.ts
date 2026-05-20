// src/shared/services/hrService.ts
export type LeaveRequest = {
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
};

export function requestLeave(req: LeaveRequest) {
  // TODO: Envoyer la demande à l’API ou stocker dans la base
  console.log('[RH] Demande de congé', req);
}

export function approveLeave(requestId: string) {
  // TODO: Valider la demande côté backend
  console.log('[RH] Congé approuvé', requestId);
}

export function rejectLeave(requestId: string) {
  // TODO: Rejeter la demande côté backend
  console.log('[RH] Congé rejeté', requestId);
}
