// ============= CHANNEL TYPES =============
export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: "public" | "private" | "direct";
  members: string[]; // Array of user IDs
  participants?: string[]; // For DMs
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============= MESSAGE TYPES =============
export interface ChatMessage {
  id: string;
  channel_id: string;
  user_id: string;
  user_name: string;
  content: string;
  type: "text" | "image" | "file" | "location";
  file_url?: string;
  file_name?: string;
  created_at: string;
  updated_at: string;
  edited_by?: string;
  edited_at?: string;
  is_deleted: boolean;
}

// ============= USER TYPES =============
export interface ChatUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  online: boolean;
  status: "online" | "away" | "offline" | "do_not_disturb";
  last_seen_at?: string;
  role: "admin" | "chauffeur" | "member";
}

// ============= MEMBER TYPES =============
export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  joined_at: string;
  last_read_at?: string;
  is_muted: boolean;
  is_moderator: boolean;
}

// ============= PRESENCE TYPES =============
export interface UserPresence {
  user_id: string;
  status: "online" | "away" | "offline" | "do_not_disturb";
  last_seen_at: string;
}

// ============= API RESPONSE TYPES =============
export interface CreateChannelInput {
  name: string;
  description?: string;
  type: "public" | "private" | "direct";
  members?: string[];
}

export interface UpdateChannelInput {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface SendMessageInput {
  channel_id: string;
  content: string;
  type?: "text" | "image" | "file" | "location";
  file_url?: string;
  file_name?: string;
}

// ============= OLD TYPES (for backward compatibility) =============
export interface ChatMessage_Legacy {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface ChatUser_Legacy {
  id: string;
  name: string;
}
