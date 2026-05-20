// Service de gestion du personnel IVOS
// Utilise import.meta.env pour l'API

const API_URL = import.meta.env.VITE_PERSONNEL_API_URL || '';

export async function fetchPersonnel() {
  const res = await fetch(`${API_URL}/personnel`);
  if (!res.ok) throw new Error('Erreur lors du chargement du personnel');
  return res.json();
}

export async function addPersonnel(data: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/personnel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erreur lors de l'ajout");
  return res.json();
}
