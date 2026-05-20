// ============= CHAT SUPABASE SERVICE =============
// Gestion complète du chat avec Supabase
// Includes: Channels, Messages, Presence, Real-time subscriptions

import { supabase } from '@/shared/services/supabaseClient';
import {
  Channel,
  ChatMessage,
  ChatUser,
  ChannelMember,
  UserPresence,
  CreateChannelInput,
  UpdateChannelInput,
  SendMessageInput,
} from '../types/chat.types';

// ============= CHANNELS SERVICE =============
export const channelsService = {
  // Get all channels for current user
  async getUserChannels(userId: string): Promise<Channel[]> {
    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .or(`created_by.eq.${userId},members.cs.{"${userId}"}`)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user channels:', error);
      throw error;
    }
  },

  // Get channel by ID
  async getChannel(channelId: string): Promise<Channel> {
    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('id', channelId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching channel:', error);
      throw error;
    }
  },

  // Create new channel
  async createChannel(input: CreateChannelInput, userId: string): Promise<Channel> {
    try {
      const newChannel = {
        name: input.name,
        description: input.description,
        type: input.type,
        members: input.members || [userId],
        created_by: userId,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('chat_channels')
        .insert([newChannel])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating channel:', error);
      throw error;
    }
  },

  // Update channel
  async updateChannel(channelId: string, input: UpdateChannelInput): Promise<Channel> {
    try {
      const updateData = {
        ...input,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('chat_channels')
        .update(updateData)
        .eq('id', channelId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating channel:', error);
      throw error;
    }
  },

  // Delete channel
  async deleteChannel(channelId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_channels')
        .update({ is_active: false })
        .eq('id', channelId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting channel:', error);
      throw error;
    }
  },

  // Add member to channel
  async addMemberToChannel(channelId: string, userId: string): Promise<void> {
    try {
      // First, get current members
      const channel = await this.getChannel(channelId);
      const updatedMembers = Array.from(new Set([...channel.members, userId]));

      // Update channel
      await supabase
        .from('chat_channels')
        .update({
          members: updatedMembers,
          updated_at: new Date().toISOString(),
        })
        .eq('id', channelId);

      // Add channel member record
      await supabase.from('chat_channel_members').insert([
        {
          channel_id: channelId,
          user_id: userId,
          joined_at: new Date().toISOString(),
          is_muted: false,
          is_moderator: false,
        },
      ]);
    } catch (error) {
      console.error('Error adding member to channel:', error);
      throw error;
    }
  },

  // Remove member from channel
  async removeMemberFromChannel(channelId: string, userId: string): Promise<void> {
    try {
      // Get current members
      const channel = await this.getChannel(channelId);
      const updatedMembers = channel.members.filter((id) => id !== userId);

      // Update channel
      await supabase
        .from('chat_channels')
        .update({
          members: updatedMembers,
          updated_at: new Date().toISOString(),
        })
        .eq('id', channelId);

      // Delete channel member record
      await supabase
        .from('chat_channel_members')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error removing member from channel:', error);
      throw error;
    }
  },

  // Get channel members
  async getChannelMembers(channelId: string): Promise<ChatUser[]> {
    try {
      const { data, error } = await supabase
        .from('chat_channel_members')
        .select('user_id')
        .eq('channel_id', channelId);

      if (error) throw error;

      const userIds = data?.map((m) => m.user_id) || [];
      if (userIds.length === 0) return [];

      // Fetch user details
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', userIds);

      if (usersError) throw usersError;

      return (users || []).map((u) => ({
        id: u.id,
        name: `${u.first_name} ${u.last_name}`,
        email: '', // Would need to fetch from auth.users
        avatar_url: u.avatar_url,
        online: false, // Would need presence tracking
        status: 'offline' as const,
        role: 'member' as const,
      }));
    } catch (error) {
      console.error('Error fetching channel members:', error);
      throw error;
    }
  },
};

// ============= MESSAGES SERVICE =============
export const messagesService = {
  // Get messages for channel
  async getChannelMessages(channelId: string, limit = 50, offset = 0): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return (data || []).reverse(); // Return in ascending order
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  },

  // Send message
  async sendMessage(
    input: SendMessageInput,
    userId: string,
    userName: string
  ): Promise<ChatMessage> {
    try {
      const newMessage = {
        channel_id: input.channel_id,
        user_id: userId,
        user_name: userName,
        content: input.content,
        type: input.type || 'text',
        file_url: input.file_url,
        file_name: input.file_name,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('chat_messages')
        .insert([newMessage])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Edit message
  async editMessage(messageId: string, content: string, userId: string): Promise<ChatMessage> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .update({
          content,
          edited_by: userId,
          edited_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  },

  // Delete message (soft delete)
  async deleteMessage(messageId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  },

  // Mark messages as read
  async markAsRead(channelId: string, userId: string): Promise<void> {
    try {
      await supabase
        .from('chat_channel_members')
        .update({
          last_read_at: new Date().toISOString(),
        })
        .eq('channel_id', channelId)
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  },
};

// ============= PRESENCE SERVICE =============
export const presenceService = {
  // Get user presence status
  async getUserPresence(userId: string): Promise<UserPresence> {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return (
        data || {
          user_id: userId,
          status: 'offline',
          last_seen_at: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error('Error fetching user presence:', error);
      throw error;
    }
  },

  // Update user presence status
  async updateUserPresence(
    userId: string,
    status: 'online' | 'away' | 'offline' | 'do_not_disturb'
  ): Promise<UserPresence> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('user_presence')
        .upsert(
          {
            user_id: userId,
            status,
            last_seen_at: now,
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user presence:', error);
      throw error;
    }
  },

  // Get online users in channel
  async getOnlineChannelUsers(channelId: string): Promise<ChatUser[]> {
    try {
      // Get channel members
      const { data: members, error: membersError } = await supabase
        .from('chat_channel_members')
        .select('user_id')
        .eq('channel_id', channelId);

      if (membersError) throw membersError;

      const memberIds = members?.map((m) => m.user_id) || [];
      if (memberIds.length === 0) return [];

      // Get presence for these members
      const { data: presences, error: presencesError } = await supabase
        .from('user_presence')
        .select('*')
        .in('user_id', memberIds)
        .eq('status', 'online');

      if (presencesError) throw presencesError;

      const onlineUserIds = presences?.map((p) => p.user_id) || [];

      // Fetch user details
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', onlineUserIds);

      if (usersError) throw usersError;

      return (users || []).map((u) => ({
        id: u.id,
        name: `${u.first_name} ${u.last_name}`,
        email: '',
        avatar_url: u.avatar_url,
        online: true,
        status: 'online' as const,
        role: 'member' as const,
      }));
    } catch (error) {
      console.error('Error fetching online users:', error);
      throw error;
    }
  },
};

// ============= REAL-TIME SUBSCRIPTIONS =============
export const realtimeSubscriptions = {
  // Subscribe to channel messages
  subscribeToChannelMessages(channelId: string, callback: (message: ChatMessage) => void) {
    const subscription = supabase
      .channel(`channel-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          callback(payload.new as ChatMessage);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },

  // Subscribe to channel updates
  subscribeToChannelUpdates(channelId: string, callback: (channel: Channel) => void) {
    const subscription = supabase
      .channel(`channel-updates-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_channels',
          filter: `id=eq.${channelId}`,
        },
        (payload) => {
          callback(payload.new as Channel);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },

  // Subscribe to user presence changes
  subscribeToUserPresence(userId: string, callback: (presence: UserPresence) => void) {
    const subscription = supabase
      .channel(`user-presence-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new as UserPresence);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },

  // Subscribe to channel members changes
  subscribeToChannelMembers(channelId: string, callback: (member: ChannelMember) => void) {
    const subscription = supabase
      .channel(`channel-members-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_channel_members',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          callback(payload.new as ChannelMember);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },
};

// ============= DIRECT MESSAGES SERVICE =============
export const directMessagesService = {
  // Get or create DM channel between two users
  async getOrCreateDMChannel(userId1: string, userId2: string): Promise<Channel> {
    try {
      const sortedIds = [userId1, userId2].sort();
      const dmId = `dm-${sortedIds.join('-')}`;

      // Try to find existing DM
      const { data: existing, error: searchError } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('id', dmId)
        .single();

      if (searchError && searchError.code !== 'PGRST116') throw searchError;

      if (existing) {
        return existing;
      }

      // Create new DM channel
      const newDM = {
        id: dmId,
        name: `Direct Message - ${sortedIds[0].substring(0, 8)}`,
        type: 'direct' as const,
        members: [userId1, userId2],
        participants: [userId1, userId2],
        created_by: userId1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('chat_channels')
        .insert([newDM])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting/creating DM channel:', error);
      throw error;
    }
  },

  // Delete DM channel
  async deleteDMChannel(channelId: string): Promise<void> {
    try {
      await supabase.from('chat_channels').delete().eq('id', channelId).eq('type', 'direct');
    } catch (error) {
      console.error('Error deleting DM channel:', error);
      throw error;
    }
  },
};

// ============= NOTIFICATIONS SERVICE =============
export const notificationsService = {
  // Get unread message count for user
  async getUnreadCount(userId: string): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from('chat_channel_members')
        .select('channel_id, last_read_at')
        .eq('user_id', userId);

      if (error) throw error;

      const unreadCounts: Record<string, number> = {};

      for (const member of data || []) {
        const { count, error: countError } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', member.channel_id)
          .eq('is_deleted', false)
          .gt('created_at', member.last_read_at || '2000-01-01');

        if (countError) throw countError;
        unreadCounts[member.channel_id] = count || 0;
      }

      return unreadCounts;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return {};
    }
  },
};
