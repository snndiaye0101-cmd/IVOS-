// src/shared/services/documentService.ts
import { supabase } from './supabaseClient'

export async function uploadDocument(file: File, folder: string, userId: string) {
  const filePath = `${folder}/${userId}/${Date.now()}_${file.name}`
  const { data, error } = await supabase.storage.from('documents').upload(filePath, file)
  if (error) throw error
  return data
}

export async function getDocumentUrl(path: string) {
  const { data } = supabase.storage.from('documents').getPublicUrl(path)
  return data?.publicUrl
}

export async function deleteDocument(path: string) {
  const { error } = await supabase.storage.from('documents').remove([path])
  if (error) throw error
}
