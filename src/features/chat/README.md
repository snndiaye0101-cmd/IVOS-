# 💬 Chat System Documentation

## Architecture Overview

The chat system is built with a modern, scalable architecture featuring:

- **Real-time Messaging** with Supabase PostgreSQL subscriptions
- **Channel Management** (public, private, direct messages)
- **User Presence** tracking (online, away, offline, do_not_disturb)
- **Message Features** (text, images, files, location sharing)
- **Row Level Security (RLS)** for data protection
- **Custom Hook** (`useChat`) for easy component integration

---

## 📁 File Structure

```
src/features/chat/
├── pages/
│   └── Chat.tsx              # Main chat UI component (already refactored)
├── components/
│   ├── ChatHeader.tsx
│   ├── MessageBubble.tsx
│   ├── MessageInput.tsx
│   └── ...
├── hooks/
│   └── useChat.ts            # Custom hook for chat logic
├── services/
│   ├── chatSupabaseService.ts   # Full Supabase integration
│   ├── realtimeService.ts       # Real-time subscriptions
│   └── index.ts                 # Barrel exports
├── types/
│   ├── chat.types.ts            # TypeScript interfaces
│   └── room.types.ts
└── README.md                     # This file
```

---

## 🚀 Quick Start

### 1. Setup Database

Apply the chat schema migration to your Supabase project:

```bash
# Using Supabase CLI
supabase migration add chat_schema
# Then run the migration from database/migrations/chat_schema.sql
```

Or manually run the SQL in Supabase dashboard:
- Go to SQL Editor
- Create new query
- Copy contents of `database/migrations/chat_schema.sql`
- Run it

### 2. Use the useChat Hook

```tsx
import { useChat } from '@/features/chat/services';

function MyComponent() {
  const { userId, userName } = useAuth();
  
  const {
    channels,
    currentChannel,
    messages,
    members,
    loading,
    sendMessage,
    createChannel,
    deleteChannel,
    addMember,
  } = useChat({ userId, userName });

  // Your component logic here
}
```

### 3. Integrate with Chat UI

The existing `Chat.tsx` component can be enhanced to use the hook:

```tsx
import { useChat } from '@/features/chat/services';

const Chat = () => {
  const { userId, userName } = useAuth();
  const chatHook = useChat({ userId, userName });

  // Map hook state to existing component state
  // ... existing code ...
};
```

---

## 📚 API Reference

### useChat Hook

```typescript
const {
  // State
  channels: Channel[];
  currentChannel: Channel | null;
  messages: ChatMessage[];
  members: ChatUser[];
  onlineUsers: ChatUser[];
  unreadCounts: Record<string, number>;
  loading: boolean;
  error: string | null;

  // Actions
  setCurrentChannel: (channel: Channel) => void;
  loadChannels: () => Promise<void>;
  createChannel: (input: CreateChannelInput) => Promise<Channel>;
  updateChannel: (id: string, updates: any) => Promise<Channel>;
  deleteChannel: (id: string) => Promise<void>;
  sendMessage: (input: SendMessageInput) => Promise<ChatMessage>;
  editMessage: (id: string, content: string) => Promise<ChatMessage>;
  deleteMessage: (id: string) => Promise<void>;
  addMember: (channelId: string, memberId: string) => Promise<void>;
  removeMember: (channelId: string, memberId: string) => Promise<void>;
  openDirectMessage: (otherUserId: string) => Promise<Channel>;
  setUserPresence: (status: PresenceStatus) => Promise<void>;
} = useChat({ userId, userName });
```

### Services

#### Channels Service

```typescript
import { channelsService } from '@/features/chat/services';

// Get all channels for user
await channelsService.getUserChannels(userId);

// Create channel
await channelsService.createChannel({ 
  name: 'General',
  type: 'public'
}, userId);

// Update channel
await channelsService.updateChannel(channelId, { name: 'New Name' });

// Delete channel
await channelsService.deleteChannel(channelId);

// Manage members
await channelsService.addMemberToChannel(channelId, userId);
await channelsService.removeMemberFromChannel(channelId, userId);
await channelsService.getChannelMembers(channelId);
```

#### Messages Service

```typescript
import { messagesService } from '@/features/chat/services';

// Get messages
await messagesService.getChannelMessages(channelId, limit, offset);

// Send message
await messagesService.sendMessage(
  { channel_id: 'ch123', content: 'Hello!' },
  userId,
  userName
);

// Edit message
await messagesService.editMessage(messageId, 'Updated text', userId);

// Delete message (soft delete)
await messagesService.deleteMessage(messageId);

// Mark as read
await messagesService.markAsRead(channelId, userId);
```

#### Presence Service

```typescript
import { presenceService } from '@/features/chat/services';

// Get user presence
await presenceService.getUserPresence(userId);

// Update presence
await presenceService.updateUserPresence(userId, 'online');

// Get online users in channel
await presenceService.getOnlineChannelUsers(channelId);
```

#### Direct Messages Service

```typescript
import { directMessagesService } from '@/features/chat/services';

// Get or create DM
const dm = await directMessagesService.getOrCreateDMChannel(userId1, userId2);

// Delete DM
await directMessagesService.deleteDMChannel(dmId);
```

#### Real-time Subscriptions

```typescript
import { realtimeSubscriptions } from '@/features/chat/services';

// Subscribe to new messages
const unsubscribe = realtimeSubscriptions.subscribeToChannelMessages(
  channelId,
  (message) => {
    console.log('New message:', message);
  }
);

// Subscribe to channel updates
realtimeSubscriptions.subscribeToChannelUpdates(channelId, (channel) => {
  console.log('Channel updated:', channel);
});

// Subscribe to presence changes
realtimeSubscriptions.subscribeToUserPresence(userId, (presence) => {
  console.log('Presence changed:', presence);
});

// Clean up when done
unsubscribe();
```

---

## 🔒 Security

The chat system uses **Row Level Security (RLS)** policies:

- **Public channels**: Visible to all authenticated users
- **Private channels**: Only members can view/post
- **Direct messages**: Only participants can access
- **Messages**: Users can only edit/delete their own
- **Presence**: Users can only update their own status

---

## 🔄 Real-time Features

### Automatic Subscriptions with useChat Hook

The `useChat` hook automatically manages subscriptions:

```typescript
// Subscriptions are automatically set up when:
1. Component mounts (initialize chat)
2. currentChannel changes (subscribe to channel messages)
3. Component unmounts (cleanup subscriptions)
```

### Manual Subscription Management

```typescript
useEffect(() => {
  const unsubscribe = realtimeSubscriptions.subscribeToChannelMessages(
    channelId,
    handleNewMessage
  );
  return () => unsubscribe();
}, [channelId]);
```

---

## 💾 Database Schema

### chat_channels
- `id`: UUID (primary key)
- `name`: Channel name
- `type`: 'public' | 'private' | 'direct'
- `members`: UUID array
- `created_by`: User ID
- `is_active`: Boolean

### chat_messages
- `id`: UUID (primary key)
- `channel_id`: FK to channels
- `user_id`: FK to users
- `content`: Message text
- `type`: 'text' | 'image' | 'file' | 'location'
- `file_url`: Optional file path
- `is_deleted`: Soft delete flag

### chat_channel_members
- `channel_id`: FK
- `user_id`: FK
- `joined_at`: Timestamp
- `last_read_at`: Timestamp
- `is_muted`: Boolean
- `is_moderator`: Boolean

### user_presence
- `user_id`: FK (primary key)
- `status`: 'online' | 'away' | 'offline' | 'do_not_disturb'
- `last_seen_at`: Timestamp

---

## ⚙️ Configuration

### Environment Variables

Add to `.env.local`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Supabase Setup

1. Create new Supabase project
2. Run migrations
3. Enable Realtime for tables:
   - `chat_channels`
   - `chat_messages`
   - `chat_channel_members`
   - `user_presence`

---

## 🧪 Testing

```typescript
// Example: Testing channel creation
import { channelsService } from '@/features/chat/services';

test('should create channel', async () => {
  const channel = await channelsService.createChannel(
    { name: 'Test', type: 'public' },
    'user123'
  );
  expect(channel.name).toBe('Test');
});
```

---

## 🐛 Troubleshooting

### Messages not updating in real-time?
- Check Realtime is enabled in Supabase dashboard
- Verify RLS policies allow access
- Check browser console for errors

### Can't add members?
- Verify user exists in system
- Check RLS policies for channel_members table
- Ensure channel is not deleted

### Presence not updating?
- Ensure `setUserPresence` is called appropriately
- Check user_presence table for records
- Verify RLS policies on user_presence table

---

## 📖 Example: Complete Chat Implementation

```tsx
import React, { useEffect } from 'react';
import { useChat } from '@/features/chat/services';
import { useAuth } from '@/shared/contexts/AuthContext';

export function ChatImplementation() {
  const { user } = useAuth();
  const {
    channels,
    currentChannel,
    messages,
    loading,
    sendMessage,
    createChannel,
  } = useChat({ 
    userId: user?.id || '', 
    userName: user?.name || 'Anonymous' 
  });

  const handleCreateChannel = async () => {
    await createChannel({ name: 'New Channel', type: 'public' });
  };

  const handleSendMessage = async (content: string) => {
    if (!currentChannel) return;
    await sendMessage({
      channel_id: currentChannel.id,
      content,
      type: 'text',
    });
  };

  return (
    <div>
      {/* Your UI here */}
    </div>
  );
}
```

---

## 🚀 Next Steps

1. **Integrate with Chat.tsx** - Update component to use useChat hook
2. **Add file upload** - Implement file storage with Supabase Storage
3. **Message reactions** - Add emoji reactions using `chat_message_reactions` table
4. **Typing indicators** - Implement real-time typing status
5. **Message search** - Add full-text search with `pgroonga` extension
6. **Voice messages** - Record and store audio in Supabase Storage

---

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review example code in `Chat.tsx`
3. Check Supabase logs in dashboard
4. Review browser console for errors

