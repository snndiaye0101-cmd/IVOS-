// ============= CHAT CONTEXT =============
// Provides chat state globally to all components

import React, { createContext, useContext, ReactNode } from "react";
import { useChat } from "../services";
import { useAuth } from "@/shared/contexts/AuthContext";

export interface ChatChannel {
  id: string;
  name: string;
  type: 'public' | 'private' | 'dm';
  members: string[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  editedAt?: string;
}

export interface ChatMember {
  id: string;
  name: string;
  presence: 'online' | 'offline' | 'away';
}

interface ChatContextType {
  userId: string;
  userName: string;
  channels: ChatChannel[];
  currentChannel: ChatChannel | null;
  messages: ChatMessage[];
  members: ChatMember[];
  onlineUsers: ChatMember[];
  loading: boolean;
  error: string | null;
  setCurrentChannel: (channel: ChatChannel) => void;
  createChannel: (input: { name: string; type: 'public' | 'private' | 'dm'; members?: string[] }) => Promise<ChatChannel>;
  deleteChannel: (id: string) => Promise<void>;
  sendMessage: (input: { channelId: string; content: string }) => Promise<ChatMessage>;
  editMessage: (id: string, content: string) => Promise<ChatMessage>;
  deleteMessage: (id: string) => Promise<void>;
  addMember: (channelId: string, memberId: string) => Promise<void>;
  removeMember: (channelId: string, memberId: string) => Promise<void>;
  openDirectMessage: (otherUserId: string) => Promise<ChatChannel>;
  setUserPresence: (status: 'online' | 'offline' | 'away') => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const authContext = useAuth();
  const userId = authContext?.user?.id || "";
  const userName = authContext?.user?.fullName || "Anonymous";

  const chatHook = useChat({ userId, userName });

  const value: ChatContextType = {
    userId,
    userName,
    ...chatHook,
  };

  return (
    <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
  );
}

export function useAppChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useAppChat must be used within ChatProvider");
  }
  return context;
}
