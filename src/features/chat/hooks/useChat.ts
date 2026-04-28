// ============= CUSTOM HOOK: useChat =============
// Simplifie la gestion du chat dans les composants React

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Channel,
  ChatMessage,
  ChatUser,
  CreateChannelInput,
  SendMessageInput,
} from "../types/chat.types";
import {
  channelsService,
  messagesService,
  presenceService,
  realtimeSubscriptions,
  directMessagesService,
  notificationsService,
} from "../services/chatSupabaseService";

interface UseChatOptions {
  userId: string;
  userName: string;
}

export function useChat({ userId, userName }: UseChatOptions) {
  // State
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<ChatUser[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for subscriptions
  const unsubscribeMessagesRef = useRef<(() => void) | null>(null);
  const unsubscribeChannelRef = useRef<(() => void) | null>(null);
  const unsubscribeMembersRef = useRef<(() => void) | null>(null);

  // ============= INITIALIZATION =============
  useEffect(() => {
    const initChat = async () => {
      try {
        setLoading(true);
        // Fetch user channels
        const userChannels = await channelsService.getUserChannels(userId);
        setChannels(userChannels);

        // Set first channel as current
        if (userChannels.length > 0) {
          setCurrentChannel(userChannels[0]);
        }

        // Update user presence
        await presenceService.updateUserPresence(userId, "online");

        // Fetch unread counts
        const counts = await notificationsService.getUnreadCount(userId);
        setUnreadCounts(counts);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur lors de l'initialisation du chat";
        setError(message);
        console.error("Chat initialization error:", err);
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [userId]);

  // ============= LOAD MESSAGES & MEMBERS =============
  useEffect(() => {
    if (!currentChannel) return;

    const loadChannelData = async () => {
      try {
        setLoading(true);

        // Load messages
        const channelMessages = await messagesService.getChannelMessages(
          currentChannel.id,
          100
        );
        setMessages(channelMessages);

        // Load members
        const channelMembers = await channelsService.getChannelMembers(
          currentChannel.id
        );
        setMembers(channelMembers);

        // Load online users
        const online = await presenceService.getOnlineChannelUsers(
          currentChannel.id
        );
        setOnlineUsers(online);

        // Mark as read
        await messagesService.markAsRead(currentChannel.id, userId);

        // Reset unread count
        setUnreadCounts((prev) => ({
          ...prev,
          [currentChannel.id]: 0,
        }));
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erreur lors du chargement du canal";
        setError(message);
        console.error("Channel data loading error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadChannelData();
  }, [currentChannel, userId]);

  // ============= REAL-TIME SUBSCRIPTIONS =============
  useEffect(() => {
    if (!currentChannel) return;

    // Subscribe to new messages
    unsubscribeMessagesRef.current = realtimeSubscriptions.subscribeToChannelMessages(
      currentChannel.id,
      (newMessage) => {
        setMessages((prev) => [...prev, newMessage]);
      }
    );

    // Subscribe to channel updates
    unsubscribeChannelRef.current = realtimeSubscriptions.subscribeToChannelUpdates(
      currentChannel.id,
      (updatedChannel) => {
        setCurrentChannel(updatedChannel);
      }
    );

    // Subscribe to member changes
    unsubscribeMembersRef.current =
      realtimeSubscriptions.subscribeToChannelMembers(currentChannel.id, () => {
        // Refetch members when changes occur
        channelsService
          .getChannelMembers(currentChannel.id)
          .then(setMembers)
          .catch(console.error);
      });

    // Cleanup
    return () => {
      unsubscribeMessagesRef.current?.();
      unsubscribeChannelRef.current?.();
      unsubscribeMembersRef.current?.();
    };
  }, [currentChannel?.id]);

  // ============= CLEANUP ON UNMOUNT =============
  useEffect(() => {
    return () => {
      // Mark user as offline
      presenceService
        .updateUserPresence(userId, "offline")
        .catch(console.error);

      // Unsubscribe from all
      unsubscribeMessagesRef.current?.();
      unsubscribeChannelRef.current?.();
      unsubscribeMembersRef.current?.();
    };
  }, [userId]);

  // ============= HANDLER FUNCTIONS =============

  const loadChannels = useCallback(async () => {
    try {
      setLoading(true);
      const userChannels = await channelsService.getUserChannels(userId);
      setChannels(userChannels);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur lors du chargement des canaux";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createChannel = useCallback(
    async (input: CreateChannelInput) => {
      try {
        setLoading(true);
        const newChannel = await channelsService.createChannel(input, userId);
        setChannels((prev) => [...prev, newChannel]);
        setCurrentChannel(newChannel);
        return newChannel;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erreur lors de la création du canal";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  const updateChannel = useCallback(
    async (channelId: string, updates: any) => {
      try {
        const updated = await channelsService.updateChannel(channelId, updates);
        setChannels((prev) =>
          prev.map((c) => (c.id === channelId ? updated : c))
        );
        if (currentChannel?.id === channelId) {
          setCurrentChannel(updated);
        }
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur lors de la mise à jour";
        setError(message);
        throw err;
      }
    },
    [currentChannel?.id]
  );

  const deleteChannel = useCallback(async (channelId: string) => {
    try {
      await channelsService.deleteChannel(channelId);
      setChannels((prev) => prev.filter((c) => c.id !== channelId));
      if (currentChannel?.id === channelId) {
        setCurrentChannel(null);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de la suppression";
      setError(message);
      throw err;
    }
  }, [currentChannel?.id]);

  const sendMessage = useCallback(
    async (input: SendMessageInput) => {
      try {
        const newMessage = await messagesService.sendMessage(
          input,
          userId,
          userName
        );
        setMessages((prev) => [...prev, newMessage]);
        return newMessage;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erreur lors de l'envoi du message";
        setError(message);
        throw err;
      }
    },
    [userId, userName]
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      try {
        const updated = await messagesService.editMessage(
          messageId,
          content,
          userId
        );
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? updated : m))
        );
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur lors de la modification";
        setError(message);
        throw err;
      }
    },
    [userId]
  );

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await messagesService.deleteMessage(messageId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, is_deleted: true } : m
        )
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de la suppression";
      setError(message);
      throw err;
    }
  }, []);

  const addMember = useCallback(
    async (channelId: string, memberId: string) => {
      try {
        await channelsService.addMemberToChannel(channelId, memberId);
        // Refetch members
        const updated = await channelsService.getChannelMembers(channelId);
        setMembers(updated);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erreur lors de l'ajout du membre";
        setError(message);
        throw err;
      }
    },
    []
  );

  const removeMember = useCallback(
    async (channelId: string, memberId: string) => {
      try {
        await channelsService.removeMemberFromChannel(channelId, memberId);
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erreur lors de la suppression du membre";
        setError(message);
        throw err;
      }
    },
    []
  );

  const openDirectMessage = useCallback(
    async (otherUserId: string) => {
      try {
        const dmChannel = await directMessagesService.getOrCreateDMChannel(
          userId,
          otherUserId
        );
        setCurrentChannel(dmChannel);

        // Add to channels list if not there
        setChannels((prev) => {
          const exists = prev.find((c) => c.id === dmChannel.id);
          return exists ? prev : [...prev, dmChannel];
        });

        return dmChannel;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erreur lors de l'ouverture du message direct";
        setError(message);
        throw err;
      }
    },
    [userId]
  );

  const setUserPresence = useCallback(
    async (status: "online" | "away" | "offline" | "do_not_disturb") => {
      try {
        await presenceService.updateUserPresence(userId, status);
      } catch (err) {
        console.error("Error updating presence:", err);
      }
    },
    [userId]
  );

  return {
    // State
    channels,
    currentChannel,
    messages,
    members,
    onlineUsers,
    unreadCounts,
    loading,
    error,

    // Actions
    setCurrentChannel,
    loadChannels,
    createChannel,
    updateChannel,
    deleteChannel,
    sendMessage,
    editMessage,
    deleteMessage,
    addMember,
    removeMember,
    openDirectMessage,
    setUserPresence,
  };
}
