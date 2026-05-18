// ============= FILE UPLOAD SERVICE =============
// Gère l'upload de fichiers vers Supabase Storage

import { supabase } from "@/shared/services/supabaseClient";

const BUCKET = "chat-files";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export interface StorageFileInfo {
  id?: string;
  name: string;
  path: string;
  bucketId?: string;
  owner?: string;
  updatedAt?: string;
  createdAt?: string;
  lastAccessedAt?: string;
  size?: number;
  mimeType?: string;
  metadata?: Record<string, unknown> | null;
  publicUrl?: string | null;
}

export const fileUploadService = {
  // Upload file to storage
  async uploadFile(
    file: File,
    channelId: string,
    userId: string
  ): Promise<string> {
    try {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("Le fichier est trop volumineux (max 50 MB)");
      }

      const fileName = `${channelId}/${userId}/${Date.now()}-${file.name}`;

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: publicData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(data.path);

      return publicData.publicUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  },

  // Delete file from storage
  async deleteFile(filePath: string): Promise<void> {
    try {
      // Extract path from URL if needed
      const path = filePath.includes("/storage/")
        ? filePath.split("/storage/")[1].replace(`${BUCKET}/`, "")
        : filePath;

      const { error } = await supabase.storage
        .from(BUCKET)
        .remove([path]);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  },

  // Get file metadata (mapped to a stable app shape)
  async getFileInfo(filePath: string): Promise<StorageFileInfo | null> {
    try {
      const path = filePath.includes("/storage/")
        ? filePath.split("/storage/")[1].replace(`${BUCKET}/`, "")
        : filePath;

      const { data, error } = await supabase.storage.from(BUCKET).info(path);
      if (error) throw error;
      if (!data) return null;

      // Normalize fields coming from Supabase Storage (camelized or snake_case)
      const publicRes = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = publicRes?.data?.publicUrl ?? null;

      const mapped: StorageFileInfo = {
        id: (data as any).id ?? (data as any).Key ?? undefined,
        name: (data as any).name ?? path.split('/').pop() ?? path,
        path: (data as any).path ?? path,
        bucketId: (data as any).bucket_id ?? (data as any).bucketId,
        owner: (data as any).owner ?? undefined,
        updatedAt: (data as any).updated_at ?? (data as any).updatedAt,
        createdAt: (data as any).created_at ?? (data as any).createdAt,
        lastAccessedAt: (data as any).last_accessed_at ?? (data as any).lastAccessedAt,
        size: typeof (data as any).size === 'number' ? (data as any).size : (typeof (data as any).file_size === 'number' ? (data as any).file_size : undefined),
        mimeType: (data as any).content_type ?? (data as any).mimeType ?? undefined,
        metadata: (data as any).metadata ?? null,
        publicUrl,
      };

      return mapped;
    } catch (error) {
      console.error("Error getting file info:", error);
      throw error;
    }
  },

  // Download file
  async downloadFile(filePath: string): Promise<Blob> {
    try {
      const path = filePath.includes("/storage/")
        ? filePath.split("/storage/")[1].replace(`${BUCKET}/`, "")
        : filePath;

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .download(path);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error downloading file:", error);
      throw error;
    }
  },

  // Get upload progress
  uploadProgress: 0,

  // Validate file type
  isValidFileType(file: File): boolean {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/zip",
    ];
    return allowedTypes.includes(file.type);
  },
};
