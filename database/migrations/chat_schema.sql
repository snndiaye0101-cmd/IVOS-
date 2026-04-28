-- ============= CHAT SYSTEM SCHEMA =============
-- Tables pour le système de chat temps réel

-- ============= 1. CHAT CHANNELS TABLE =============
CREATE TABLE IF NOT EXISTS chat_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('public', 'private', 'direct')),
    members UUID[] DEFAULT ARRAY[]::UUID[], -- Array of member IDs
    participants UUID[], -- For direct messages
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_chat_channels_created_by ON chat_channels(created_by);
CREATE INDEX idx_chat_channels_type ON chat_channels(type);
CREATE INDEX idx_chat_channels_is_active ON chat_channels(is_active);
CREATE INDEX idx_chat_channels_created_at ON chat_channels(created_at DESC);

-- ============= 2. CHAT MESSAGES TABLE =============
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'location')),
    file_url TEXT,
    file_name VARCHAR(255),
    edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_chat_messages_channel ON chat_messages(channel_id);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_is_deleted ON chat_messages(is_deleted);

-- ============= 3. CHANNEL MEMBERS TABLE =============
CREATE TABLE IF NOT EXISTS chat_channel_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE,
    is_muted BOOLEAN DEFAULT false,
    is_moderator BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(channel_id, user_id)
);

-- Index for faster queries
CREATE INDEX idx_chat_channel_members_channel ON chat_channel_members(channel_id);
CREATE INDEX idx_chat_channel_members_user ON chat_channel_members(user_id);
CREATE INDEX idx_chat_channel_members_joined_at ON chat_channel_members(joined_at DESC);

-- ============= 4. USER PRESENCE TABLE =============
CREATE TABLE IF NOT EXISTS user_presence (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline', 'do_not_disturb')),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_user_presence_status ON user_presence(status);
CREATE INDEX idx_user_presence_last_seen ON user_presence(last_seen_at DESC);

-- ============= 5. MESSAGE REACTIONS TABLE (Optional) =============
CREATE TABLE IF NOT EXISTS chat_message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emoji VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(message_id, user_id, emoji)
);

-- Index for faster queries
CREATE INDEX idx_chat_message_reactions_message ON chat_message_reactions(message_id);
CREATE INDEX idx_chat_message_reactions_user ON chat_message_reactions(user_id);

-- ============= 6. ROW LEVEL SECURITY (RLS) =============

-- Enable RLS on all tables
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reactions ENABLE ROW LEVEL SECURITY;

-- ============= RLS POLICIES FOR CHAT CHANNELS =============

-- Anyone can view public channels
CREATE POLICY "public_channels_view"
    ON chat_channels FOR SELECT
    USING (type = 'public' AND is_active = true);

-- Members can view private channels they're in
CREATE POLICY "private_channels_view"
    ON chat_channels FOR SELECT
    USING (
        type = 'private' 
        AND is_active = true 
        AND auth.uid() = ANY(members)
    );

-- Users can view DM channels they're in
CREATE POLICY "dm_channels_view"
    ON chat_channels FOR SELECT
    USING (
        type = 'direct' 
        AND is_active = true 
        AND auth.uid() = ANY(members)
    );

-- Only creator can create channels
CREATE POLICY "channels_insert"
    ON chat_channels FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Only creator can update their channels
CREATE POLICY "channels_update"
    ON chat_channels FOR UPDATE
    USING (auth.uid() = created_by);

-- ============= RLS POLICIES FOR CHAT MESSAGES =============

-- Users can view messages from channels they're members of
CREATE POLICY "messages_view"
    ON chat_messages FOR SELECT
    USING (
        channel_id IN (
            SELECT id FROM chat_channels
            WHERE (type = 'public' AND is_active = true)
                OR (auth.uid() = ANY(members) AND is_active = true)
        )
    );

-- Users can insert messages to channels they're members of
CREATE POLICY "messages_insert"
    ON chat_messages FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND channel_id IN (
            SELECT id FROM chat_channels
            WHERE (type = 'public' AND is_active = true)
                OR (auth.uid() = ANY(members) AND is_active = true)
        )
    );

-- Users can only edit their own messages
CREATE POLICY "messages_update"
    ON chat_messages FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can only delete their own messages (soft delete)
CREATE POLICY "messages_delete"
    ON chat_messages FOR DELETE
    USING (auth.uid() = user_id);

-- ============= RLS POLICIES FOR CHANNEL MEMBERS =============

-- Users can view members of channels they're in
CREATE POLICY "channel_members_view"
    ON chat_channel_members FOR SELECT
    USING (
        channel_id IN (
            SELECT id FROM chat_channels
            WHERE auth.uid() = ANY(members)
        )
    );

-- Members can update their own membership
CREATE POLICY "channel_members_update"
    ON chat_channel_members FOR UPDATE
    USING (auth.uid() = user_id);

-- ============= RLS POLICIES FOR USER PRESENCE =============

-- Users can view all presence (for online indicators)
CREATE POLICY "user_presence_view"
    ON user_presence FOR SELECT
    USING (true);

-- Users can only update their own presence
CREATE POLICY "user_presence_update"
    ON user_presence FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can insert their own presence
CREATE POLICY "user_presence_insert"
    ON user_presence FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============= RLS POLICIES FOR MESSAGE REACTIONS =============

-- Users can view reactions
CREATE POLICY "message_reactions_view"
    ON chat_message_reactions FOR SELECT
    USING (true);

-- Users can insert their own reactions
CREATE POLICY "message_reactions_insert"
    ON chat_message_reactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "message_reactions_delete"
    ON chat_message_reactions FOR DELETE
    USING (auth.uid() = user_id);

-- ============= FUNCTIONS FOR COMMON OPERATIONS =============

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_count(user_id UUID, channel_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) FROM chat_messages
        WHERE 
            chat_messages.channel_id = $2
            AND chat_messages.is_deleted = false
            AND chat_messages.created_at > COALESCE(
                (SELECT last_read_at FROM chat_channel_members 
                 WHERE channel_id = $2 AND user_id = $1),
                '2000-01-01'::TIMESTAMP WITH TIME ZONE
            )
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_channel_as_read(user_id UUID, channel_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE chat_channel_members
    SET last_read_at = NOW()
    WHERE user_id = $1 AND channel_id = $2;
END;
$$ LANGUAGE plpgsql;

-- Function to add member to channel
CREATE OR REPLACE FUNCTION add_member_to_channel(channel_id UUID, member_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Add to members array
    UPDATE chat_channels
    SET members = array_append(members, member_id)
    WHERE id = channel_id AND NOT (member_id = ANY(members));
    
    -- Insert into channel_members
    INSERT INTO chat_channel_members (channel_id, user_id)
    VALUES (channel_id, member_id)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to remove member from channel
CREATE OR REPLACE FUNCTION remove_member_from_channel(channel_id UUID, member_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Remove from members array
    UPDATE chat_channels
    SET members = array_remove(members, member_id)
    WHERE id = channel_id;
    
    -- Delete from channel_members
    DELETE FROM chat_channel_members
    WHERE channel_id = channel_id AND user_id = member_id;
END;
$$ LANGUAGE plpgsql;

-- ============= TRIGGERS =============

-- Trigger to update updated_at timestamp on chat_channels
CREATE OR REPLACE FUNCTION update_channels_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_channels_timestamp
    BEFORE UPDATE ON chat_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_channels_timestamp();

-- Trigger to update updated_at timestamp on chat_messages
CREATE TRIGGER trigger_update_messages_timestamp
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_channels_timestamp();

-- Trigger to auto-create user presence record
CREATE OR REPLACE FUNCTION create_user_presence()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_presence (user_id, status, last_seen_at)
    VALUES (NEW.id, 'offline', NOW())
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_user_presence
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_presence();
