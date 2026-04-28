// Service d’archivage et de reset annuel pour un site/année

export async function archiveYear(siteCode: string, year: number): Promise<void> {
  // TODO: Remplacer par appel API ou logique réelle
  // Exemple: await api.post(`/archive`, { siteCode, year })
  await new Promise(res => setTimeout(res, 1200));
  // Simule succès
}

export async function resetYear(siteCode: string, year: number): Promise<void> {
  // TODO: Remplacer par appel API ou logique réelle
  // Exemple: await api.post(`/reset`, { siteCode, year })
  await new Promise(res => setTimeout(res, 1200));
  // Simule succès
}
