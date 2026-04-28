// Ce service gère la notification utilisateur (toast, alertes, push) et l’intégration Sentry pour le monitoring des erreurs.
// src/shared/services/notificationService.ts
import axios from 'axios'

const N8N_BASE_URL = import.meta.env.VITE_N8N_WEBHOOK_BASE_URL
const NOTIF_WEBHOOK = import.meta.env.VITE_N8N_NOTIFICATION_WEBHOOK

export type NotificationPayload = {
  userId: string
  type: 'operation_assigned' | 'operation_completed' | 'document_expiring' | 'waste_form_signed' | 'maintenance_due' | 'other'
  title: string
  message: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, any>
}

export async function sendNotification(payload: NotificationPayload) {
  if (!N8N_BASE_URL || !NOTIF_WEBHOOK) throw new Error('Webhook notification non configuré')
  const url = `${N8N_BASE_URL}${NOTIF_WEBHOOK}`
  return axios.post(url, payload)
}
