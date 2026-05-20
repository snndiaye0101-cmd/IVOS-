// Ce service gère la gestion des fichiers et documents (upload, téléchargement, métadonnées).

export class StorageService {
  async uploadFile(file: File): Promise<string> {
    return URL.createObjectURL(file);
  }

  async downloadFile(url: string): Promise<string> {
    const res = await fetch(url);
    return res.text();
  }

  async getMetadata(url: string): Promise<Record<string, unknown>> {
    const res = await fetch(url, { method: 'HEAD' });
    const meta: Record<string, unknown> = {};
    res.headers.forEach((value, key) => {
      meta[key] = value;
    });
    return meta;
  }
}

export const storageService = new StorageService();
