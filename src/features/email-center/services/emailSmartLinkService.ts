import { supabase } from '@shared/services/supabaseClient';
import { vehiclesStore } from '@features/fleet/services/vehiclesStore';
import type { EmailLinkSuggestion, EmailLinkTarget, EmailMessage } from './types';

const LINK_LOCAL_KEY = 'ivos_email_links_v1';

function normalize(value: string): string {
  return value.toUpperCase().replace(/\s+/g, ' ').trim();
}

function loadVehicleTargets(): EmailLinkTarget[] {
  try {
    const vehicles = vehiclesStore.load() as any[];
    return vehicles.slice(0, 400).map<EmailLinkTarget>(vehicle => {
      const registration = String(vehicle.registration || vehicle.immatriculation || vehicle.plateNumber || vehicle.numeroImmatriculation || '').trim();
      const label = registration || String(vehicle.name || 'Vehicule');
      const id = String(vehicle.id || registration || Math.random().toString(36).slice(2));
      return { type: 'vehicle', id, label };
    }).filter(target => target.label.length > 0);
  } catch {
    return [];
  }
}

function loadMissionTargets(): EmailLinkTarget[] {
  try {
    const operations = JSON.parse(localStorage.getItem('ivos_operations_v2') || localStorage.getItem('ivos_operations_v1') || '[]') as Array<Record<string, unknown>>;
    return operations.slice(0, 400).map<EmailLinkTarget>(op => {
      const id = String(op.id || Math.random().toString(36).slice(2));
      const label = String(op.reference || op.name || op.operationName || `Mission ${id}`);
      return { type: 'mission', id, label };
    });
  } catch {
    return [];
  }
}

export const emailSmartLinkService = {
  getAvailableTargets(): EmailLinkTarget[] {
    return [...loadVehicleTargets(), ...loadMissionTargets()];
  },

  suggestTargets(message: EmailMessage): EmailLinkSuggestion[] {
    const haystack = normalize(`${message.subject} ${message.snippet}`);
    const suggestions: EmailLinkSuggestion[] = [];

    for (const target of loadVehicleTargets()) {
      const token = normalize(target.label);
      if (!token) continue;
      if (haystack.includes(token)) {
        suggestions.push({
          target,
          reason: `Plaque detectee dans le sujet (${target.label})`,
          confidence: 0.95,
        });
      }
    }

    for (const target of loadMissionTargets()) {
      const token = normalize(target.label);
      if (!token || token.length < 6) continue;
      if (haystack.includes(token)) {
        suggestions.push({
          target,
          reason: `Reference mission detectee (${target.label})`,
          confidence: 0.78,
        });
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  },

  async linkEmailToTarget(userId: string, message: EmailMessage, target: EmailLinkTarget): Promise<void> {
    const payload = {
      user_id: userId,
      provider_message_id: message.providerMessageId,
      account_id: message.accountId,
      email_subject: message.subject,
      target_type: target.type,
      target_id: target.id,
      target_label: target.label,
      linked_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from('email_links').upsert(payload, {
        onConflict: 'user_id,provider_message_id,target_type,target_id',
      });
      if (error) throw error;
    } catch {
      const current = JSON.parse(localStorage.getItem(LINK_LOCAL_KEY) || '[]') as Array<Record<string, unknown>>;
      current.push(payload);
      localStorage.setItem(LINK_LOCAL_KEY, JSON.stringify(current));
    }
  },
};
