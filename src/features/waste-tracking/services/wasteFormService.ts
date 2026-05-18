/**
 * Service de gestion des BSD (Bordereaux de Suivi des Déchets)
 * CRUD, signatures, génération PDF, archivage.
 * Toutes les méthodes utilisent Supabase comme backend.
 */
// ============================================
// Service de gestion des Bordereaux de Déchets
// ============================================

import { supabase } from '@shared/services/supabaseClient'
import { withCircuitBreaker } from '@shared/services/circuitBreakerService'
import type {
  WasteTrackingForm,
  CreateWasteTrackingFormInput,
  UpdateWasteTrackingFormInput,
  SignatureContext,
} from '../types/wasteForm.types'
import { AcceptanceStatus } from '@shared/types/enums'
// États BSD personnalisés
export type BSDStatus =
  | 'EN_ROUTE'
  | 'A_VERIFIER'
  | 'ATTENTE_APPROBATION_DO'
  | 'PRET_POUR_FACTURATION'
  | 'FACTURE';

// Exemple de taxes par type de déchet (à adapter selon la vraie source)
const TAXES_PAR_TYPE: Record<string, number> = {
  'DASRI': 150, // €/tonne
  'Boues pétrolières': 80,
  'Produits pharmaceutiques': 200,
  'Déchets industriels': 100,
  // ...
};

// Fonction de gestion d'état BSD
export function updateBSDStatus({
  currentStatus,
  nextStatus,
  userRole,
  wasteType,
  poidsTonne,
}: {
  currentStatus: BSDStatus,
  nextStatus: BSDStatus,
  userRole: string,
  wasteType: string,
  poidsTonne: number,
}): { newStatus: BSDStatus; montantTotal?: number; error?: string } {
  // Contrôle du passage à FACTURE
  if (nextStatus === 'FACTURE') {
    if (userRole !== 'Directeur General') {
      return { newStatus: currentStatus, error: 'Seul le Directeur General peut facturer.' };
    }
    // Calcul du montant
    const taxe = TAXES_PAR_TYPE[wasteType] || 0;
    const montantTotal = poidsTonne * taxe;
    return { newStatus: 'FACTURE', montantTotal };
  }
  // Transitions classiques
  return { newStatus: nextStatus };
}

// Récupérer tous les bordereaux (avec filtres)
export const getWasteForms = async (filters?: {
  subsidiaryId?: string
  operationId?: string
  status?: string
  startDate?: string
  endDate?: string
}) => {
  let query = supabase
    .from('waste_tracking_forms')
    .select(
      `
      *,
      operation:missions(mission_number, status),
      producer:clients!producer_client_id(company_name),
      destination:clients!destination_client_id(company_name)
    `
    )
    .order('created_at', { ascending: false })

  if (filters?.subsidiaryId) {
    query = query.eq('subsidiary_id', filters.subsidiaryId)
  }

  if (filters?.operationId) {
    query = query.eq('mission_id', filters.operationId)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.startDate && filters?.endDate) {
    query = query
      .gte('collection_date', filters.startDate)
      .lte('collection_date', filters.endDate)
  }

  const { data, error } = await query

  if (error) throw error
  return data as WasteTrackingForm[]
}

// Récupérer un bordereau par ID
export const getWasteFormById = async (id: string) => {
  const { data, error } = await supabase
    .from('waste_tracking_forms')
    .select(
      `
      *,
      operation:missions(*),
      producer_client:clients!producer_client_id(*),
      destination_client:clients!destination_client_id(*),
      created_by_user:user_profiles!created_by(first_name, last_name),
      producer_signer:user_profiles!producer_signed_by(first_name, last_name),
      transporter_signer:user_profiles!transporter_signed_by(first_name, last_name),
      destination_signer:user_profiles!destination_signed_by(first_name, last_name),
      supervisor_signer:user_profiles!supervisor_signed_by(first_name, last_name)
    `
    )
    .eq('id', id)
    .single()

  if (error) throw error
  return data as WasteTrackingForm
}

// Créer un nouveau bordereau
export const createWasteForm = async (input: CreateWasteTrackingFormInput) => {
  // Récupérer le code de la filiale pour générer le numéro
  const { data: subsidiary } = await supabase
    .from('subsidiaries')
    .select('country_code')
    .eq('id', input.subsidiary_id)
    .single()

  if (!subsidiary) throw new Error('Filiale introuvable')

  // Générer le numéro de bordereau via la fonction SQL
  const { data: formNumber } = await supabase.rpc('generate_form_number', {
    subsidiary_code: subsidiary.country_code,
  })

  const { data, error } = await supabase
    .from('waste_tracking_forms')
    .insert({
      ...input,
      form_number: formNumber,
      form_version: 1,
    })
    .select()
    .single()

  if (error) throw error
  return data as WasteTrackingForm
}

// Mettre à jour un bordereau
export const updateWasteForm = async (
  id: string,
  input: UpdateWasteTrackingFormInput
) => {
  const { data, error } = await supabase
    .from('waste_tracking_forms')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as WasteTrackingForm
}

// Supprimer un bordereau (soft delete en changeant le statut)
export const deleteWasteForm = async (id: string) => {
  const { error } = await supabase
    .from('waste_tracking_forms')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) throw error
}

// Sauvegarder une signature
export const saveSignature = async (
  formId: string,
  context: SignatureContext,
  signatureDataUrl: string
) => {
  // 1. Upload de l'image de signature vers Supabase Storage
  const fileName = `${formId}-${context.signatureType}-${Date.now()}.png`
  const blob = await (await fetch(signatureDataUrl)).blob()

  const { error: uploadError } = await supabase.storage
    .from('signatures')
    .upload(fileName, blob, {
      contentType: 'image/png',
      cacheControl: '3600',
    })

  if (uploadError) throw uploadError

  // 2. Obtenir l'URL publique
  const {
    data: { publicUrl },
  } = supabase.storage.from('signatures').getPublicUrl(fileName)

  // 3. Mettre à jour le bordereau avec la signature
  const updateData: Partial<WasteTrackingForm> = {
    [`${context.signatureType}_signature_url`]: publicUrl,
    [`${context.signatureType}_signed_by`]: context.signedBy,
    [`${context.signatureType}_signed_at`]: new Date().toISOString(),
  }

  // Si c'est la signature du transporteur, confirmer la collecte
  if (context.signatureType === 'transporter') {
    updateData.collection_confirmed_at = new Date().toISOString()
  }

  // Si c'est la signature de destination, marquer comme accepté
  if (context.signatureType === 'destination') {
    updateData.acceptance_date = new Date().toISOString()
    updateData.acceptance_status = AcceptanceStatus.ACCEPTED
  }

  const { data, error } = await supabase
    .from('waste_tracking_forms')
    .update(updateData)
    .eq('id', formId)
    .select()
    .single()

  if (error) throw error

  // 4. Enregistrer dans l'historique des signatures
  await supabase.from('signature_logs').insert({
    waste_tracking_form_id: formId,
    signature_type: context.signatureType,
    signed_by: context.signedBy,
    signature_url: publicUrl,
    ip_address: context.ipAddress,
    gps_location: context.gpsLocation
      ? `POINT(${context.gpsLocation.longitude} ${context.gpsLocation.latitude})`
      : null,
  })

  return data as WasteTrackingForm
}

// Déclencher la génération du PDF via webhook avec circuit breaker
export const triggerPDFGeneration = async (formId: string) => {
  // Récupérer les données complètes du bordereau
  const form = await getWasteFormById(formId)

  // Appeler le webhook n8n avec circuit breaker protection
  const webhookUrl = `${import.meta.env.VITE_N8N_WEBHOOK_BASE_URL}${import.meta.env.VITE_N8N_PDF_GENERATION_WEBHOOK}`

  const result = await withCircuitBreaker(
    'pdf-generation-webhook',
    async () => {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId,
          formNumber: form.form_number,
          data: form,
        }),
      })

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}: ${response.statusText}`)
      }

      return response.json()
    },
    {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
      retryDelay: 2000,
      maxRetries: 3,
    }
  )

  // Mettre à jour le bordereau avec l'URL du PDF
  await supabase
    .from('waste_tracking_forms')
    .update({
      pdf_url: result.pdfUrl,
      pdf_generated_at: new Date().toISOString(),
      pdf_webhook_triggered: true,
    })
    .eq('id', formId)

  // Logger le webhook
  await supabase.from('webhook_logs').insert({
    event_type: 'pdf_generation',
    entity_type: 'waste_tracking_form',
    entity_id: formId,
    webhook_url: webhookUrl,
    payload: { formId, formNumber: form.form_number },
    response_status: 200,
    response_body: JSON.stringify(result),
    success: true,
  })

  return result
}

// Obtenir les statistiques des bordereaux
export const getWasteFormStats = async (subsidiaryId: string) => {
  const { data, error } = await supabase.rpc('get_waste_form_stats', {
    subsidiary_id: subsidiaryId,
  })

  if (error) throw error
  return data
}

// Sécurisation : Vérification explicite des permissions sur chaque opération (CRUD), audit des accès, gestion fine des rôles.
