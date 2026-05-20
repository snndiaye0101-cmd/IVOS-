import { ChatMessage } from '../types/chat.types';
import { notifyRoomMessage } from './realtimeService';

// Placeholder: In-memory chat messages (to be replaced by real-time backend)

// Messages par salon (room)
const roomMessages: Record<string, ChatMessage[]> = {
  general: [
    {
      id: '1',
      channel_id: 'general',
      user_id: 'admin',
      user_name: 'Admin',
      content: 'Bienvenue sur le salon general !',
      type: 'text' as const,
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      is_deleted: false,
    },
    {
      id: '2',
      channel_id: 'general',
      user_id: 'demo1',
      user_name: 'Alice',
      content: 'Bonjour a tous, comment allez-vous ?',
      type: 'text' as const,
      created_at: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
      is_deleted: false,
    },
    {
      id: '3',
      channel_id: 'general',
      user_id: 'demo2',
      user_name: 'Bob',
      content: 'Tres bien, merci ! Pret pour la reunion de 10h.',
      type: 'text' as const,
      created_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
      is_deleted: false,
    },
  ],
  dev: [
    {
      id: '4',
      channel_id: 'dev',
      user_id: 'demo2',
      user_name: 'Bob',
      content: "Quelqu'un a teste la nouvelle API ?",
      type: 'text' as const,
      created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      is_deleted: false,
    },
    {
      id: '5',
      channel_id: 'dev',
      user_id: 'demo1',
      user_name: 'Alice',
      content: 'Oui, ca fonctionne bien !',
      type: 'text' as const,
      created_at: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
      is_deleted: false,
    },
  ],
  random: [
    {
      id: '6',
      channel_id: 'random',
      user_id: 'admin',
      user_name: 'Admin',
      content: 'Pause cafe ?',
      type: 'text' as const,
      created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      is_deleted: false,
    },
  ],
};

// Si roomId commence par 'dm:', c'est un DM entre deux utilisateurs (ex: 'dm:user1-user2')
export function getMessages(roomOrDmId: string = 'general'): Promise<ChatMessage[]> {
  return Promise.resolve(roomMessages[roomOrDmId] || []);
}

export function sendMessage(message: ChatMessage, roomOrDmId: string = 'general'): Promise<void> {
  if (!roomMessages[roomOrDmId]) roomMessages[roomOrDmId] = [];
  roomMessages[roomOrDmId].push(message);
  notifyRoomMessage(roomOrDmId);
  return Promise.resolve();
}
