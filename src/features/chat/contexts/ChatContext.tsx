// ============= CHAT CONTEXT =============
// Provides chat state globally to all components

import React, { createContext, useContext, ReactNode } from 'react';
import { useChat } from '../services';
import { useAuth } from '@/shared/contexts/AuthContext';
import type { Channel, ChatMessage as ChatMsg, ChatUser } from '../types/chat.types';

interface ChatContextType {
  userId: string;
  userName: string;
  channels: Channel[];
  currentChannel: Channel | null;
  messages: ChatMsg[];
  members: ChatUser[];
  onlineUsers: ChatUser[];
  loading: boolean;
  error: string | null;
  setCurrentChannel: (channel: Channel) => void;
  createChannel: (input: {
    name: string;
    type: 'public' | 'private' | 'direct';
    members?: string[];
  }) => Promise<Channel>;
  deleteChannel: (id: string) => Promise<void>;
  sendMessage: (input: { channel_id: string; content: string }) => Promise<ChatMsg>;
  editMessage: (id: string, content: string) => Promise<ChatMsg>;
  deleteMessage: (id: string) => Promise<void>;
  addMember: (channelId: string, memberId: string) => Promise<void>;
  removeMember: (channelId: string, memberId: string) => Promise<void>;
  openDirectMessage: (otherUserId: string) => Promise<Channel>;
  setUserPresence: (status: 'online' | 'offline' | 'away' | 'do_not_disturb') => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const authContext = useAuth();
  const userId = authContext?.user?.id || '';
  const userName = authContext?.user?.fullName || 'Anonymous';

  const chatHook = useChat({ userId, userName });

  const value: ChatContextType = {
    userId,
    userName,
    ...chatHook,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useAppChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useAppChat must be used within ChatProvider');
  }
  return context;
}
