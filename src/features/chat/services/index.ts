// ============= CHAT SERVICES BARREL EXPORT =============
// Centralize all chat-related exports for easy importing

// Types
export * from '../types/chat.types';

// Services
export {
  channelsService,
  messagesService,
  presenceService,
  realtimeSubscriptions,
  directMessagesService,
  notificationsService,
} from './chatSupabaseService';

// Hooks
export { useChat } from '../hooks/useChat';
