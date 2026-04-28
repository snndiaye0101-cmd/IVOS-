// ============================================
// Types pour les Bordereaux de Suivi des Déchets
// ============================================

import type {
  WasteState,
  PackagingType,
  AcceptanceStatus,
  OperationStatus,
} from '@shared/types/enums'

// Type principal du Bordereau
export interface WasteTrackingForm {
  id: string
  subsidiary_id: string
  mission_id: string
  form_number: string
  form_version: number

  // Section A: Producteur
  producer_client_id?: string
  producer_name: string
  producer_address: string
  producer_contact_name?: string
  producer_contact_phone?: string
  producer_contact_email?: string
  producer_ninea?: string

  // Section B: Caractérisation du déchet
  waste_description: string
  waste_state: WasteState
  waste_category_code?: string
  waste_category_name?: string
  packaging_type: PackagingType
  packaging_quantity: number
  packaging_description?: string
  estimated_weight_kg?: number
  estimated_volume_m3?: number
  is_hazardous: boolean
  un_number?: string
  danger_class?: string
  hazard_codes?: string[]

  // Section C: Transporteur
  transporter_company_name: string
  transporter_license_number?: string
  transporter_vehicle_registration?: string
  transporter_driver_name?: string
  transporter_driver_license?: string
  collection_date?: string
  collection_confirmed_at?: string
  transporter_signature_url?: string
  transporter_signed_by?: string
  transporter_signed_at?: string

  // Section D: Destination
  destination_client_id?: string
  destination_facility_name: string
  destination_facility_address: string
  destination_facility_license?: string
  reception_date?: string
  actual_weight_kg?: number
  actual_volume_m3?: number
  acceptance_status: AcceptanceStatus
  acceptance_date?: string
  rejection_reason?: string
  rejection_details?: Record<string, unknown>
  destination_signature_url?: string
  destination_signed_by?: string
  destination_signed_at?: string

  // Signatures
  producer_signature_url?: string
  producer_signed_by?: string
  producer_signed_at?: string
  supervisor_signature_url?: string
  supervisor_signed_by?: string
  supervisor_signed_at?: string

  // Statut et workflow
  status: OperationStatus
  pdf_generated_at?: string
  pdf_url?: string
  pdf_webhook_triggered: boolean

  // Métadonnées
  notes?: string
  attachments?: Attachment[]
  metadata?: Record<string, unknown>
  created_by?: string
  created_at: string
  updated_at: string
}

// Type pour les pièces jointes
export interface Attachment {
  id: string
  name: string
  url: string
  type: string
  size: number
  uploaded_at: string
}

// Type pour la création d'un nouveau bordereau
export type CreateWasteTrackingFormInput = Omit<
  WasteTrackingForm,
  'id' | 'form_number' | 'form_version' | 'created_at' | 'updated_at'
>

// Type pour la mise à jour d'un bordereau
export type UpdateWasteTrackingFormInput = Partial<
  Omit<WasteTrackingForm, 'id' | 'form_number' | 'created_at'>
>

// Type pour les données du formulaire (React Hook Form)
export interface WasteFormData {
  // Section A
  producer_name: string
  producer_address: string
  producer_contact_name: string
  producer_contact_phone: string
  producer_contact_email: string
  producer_ninea: string

  // Section B
  waste_description: string
  waste_state: WasteState
  waste_category_code: string
  packaging_type: PackagingType
  packaging_quantity: number
  estimated_weight_kg: number
  is_hazardous: boolean
  un_number?: string

  // Section C
  transporter_company_name: string
  transporter_vehicle_registration: string
  transporter_driver_name: string
  collection_date: Date

  // Section D
  destination_facility_name: string
  destination_facility_address: string
  destination_facility_license: string
}

// Type pour les étapes du wizard
export enum WasteFormStep {
  PRODUCER = 0,
  WASTE_CHARACTERIZATION = 1,
  TRANSPORTER = 2,
  DESTINATION = 3,
  SIGNATURES = 4,
  REVIEW = 5,
}

// Type pour le contexte de signature
export interface SignatureContext {
  formId: string
  signatureType: 'producer' | 'transporter' | 'destination' | 'supervisor'
  signedBy: string
  ipAddress?: string
  gpsLocation?: {
    latitude: number
    longitude: number
  }
}
