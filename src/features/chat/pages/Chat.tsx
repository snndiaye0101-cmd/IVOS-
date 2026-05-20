import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Hash,
  Users,
  Plus,
  Trash2,
  Smile,
  Send,
  Video,
  VideoOff,
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  MonitorUp,
  ScreenShare,
  ScreenShareOff,
  MapPin,
  X,
  Paperclip,
  AlertCircle,
  Clock,
  Edit2,
  Pin,
  CheckCheck,
  Moon,
  Sun,
  Search,
  AlertTriangle,
  AtSign,
  FileText,
  Image as ImageIcon,
  ChevronDown,
  Menu,
  MessageSquare,
  Bot,
  Shield,
  Truck,
  Wrench,
  Building2,
  UserCheck,
  Bell,
  ZoomIn,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/shared/contexts/AuthContext';

// ============= TYPES =============

interface ChatUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  department?: string;
  status: 'online' | 'away' | 'offline' | 'en-operation';
}

interface Channel {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  members: string[];
  is_archived: boolean;
  is_department?: boolean;
  icon?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  conversation_type: 'channel' | 'direct' | 'thread';
  sender_id: string;
  sender_name: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'location' | 'bot';
  file_url?: string;
  file_name?: string;
  file_type?: string;
  location?: { lat: number; lng: number };
  created_at: string;
  reactions: { emoji: string; users: string[] }[];
  is_pinned: boolean;
  read_by: string[];
  edited_at?: string;
  is_deleted: boolean;
  is_urgent?: boolean;
  mentions?: string[];
  thread_id?: string;
  thread_name?: string;
}

interface GroupedMessage {
  sender_id: string;
  sender_name: string;
  timestamp: string;
  messages: Message[];
}

interface TypingIndicator {
  userId: string;
  userName: string;
  conversationId: string;
}

interface CallState {
  roomName: string;
  type: 'audio' | 'video';
  jitsiUrl: string;
}

interface IncomingCall {
  callerId: string;
  callerName: string;
  callType: 'audio' | 'video';
  roomName: string;
}

// ============= CONSTANTS =============

const EMOJI_CATEGORIES: Record<string, string[]> = {
  Smileys: [
    '😀',
    '😂',
    '🤣',
    '😊',
    '😍',
    '🥰',
    '😎',
    '🤩',
    '😋',
    '🤔',
    '😴',
    '🥱',
    '😷',
    '🤮',
    '🤕',
    '🫡',
  ],
  Gestes: ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '💪', '🫶', '🙏', '👋', '✋', '🤙', '👊'],
  Transport: ['🚗', '🚕', '🚌', '🚛', '🚜', '🏍️', '🚀', '✈️', '🚢', '🚂', '🚲', '⛽', '🔧', '🛞'],
  Objets: ['📎', '📁', '📋', '📊', '📈', '🔔', '💡', '⚙️', '🔑', '📱', '💻', '🖨️', '📷', '🎯'],
  Alertes: ['⚠️', '🚨', '❌', '✅', '🔴', '🟢', '🟡', '⏰', '📢', '🆘', '🔥', '💥', '⛔', '🚫'],
  Nature: ['☀️', '🌧️', '❄️', '🌪️', '🌈', '⭐', '🌙', '💧', '🌍', '🌿', '🌸', '🍃', '🔥', '💨'],
};

const DEPARTMENT_CHANNELS: Omit<Channel, 'created_at'>[] = [
  {
    id: 'dept-logistique',
    name: 'logistique',
    description: 'Canal département Logistique',
    created_by: 'system',
    members: [],
    is_archived: false,
    is_department: true,
    icon: '🚛',
  },
  {
    id: 'dept-mecanique',
    name: 'mecanique',
    description: 'Canal département Mécanique',
    created_by: 'system',
    members: [],
    is_archived: false,
    is_department: true,
    icon: '🔧',
  },
  {
    id: 'dept-administration',
    name: 'administration',
    description: 'Canal département Administration',
    created_by: 'system',
    members: [],
    is_archived: false,
    is_department: true,
    icon: '🏢',
  },
  {
    id: 'dept-chauffeurs',
    name: 'chauffeurs',
    description: 'Canal département Chauffeurs',
    created_by: 'system',
    members: [],
    is_archived: false,
    is_department: true,
    icon: '🚗',
  },
  {
    id: 'dept-alertes',
    name: 'alertes',
    description: 'Notifications automatiques du système',
    created_by: 'system',
    members: [],
    is_archived: false,
    is_department: true,
    icon: '🚨',
  },
];

const STORAGE_KEY = 'ivos_chat_v3';

// ============= COMPONENT =============

const Chat: React.FC = () => {
  const authContext = useAuth();
  const currentUserId = authContext?.user?.id || 'user-1';
  const currentUserName = authContext?.user?.fullName || 'Utilisateur';
  const currentUserRole = (authContext?.user as any)?.role || 'admin';

  // ---- State ----
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem('ivos_chat_dark') === 'true'
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Conversations
  const [channels, setChannels] = useState<Channel[]>([]);
  const [availableUsers, setAvailableUsers] = useState<ChatUser[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  // Current conversation
  const [currentConversation, setCurrentConversation] = useState<{
    id: string;
    type: 'channel' | 'direct' | 'thread';
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageSearchTerm, setMessageSearchTerm] = useState('');

  // Message input
  const [messageInput, setMessageInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);

  // @mention
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);

  // Emoji
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerPos, setEmojiPickerPos] = useState({ bottom: 0, left: 0 });

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Modals
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showManageMembersModal, setShowManageMembersModal] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<string | null>(null);

  // Typing
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);

  // Calls
  const [activeCall, setActiveCall] = useState<CallState | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Pinned
  const [pinnedMessages, setPinnedMessages] = useState<Set<string>>(new Set());

  // Error
  const [error, setError] = useState<string | null>(null);

  // ---- Refs ----
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const smileyButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // ---- Helpers ----
  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const getStatusColor = (status: ChatUser['status']) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'en-operation':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: ChatUser['status']) => {
    switch (status) {
      case 'online':
        return 'En ligne';
      case 'away':
        return 'Absent';
      case 'en-operation':
        return 'En opération';
      default:
        return 'Hors ligne';
    }
  };

  const getDeptIcon = (name: string) => {
    switch (name) {
      case 'logistique':
        return <Truck className="h-4 w-4" />;
      case 'mecanique':
        return <Wrench className="h-4 w-4" />;
      case 'administration':
        return <Building2 className="h-4 w-4" />;
      case 'chauffeurs':
        return <UserCheck className="h-4 w-4" />;
      case 'alertes':
        return <Bell className="h-4 w-4" />;
      default:
        return <Hash className="h-4 w-4" />;
    }
  };

  // ---- Persistence ----
  const saveToStorage = useCallback((ch: Channel[], msg: Message[], usr: ChatUser[]) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ channels: ch, messages: msg, users: usr })
      );
    } catch {
      /* quota exceeded — ignore */
    }
  }, []);

  // ---- Init ----
  useEffect(() => {
    const timer = setTimeout(() => {
      let savedData: { channels?: Channel[]; messages?: Message[]; users?: ChatUser[] } = {};
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) savedData = JSON.parse(raw);
      } catch {
        /* ignore */
      }

      // Mock users
      const defaultUsers: ChatUser[] = [
        {
          id: 'user-1',
          name: 'Alice Johnson',
          email: 'alice@ivos.dz',
          role: 'admin',
          department: 'administration',
          status: 'online',
        },
        {
          id: 'user-2',
          name: 'Bob Smith',
          email: 'bob@ivos.dz',
          role: 'chauffeur',
          department: 'chauffeurs',
          status: 'away',
        },
        {
          id: 'user-3',
          name: 'Carol Davis',
          email: 'carol@ivos.dz',
          role: 'mecanicien',
          department: 'mecanique',
          status: 'offline',
        },
        {
          id: 'user-4',
          name: 'David Martin',
          email: 'david@ivos.dz',
          role: 'logisticien',
          department: 'logistique',
          status: 'en-operation',
        },
        {
          id: 'user-5',
          name: 'Eva Leclerc',
          email: 'eva@ivos.dz',
          role: 'rh',
          department: 'administration',
          status: 'online',
        },
      ];
      const users = savedData.users?.length ? savedData.users : defaultUsers;

      // Department channels + saved custom channels
      const now = new Date().toISOString();
      const deptChannels: Channel[] = DEPARTMENT_CHANNELS.map((dc) => ({
        ...dc,
        created_at: now,
        members: users.map((u) => u.id),
      }));

      const savedCustomChannels = (savedData.channels || []).filter((c) => !c.is_department);
      const allChannels = [...deptChannels, ...savedCustomChannels];

      // Default messages if none saved
      const defaultMessages: Message[] = [
        {
          id: 'msg-1',
          conversation_id: 'dept-logistique',
          conversation_type: 'channel',
          sender_id: 'user-4',
          sender_name: 'David Martin',
          content: 'Livraison site Oran terminée, retour prévu à 17h',
          type: 'text',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          reactions: [{ emoji: '👍', users: ['user-1'] }],
          is_pinned: false,
          read_by: ['user-4', 'user-1'],
          is_deleted: false,
          is_urgent: false,
          mentions: [],
        },
        {
          id: 'msg-2',
          conversation_id: 'dept-mecanique',
          conversation_type: 'channel',
          sender_id: 'user-3',
          sender_name: 'Carol Davis',
          content: 'Véhicule 1234-ABC-16 : vidange + freins terminés ✅',
          type: 'text',
          created_at: new Date(Date.now() - 1800000).toISOString(),
          reactions: [],
          is_pinned: false,
          read_by: ['user-3'],
          is_deleted: false,
          is_urgent: false,
          mentions: [],
        },
        {
          id: 'msg-bot-1',
          conversation_id: 'dept-alertes',
          conversation_type: 'channel',
          sender_id: 'system-bot',
          sender_name: 'IVOS Bot',
          content:
            '⚠️ Visite technique expirée : Véhicule 5678-DEF-16 — Échéance dépassée de 3 jours',
          type: 'bot',
          created_at: new Date(Date.now() - 900000).toISOString(),
          reactions: [],
          is_pinned: false,
          read_by: [],
          is_deleted: false,
          is_urgent: true,
          mentions: [],
        },
        {
          id: 'msg-bot-2',
          conversation_id: 'dept-alertes',
          conversation_type: 'channel',
          sender_id: 'system-bot',
          sender_name: 'IVOS Bot',
          content: '🔴 Retard pointage : Bob Smith — Arrivée prévue 08:00, non pointé à 08:30',
          type: 'bot',
          created_at: new Date(Date.now() - 600000).toISOString(),
          reactions: [],
          is_pinned: false,
          read_by: [],
          is_deleted: false,
          is_urgent: true,
          mentions: [],
        },
      ];
      const msgs = savedData.messages?.length ? savedData.messages : defaultMessages;

      setAvailableUsers(users);
      setChannels(allChannels);
      setMessages(msgs);
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Save on change
  useEffect(() => {
    if (!isLoading) saveToStorage(channels, messages, availableUsers);
  }, [channels, messages, availableUsers, isLoading, saveToStorage]);

  // Dark mode persist
  useEffect(() => {
    localStorage.setItem('ivos_chat_dark', String(isDarkMode));
  }, [isDarkMode]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentConversation]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node) &&
        smileyButtonRef.current &&
        !smileyButtonRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ---- Derived ----
  const currentChannelData = useMemo(() => {
    if (!currentConversation || currentConversation.type !== 'channel') return null;
    return channels.find((c) => c.id === currentConversation.id) || null;
  }, [currentConversation, channels]);

  const currentDmUser = useMemo(() => {
    if (!currentConversation || currentConversation.type !== 'direct') return null;
    return availableUsers.find((u) => u.id === currentConversation.id) || null;
  }, [currentConversation, availableUsers]);

  const filteredChannels = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return channels.filter((c) => !c.is_archived && c.name.toLowerCase().includes(term));
  }, [channels, searchTerm]);

  const departmentChannels = useMemo(
    () => filteredChannels.filter((c) => c.is_department),
    [filteredChannels]
  );
  const customChannels = useMemo(
    () => filteredChannels.filter((c) => !c.is_department),
    [filteredChannels]
  );

  const currentMessages = useMemo(() => {
    if (!currentConversation) return [];
    return messages.filter((m) => {
      if (m.is_deleted) return false;
      if (currentConversation.type === 'direct') {
        return (
          m.conversation_type === 'direct' &&
          ((m.sender_id === currentUserId && m.conversation_id === currentConversation.id) ||
            (m.sender_id === currentConversation.id && m.conversation_id === currentUserId))
        );
      }
      return (
        m.conversation_id === currentConversation.id &&
        m.conversation_type === currentConversation.type
      );
    });
  }, [messages, currentConversation, currentUserId]);

  const groupedMessages = useMemo((): GroupedMessage[] => {
    const groups: GroupedMessage[] = [];
    let current: GroupedMessage | null = null;
    const sorted = [...currentMessages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    for (const msg of sorted) {
      if (
        !current ||
        current.sender_id !== msg.sender_id ||
        new Date(msg.created_at).getTime() - new Date(current.timestamp).getTime() > 300000
      ) {
        current = {
          sender_id: msg.sender_id,
          sender_name: msg.sender_name,
          timestamp: msg.created_at,
          messages: [msg],
        };
        groups.push(current);
      } else {
        current.messages.push(msg);
      }
    }
    return groups;
  }, [currentMessages]);

  // @mention filtered users
  const mentionSuggestions = useMemo(() => {
    if (!mentionQuery) return availableUsers;
    const q = mentionQuery.toLowerCase();
    return availableUsers.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [availableUsers, mentionQuery]);

  // Unread count per conversation
  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    messages.forEach((m) => {
      if (!m.is_deleted && !m.read_by.includes(currentUserId) && m.sender_id !== currentUserId) {
        const key = m.conversation_id;
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [messages, currentUserId]);

  // ---- Handlers ----

  const handleSelectConversation = useCallback(
    (id: string, type: 'channel' | 'direct' | 'thread') => {
      setCurrentConversation({ id, type });
      setEditingMessageId(null);
      setMessageInput('');
      setSelectedFile(null);
      setFilePreview(null);
      setIsUrgent(false);
      setShowMentionDropdown(false);
      setIsMobileSidebarOpen(false);
    },
    []
  );

  const handleCreateChannel = useCallback(() => {
    if (!newChannelName.trim()) return;
    const newChannel: Channel = {
      id: `ch-${Date.now()}`,
      name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
      description: '',
      created_by: currentUserId,
      created_at: new Date().toISOString(),
      members: [currentUserId],
      is_archived: false,
      is_department: false,
    };
    setChannels((prev) => [...prev, newChannel]);
    setNewChannelName('');
    setShowCreateChannelModal(false);
    handleSelectConversation(newChannel.id, 'channel');
  }, [newChannelName, currentUserId, handleSelectConversation]);

  const handleDeleteChannel = useCallback(
    (channelId: string) => {
      const ch = channels.find((c) => c.id === channelId);
      if (ch?.is_department) {
        setError('Impossible de supprimer un canal département');
        setShowDeleteConfirm(null);
        return;
      }
      setChannels((prev) => prev.filter((c) => c.id !== channelId));
      setMessages((prev) => prev.filter((m) => m.conversation_id !== channelId));
      if (currentConversation?.id === channelId) setCurrentConversation(null);
      setShowDeleteConfirm(null);
    },
    [channels, currentConversation]
  );

  const handleAddMember = useCallback(() => {
    if (!selectedUserToAdd || !currentChannelData) return;
    setChannels((prev) =>
      prev.map((c) =>
        c.id === currentChannelData.id ? { ...c, members: [...c.members, selectedUserToAdd] } : c
      )
    );
    setSelectedUserToAdd(null);
    setShowAddMemberForm(false);
  }, [selectedUserToAdd, currentChannelData]);

  const handleRemoveMember = useCallback(
    (memberId: string) => {
      if (!currentChannelData) return;
      setChannels((prev) =>
        prev.map((c) =>
          c.id === currentChannelData.id
            ? { ...c, members: c.members.filter((m) => m !== memberId) }
            : c
        )
      );
    },
    [currentChannelData]
  );

  // ---- Message Actions ----

  const extractMentions = (text: string): string[] => {
    const regex = /@(\w+(?:\s\w+)?)/g;
    const mentions: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      const name = match[1];
      const user = availableUsers.find((u) =>
        u.name.toLowerCase().replace(/\s+/g, ' ').startsWith(name.toLowerCase())
      );
      if (user) mentions.push(user.id);
    }
    return mentions;
  };

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() && !selectedFile) return;
    if (!currentConversation) return;

    const now = new Date().toISOString();
    const mentions = extractMentions(messageInput);

    if (editingMessageId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === editingMessageId ? { ...m, content: messageInput, edited_at: now, mentions } : m
        )
      );
      setEditingMessageId(null);
    } else {
      let msgType: Message['type'] = 'text';
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      let fileType: string | undefined;

      if (selectedFile) {
        const isImage = selectedFile.type.startsWith('image/');
        msgType = isImage ? 'image' : 'file';
        fileUrl = filePreview || URL.createObjectURL(selectedFile);
        fileName = selectedFile.name;
        fileType = selectedFile.type;
      }

      const newMsg: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        conversation_id:
          currentConversation.type === 'direct' ? currentConversation.id : currentConversation.id,
        conversation_type: currentConversation.type,
        sender_id: currentUserId,
        sender_name: currentUserName,
        content: messageInput,
        type: msgType,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType,
        created_at: now,
        reactions: [],
        is_pinned: false,
        read_by: [currentUserId],
        is_deleted: false,
        is_urgent: isUrgent,
        mentions,
      };
      setMessages((prev) => [...prev, newMsg]);
    }

    setMessageInput('');
    setSelectedFile(null);
    setFilePreview(null);
    setIsUrgent(false);
    setShowMentionDropdown(false);
  }, [
    messageInput,
    selectedFile,
    filePreview,
    currentConversation,
    currentUserId,
    currentUserName,
    editingMessageId,
    isUrgent,
    availableUsers,
  ]);

  const handleDeleteMessage = useCallback((msgId: string) => {
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, is_deleted: true } : m)));
  }, []);

  const handlePinMessage = useCallback((msgId: string) => {
    setPinnedMessages((prev) => {
      const next = new Set(prev);
      next.has(msgId) ? next.delete(msgId) : next.add(msgId);
      return next;
    });
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, is_pinned: !m.is_pinned } : m))
    );
  }, []);

  const handleReactToMessage = useCallback(
    (msgId: string, emoji: string) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msgId) return m;
          const idx = m.reactions.findIndex((r) => r.emoji === emoji);
          if (idx >= 0) {
            const reaction = m.reactions[idx];
            const hasReacted = reaction.users.includes(currentUserId);
            const updated = hasReacted
              ? { ...reaction, users: reaction.users.filter((u) => u !== currentUserId) }
              : { ...reaction, users: [...reaction.users, currentUserId] };
            const reactions = [...m.reactions];
            if (updated.users.length === 0) reactions.splice(idx, 1);
            else reactions[idx] = updated;
            return { ...m, reactions };
          }
          return { ...m, reactions: [...m.reactions, { emoji, users: [currentUserId] }] };
        })
      );
    },
    [currentUserId]
  );

  const handleMarkAsRead = useCallback(
    (msgId: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && !m.read_by.includes(currentUserId)
            ? { ...m, read_by: [...m.read_by, currentUserId] }
            : m
        )
      );
    },
    [currentUserId]
  );

  // ---- File handling ----

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 10 MB limit
    if (file.size > 10 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 10 Mo)');
      return;
    }
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      setFilePreview(null); // PDF shown by name
    } else {
      setFilePreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ---- Emoji ----

  const insertEmoji = useCallback((emoji: string) => {
    setMessageInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  }, []);

  // ---- @Mention ----

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessageInput(val);

    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }

    // Check for @mention
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setShowMentionDropdown(true);
      setMentionQuery(atMatch[1]);
      setMentionStartIndex(cursorPos - atMatch[0].length);
    } else {
      setShowMentionDropdown(false);
      setMentionQuery('');
      setMentionStartIndex(-1);
    }

    // Typing indicator (mock)
    // In production: emit via websocket
  }, []);

  const handleInsertMention = useCallback(
    (user: ChatUser) => {
      const before = messageInput.slice(0, mentionStartIndex);
      const after = messageInput.slice(textareaRef.current?.selectionStart || messageInput.length);
      setMessageInput(`${before}@${user.name} ${after}`);
      setShowMentionDropdown(false);
      setMentionQuery('');
      setMentionStartIndex(-1);
      textareaRef.current?.focus();
    },
    [messageInput, mentionStartIndex]
  );

  // ---- Location ----

  const handleShareLocation = useCallback(() => {
    if (!currentConversation) return;
    if (!navigator.geolocation) {
      setError('Géolocalisation non supportée');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newMsg: Message = {
          id: `msg-${Date.now()}`,
          conversation_id:
            currentConversation.type === 'direct' ? currentConversation.id : currentConversation.id,
          conversation_type: currentConversation.type,
          sender_id: currentUserId,
          sender_name: currentUserName,
          content: `📍 Position: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`,
          type: 'location',
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          created_at: new Date().toISOString(),
          reactions: [],
          is_pinned: false,
          read_by: [currentUserId],
          is_deleted: false,
          mentions: [],
        };
        setMessages((prev) => [...prev, newMsg]);
      },
      () => setError("Impossible d'obtenir la position GPS")
    );
  }, [currentConversation, currentUserId, currentUserName]);

  // ---- Calls ----

  const handleStartCall = useCallback(
    (type: 'audio' | 'video') => {
      if (activeCall) return;
      const room = `ivos-${currentConversation?.id || 'lobby'}-${Date.now()}`;
      setActiveCall({
        roomName: room,
        type,
        jitsiUrl: `https://meet.jit.si/${room}`,
      });
    },
    [activeCall, currentConversation]
  );

  const handleEndCall = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setActiveCall(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
  }, []);

  const handleAcceptCall = useCallback(() => {
    if (!incomingCall) return;
    setActiveCall({
      roomName: incomingCall.roomName,
      type: incomingCall.callType,
      jitsiUrl: `https://meet.jit.si/${incomingCall.roomName}`,
    });
    setIncomingCall(null);
  }, [incomingCall]);

  const handleDeclineCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  const handleToggleMute = useCallback(() => setIsMuted((p) => !p), []);
  const handleToggleCamera = useCallback(() => setIsCameraOff((p) => !p), []);

  const handleToggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        if (screenVideoRef.current) screenVideoRef.current.srcObject = stream;
        setIsScreenSharing(true);
        stream.getVideoTracks()[0].onended = () => {
          screenStreamRef.current = null;
          setIsScreenSharing(false);
        };
      } catch {
        // user cancelled
      }
    }
  }, [isScreenSharing]);

  // ---- Keyboard ----

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (showMentionDropdown && mentionSuggestions.length > 0) {
          handleInsertMention(mentionSuggestions[0]);
        } else {
          handleSendMessage();
        }
      }
      if (e.key === 'Escape') {
        setShowMentionDropdown(false);
        if (editingMessageId) {
          setEditingMessageId(null);
          setMessageInput('');
        }
      }
    },
    [
      showMentionDropdown,
      mentionSuggestions,
      handleInsertMention,
      handleSendMessage,
      editingMessageId,
    ]
  );

  // ---- Render helpers ----

  const renderMessageContent = (msg: Message) => {
    // Render @mentions in bold
    const renderTextWithMentions = (text: string) => {
      const parts = text.split(/(@\w+(?:\s\w+)?)/g);
      return parts.map((part, i) => {
        if (part.startsWith('@')) {
          return (
            <span key={i} className="rounded bg-indigo-500/20 px-1 font-semibold text-indigo-400">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      });
    };

    switch (msg.type) {
      case 'text':
        return <p className="whitespace-pre-wrap">{renderTextWithMentions(msg.content)}</p>;
      case 'bot':
        return (
          <div className="flex items-start gap-2">
            <Bot className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        );
      case 'image':
        return (
          <div>
            {msg.content && (
              <p className="mb-2 whitespace-pre-wrap">{renderTextWithMentions(msg.content)}</p>
            )}
            {msg.file_url && (
              <button onClick={() => setLightboxUrl(msg.file_url!)} className="block">
                <img
                  src={msg.file_url}
                  alt={msg.file_name || 'image'}
                  className="max-h-48 max-w-xs cursor-pointer rounded-lg border border-white/20 transition-opacity hover:opacity-90"
                />
                <span className="mt-1 flex items-center gap-1 text-xs opacity-60">
                  <ZoomIn className="h-3 w-3" /> Cliquer pour agrandir
                </span>
              </button>
            )}
          </div>
        );
      case 'file':
        return (
          <div>
            {msg.content && (
              <p className="mb-2 whitespace-pre-wrap">{renderTextWithMentions(msg.content)}</p>
            )}
            <div className="inline-flex items-center gap-2 rounded border border-white/20 bg-white/10 px-3 py-2 text-sm">
              {msg.file_type === 'application/pdf' ? (
                <FileText className="h-4 w-4 flex-shrink-0 text-red-400" />
              ) : (
                <Paperclip className="h-4 w-4 flex-shrink-0" />
              )}
              <span className="max-w-[200px] truncate">{msg.file_name}</span>
            </div>
          </div>
        );
      case 'location':
        return (
          <div className="inline-flex items-center gap-2 rounded border border-white/20 bg-white/10 px-3 py-2 text-sm">
            <MapPin className="h-4 w-4 flex-shrink-0 text-blue-400" />
            {msg.content}
          </div>
        );
      default:
        return <p>{msg.content}</p>;
    }
  };

  // ============= LOADING =============

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="h-10 w-10 rounded-full border-4 border-indigo-500 border-t-transparent"
        />
      </div>
    );
  }

  // ============= MAIN RENDER =============

  return (
    <div
      className={`relative flex h-[calc(100vh-64px)] overflow-hidden transition-colors ${
        isDarkMode ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'
      }`}
    >
      {/* MOBILE OVERLAY */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ====== SIDEBAR ====== */}
      <aside
        className={`
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        fixed z-40 flex h-full w-80
        flex-shrink-0 flex-col border-r transition-all duration-300 lg:relative lg:z-auto lg:translate-x-0
        ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'}
      `}
      >
        {/* Sidebar Header */}
        <div
          className={`flex-shrink-0 border-b p-4 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <MessageSquare className="h-5 w-5 text-indigo-500" />
              Chat IVOS
            </h2>
            <div className="flex items-center gap-1">
              <motion.button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`rounded-lg p-1.5 transition-colors ${
                  isDarkMode
                    ? 'text-yellow-400 hover:bg-slate-700'
                    : 'text-blue-600 hover:bg-gray-100'
                }`}
                whileHover={{ scale: 1.1 }}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </motion.button>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="rounded-lg p-1.5 hover:bg-gray-100 lg:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
                isDarkMode ? 'text-slate-500' : 'text-gray-400'
              }`}
            />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-lg py-2 pl-9 pr-3 text-sm transition-colors ${
                isDarkMode
                  ? 'border border-slate-600 bg-slate-800 text-white placeholder-slate-500 focus:border-indigo-500'
                  : 'border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-indigo-500'
              } focus:outline-none focus:ring-1 focus:ring-indigo-500`}
            />
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
          {/* Department Channels */}
          <div>
            <div
              className={`mb-1 flex items-center justify-between px-2 ${
                isDarkMode ? 'text-slate-400' : 'text-gray-500'
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-wider">Départements</span>
              <Shield className="h-3 w-3" />
            </div>
            {departmentChannels.map((ch) => {
              const isActive = currentConversation?.id === ch.id;
              const unread = unreadCounts[ch.id] || 0;
              return (
                <motion.button
                  key={ch.id}
                  onClick={() => handleSelectConversation(ch.id, 'channel')}
                  className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? isDarkMode
                        ? 'bg-indigo-600/30 text-indigo-300'
                        : 'bg-indigo-50 text-indigo-700'
                      : isDarkMode
                        ? 'text-slate-300 hover:bg-slate-800'
                        : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  whileHover={{ x: 2 }}
                >
                  <span
                    className={`flex-shrink-0 ${isActive ? 'text-indigo-400' : isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}
                  >
                    {getDeptIcon(ch.name)}
                  </span>
                  <span className="truncate font-medium">#{ch.name}</span>
                  {unread > 0 && (
                    <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {unread}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Custom Channels */}
          <div>
            <div
              className={`mb-1 flex items-center justify-between px-2 ${
                isDarkMode ? 'text-slate-400' : 'text-gray-500'
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-wider">Canaux</span>
              <motion.button
                onClick={() => setShowCreateChannelModal(true)}
                className="rounded p-0.5 transition-colors hover:bg-gray-200 dark:hover:bg-slate-700"
                whileHover={{ scale: 1.2 }}
              >
                <Plus className="h-3.5 w-3.5" />
              </motion.button>
            </div>
            {customChannels.length === 0 ? (
              <p
                className={`px-3 py-2 text-xs italic ${isDarkMode ? 'text-slate-600' : 'text-gray-400'}`}
              >
                Aucun canal personnalisé
              </p>
            ) : (
              customChannels.map((ch) => {
                const isActive = currentConversation?.id === ch.id;
                const unread = unreadCounts[ch.id] || 0;
                return (
                  <motion.button
                    key={ch.id}
                    onClick={() => handleSelectConversation(ch.id, 'channel')}
                    className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? isDarkMode
                          ? 'bg-indigo-600/30 text-indigo-300'
                          : 'bg-indigo-50 text-indigo-700'
                        : isDarkMode
                          ? 'text-slate-300 hover:bg-slate-800'
                          : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    whileHover={{ x: 2 }}
                  >
                    <Hash
                      className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-indigo-400' : isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}
                    />
                    <span className="truncate font-medium">#{ch.name}</span>
                    {unread > 0 && (
                      <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {unread}
                      </span>
                    )}
                  </motion.button>
                );
              })
            )}
          </div>

          {/* Direct Messages */}
          <div>
            <div className={`mb-1 px-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              <span className="text-xs font-semibold uppercase tracking-wider">
                Messages directs
              </span>
            </div>
            {availableUsers
              .filter((u) => u.id !== currentUserId)
              .map((user) => {
                const isActive =
                  currentConversation?.id === user.id && currentConversation.type === 'direct';
                const unread = unreadCounts[user.id] || 0;
                return (
                  <motion.button
                    key={user.id}
                    onClick={() => handleSelectConversation(user.id, 'direct')}
                    className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? isDarkMode
                          ? 'bg-indigo-600/30 text-indigo-300'
                          : 'bg-indigo-50 text-indigo-700'
                        : isDarkMode
                          ? 'text-slate-300 hover:bg-slate-800'
                          : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    whileHover={{ x: 2 }}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                        {getInitials(user.name)}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 ${
                          isDarkMode ? 'border-slate-900' : 'border-white'
                        } ${getStatusColor(user.status)}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <span className="block truncate font-medium">{user.name}</span>
                      {user.status === 'en-operation' && (
                        <span className="flex items-center gap-0.5 text-[10px] text-blue-400">
                          <Truck className="h-2.5 w-2.5" /> En opération
                        </span>
                      )}
                    </div>
                    {unread > 0 && (
                      <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {unread}
                      </span>
                    )}
                  </motion.button>
                );
              })}
          </div>
        </div>

        {/* Current user */}
        <div
          className={`flex flex-shrink-0 items-center gap-2 border-t p-3 ${
            isDarkMode ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-gray-50'
          }`}
        >
          <div className="relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {getInitials(currentUserName)}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500 dark:border-slate-900" />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`truncate text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              {currentUserName}
            </p>
            <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              En ligne
            </p>
          </div>
        </div>
      </aside>

      {/* ====== CHAT AREA ====== */}
      {currentConversation && (currentChannelData || currentDmUser) ? (
        <main
          className={`flex flex-1 flex-col overflow-hidden transition-colors ${
            isDarkMode ? 'bg-slate-800' : 'bg-white'
          }`}
        >
          {/* HEADER */}
          <header
            className={`flex flex-shrink-0 items-center justify-between gap-3 border-b px-4 py-3 transition-colors lg:px-6 ${
              isDarkMode ? 'border-slate-600 bg-slate-700' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {/* Mobile hamburger */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className={`rounded-lg p-1.5 lg:hidden ${isDarkMode ? 'text-slate-300 hover:bg-slate-600' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Menu className="h-5 w-5" />
              </button>

              {currentDmUser ? (
                <>
                  <div className="relative flex-shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                      {getInitials(currentDmUser.name)}
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 ${
                        isDarkMode ? 'border-slate-700' : 'border-white'
                      } ${getStatusColor(currentDmUser.status)}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <h1
                      className={`truncate text-base font-bold lg:text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                    >
                      {currentDmUser.name}
                    </h1>
                    <p
                      className={`flex items-center gap-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${getStatusColor(currentDmUser.status)}`}
                      />
                      {getStatusLabel(currentDmUser.status)}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <span className="flex-shrink-0 text-indigo-500">
                    {currentChannelData!.is_department ? (
                      getDeptIcon(currentChannelData!.name)
                    ) : (
                      <Hash className="h-5 w-5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <h1
                      className={`truncate text-base font-bold lg:text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                    >
                      #{currentChannelData!.name}
                    </h1>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      {currentChannelData!.members.length} membre
                      {currentChannelData!.members.length !== 1 ? 's' : ''}
                      {currentChannelData!.is_department && ' · Département'}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {currentChannelData && (
                <motion.button
                  onClick={() => setShowManageMembersModal(true)}
                  className={`rounded-lg p-2 transition-colors ${
                    isDarkMode
                      ? 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title="Membres"
                  whileHover={{ scale: 1.1 }}
                >
                  <Users className="h-4 w-4 lg:h-5 lg:w-5" />
                </motion.button>
              )}
              <motion.button
                onClick={() => handleStartCall('video')}
                disabled={!!activeCall}
                className={`hidden rounded-lg p-2 transition-colors sm:flex ${
                  activeCall
                    ? 'cursor-not-allowed bg-gray-200 text-gray-400 opacity-50'
                    : isDarkMode
                      ? 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="Appel vidéo"
                whileHover={activeCall ? {} : { scale: 1.1 }}
              >
                <Video className="h-4 w-4 lg:h-5 lg:w-5" />
              </motion.button>
              <motion.button
                onClick={() => handleStartCall('audio')}
                disabled={!!activeCall}
                className={`hidden rounded-lg p-2 transition-colors sm:flex ${
                  activeCall
                    ? 'cursor-not-allowed bg-gray-200 text-gray-400 opacity-50'
                    : isDarkMode
                      ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
                title="Appel vocal"
                whileHover={activeCall ? {} : { scale: 1.1 }}
              >
                <Phone className="h-4 w-4 lg:h-5 lg:w-5" />
              </motion.button>
              {currentChannelData && !currentChannelData.is_department && (
                <motion.button
                  onClick={() => setShowDeleteConfirm(currentChannelData.id)}
                  className={`rounded-lg p-2 transition-colors ${
                    isDarkMode
                      ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                  title="Supprimer"
                  whileHover={{ scale: 1.1 }}
                >
                  <Trash2 className="h-4 w-4 lg:h-5 lg:w-5" />
                </motion.button>
              )}
            </div>
          </header>

          {/* ERROR / SEARCH */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mx-4 mt-3 flex items-center gap-2 rounded-lg p-3 text-sm ${
                  isDarkMode
                    ? 'border border-red-700 bg-red-900/30 text-red-400'
                    : 'border border-red-200 bg-red-50 text-red-700'
                }`}
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
                <button onClick={() => setError(null)} className="ml-auto">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ACTIVE CALL */}
          {activeCall ? (
            <div className="relative flex flex-1 flex-col overflow-hidden">
              <div
                ref={jitsiContainerRef}
                className="relative flex-1 overflow-hidden bg-gradient-to-br from-gray-900 via-slate-900 to-black"
              >
                <iframe
                  src={`${activeCall.jitsiUrl}#config.startWithAudioMuted=${activeCall.type === 'audio'}&config.startWithVideoMuted=${activeCall.type === 'audio'}&config.prejoinPageEnabled=false&interfaceConfig.TOOLBAR_BUTTONS=[]&interfaceConfig.FILM_STRIP_MAX_HEIGHT=0&config.disableDeepLinking=true`}
                  allow="camera; microphone; display-capture; autoplay; clipboard-write"
                  className={`h-full w-full border-0 transition-opacity duration-300 ${isScreenSharing ? 'absolute inset-0 opacity-0' : 'opacity-100'}`}
                  title={`Appel ${activeCall.type === 'video' ? 'vidéo' : 'vocal'}`}
                />
                {isScreenSharing && (
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full bg-black object-contain"
                  />
                )}

                {/* Call badges */}
                <div className="pointer-events-none absolute left-4 right-4 top-4 z-10 flex items-center justify-between">
                  <motion.span
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md"
                  >
                    {activeCall.type === 'video' ? (
                      <Video className="h-3.5 w-3.5" />
                    ) : (
                      <Phone className="h-3.5 w-3.5" />
                    )}
                    {activeCall.type === 'video' ? 'Appel vidéo' : 'Appel vocal'} en cours
                  </motion.span>
                  <AnimatePresence>
                    {isScreenSharing && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex animate-pulse items-center gap-1.5 rounded-full bg-emerald-500/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md"
                      >
                        <ScreenShare className="h-3.5 w-3.5" /> Partage écran
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {/* Muted/camera indicators */}
                <div className="absolute bottom-20 left-4 z-10 flex items-center gap-2">
                  <AnimatePresence>
                    {isMuted && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1 rounded-full bg-red-500/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md"
                      >
                        <MicOff className="h-3 w-3" /> Micro coupé
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {isCameraOff && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1 rounded-full bg-red-500/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md"
                      >
                        <VideoOff className="h-3 w-3" /> Caméra coupée
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Call controls */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-2xl border px-4 py-3 sm:gap-3 sm:px-6"
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                }}
              >
                <motion.button
                  onClick={handleToggleMute}
                  className={`rounded-full p-3 transition-all sm:p-4 ${isMuted ? 'bg-red-500/90 text-white hover:bg-red-600' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.92 }}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </motion.button>
                <motion.button
                  onClick={handleToggleCamera}
                  className={`rounded-full p-3 transition-all sm:p-4 ${isCameraOff ? 'bg-red-500/90 text-white hover:bg-red-600' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.92 }}
                >
                  {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </motion.button>
                <motion.button
                  onClick={handleToggleScreenShare}
                  className={`rounded-full p-3 transition-all sm:p-4 ${isScreenSharing ? 'bg-emerald-500/90 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.92 }}
                >
                  {isScreenSharing ? (
                    <ScreenShareOff className="h-5 w-5" />
                  ) : (
                    <MonitorUp className="h-5 w-5" />
                  )}
                </motion.button>
                <div
                  className="mx-1 h-8 w-px sm:h-10"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                />
                <motion.button
                  onClick={handleEndCall}
                  className="rounded-full bg-red-600 p-3 text-white shadow-lg shadow-red-600/40 hover:bg-red-700 sm:p-4"
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.92 }}
                >
                  <PhoneOff className="h-5 w-5" />
                </motion.button>
              </motion.div>
            </div>
          ) : (
            <>
              {/* MESSAGES */}
              <div
                className={`flex-1 space-y-4 overflow-y-auto p-4 transition-colors lg:p-6 ${
                  isDarkMode ? 'bg-slate-800' : 'bg-white'
                }`}
              >
                {groupedMessages.length === 0 ? (
                  <div
                    className={`flex h-full flex-col items-center justify-center ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}
                  >
                    <Hash className="mb-4 h-12 w-12 opacity-30" />
                    <p className="text-center">Aucun message pour l'instant</p>
                    <p className="mt-1 text-xs">Commencez la conversation !</p>
                  </div>
                ) : (
                  groupedMessages.map((group, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group flex gap-3"
                    >
                      <div className="flex-shrink-0 pt-1">
                        {group.sender_id === 'system-bot' ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-xs">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                            {getInitials(group.sender_name)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2 text-sm">
                          <span className="font-semibold">{group.sender_name}</span>
                          {group.sender_id === 'system-bot' && (
                            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                              BOT
                            </span>
                          )}
                          <span
                            className={`flex items-center gap-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}
                          >
                            <Clock className="h-3 w-3" />
                            {new Date(group.timestamp).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div className="mt-1 space-y-2">
                          {group.messages.map((msg) => {
                            const isSent = group.sender_id === currentUserId;
                            return (
                              <div
                                key={msg.id}
                                onMouseEnter={() => handleMarkAsRead(msg.id)}
                                className={`relative break-words rounded-lg p-3 text-sm leading-relaxed transition-colors ${
                                  msg.is_urgent
                                    ? 'border border-red-500/40 bg-red-500/20 text-red-100'
                                    : isSent
                                      ? 'ml-auto w-fit max-w-xs bg-indigo-600 text-white lg:max-w-md'
                                      : msg.type === 'bot'
                                        ? isDarkMode
                                          ? 'border border-amber-700/30 bg-amber-900/20 text-amber-100'
                                          : 'border border-amber-200 bg-amber-50 text-amber-900'
                                        : isDarkMode
                                          ? 'bg-slate-700 text-slate-100'
                                          : 'bg-gray-100 text-gray-900'
                                }`}
                              >
                                {/* Urgent badge */}
                                {msg.is_urgent && (
                                  <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-bold text-red-400">
                                    <AlertTriangle className="h-3 w-3" /> URGENT
                                  </span>
                                )}

                                {/* Edited indicator */}
                                {msg.edited_at && (
                                  <span className="ml-1 text-[10px] opacity-50">(édité)</span>
                                )}

                                {renderMessageContent(msg)}

                                {/* Reactions */}
                                {msg.reactions && msg.reactions.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {msg.reactions.map((reaction, i) => (
                                      <motion.button
                                        key={i}
                                        onClick={() => handleReactToMessage(msg.id, reaction.emoji)}
                                        className={`rounded-full px-2 py-0.5 text-xs transition-colors ${
                                          reaction.users.includes(currentUserId)
                                            ? 'border border-indigo-400/40 bg-indigo-500/30'
                                            : isDarkMode
                                              ? 'bg-slate-600/50 hover:bg-slate-600'
                                              : 'bg-gray-200/50 hover:bg-gray-200'
                                        }`}
                                        whileHover={{ scale: 1.1 }}
                                      >
                                        {reaction.emoji} {reaction.users.length}
                                      </motion.button>
                                    ))}
                                  </div>
                                )}

                                {/* Read receipt */}
                                {isSent && msg.read_by && msg.read_by.length > 1 && (
                                  <div className="mt-1 flex items-center gap-1 text-xs opacity-60">
                                    <CheckCheck className="h-3 w-3" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Hover actions */}
                        <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          {group.messages.map((msg) =>
                            group.sender_id === currentUserId ? (
                              <div key={msg.id} className="flex gap-1">
                                <motion.button
                                  onClick={() => {
                                    setEditingMessageId(msg.id);
                                    setMessageInput(msg.content);
                                  }}
                                  className={`rounded p-1 transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-200'}`}
                                  title="Éditer"
                                  whileHover={{ scale: 1.2 }}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </motion.button>
                                <motion.button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className={`rounded p-1 transition-colors ${isDarkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-700 hover:bg-red-100'}`}
                                  title="Supprimer"
                                  whileHover={{ scale: 1.2 }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </motion.button>
                                <motion.button
                                  onClick={() => handlePinMessage(msg.id)}
                                  className={`rounded p-1 transition-colors ${
                                    pinnedMessages.has(msg.id)
                                      ? 'bg-yellow-900/30 text-yellow-400'
                                      : isDarkMode
                                        ? 'text-slate-400 hover:bg-slate-700'
                                        : 'text-gray-600 hover:bg-gray-200'
                                  }`}
                                  title="Épingler"
                                  whileHover={{ scale: 1.2 }}
                                >
                                  <Pin className="h-3 w-3" />
                                </motion.button>
                              </div>
                            ) : (
                              <motion.button
                                key={msg.id}
                                onClick={() => handleReactToMessage(msg.id, '👍')}
                                className={`rounded p-1 transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-200'}`}
                                title="Réagir"
                                whileHover={{ scale: 1.2 }}
                              >
                                <Smile className="h-3 w-3" />
                              </motion.button>
                            )
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}

                {/* Typing indicator */}
                <AnimatePresence>
                  {typingUsers.filter((u) => u.userId !== currentUserId).length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex gap-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-400 text-xs font-bold text-white">
                        ✎
                      </div>
                      <div
                        className={`rounded-lg p-3 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}
                      >
                        <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                          {typingUsers
                            .filter((u) => u.userId !== currentUserId)
                            .map((u) => u.userName)
                            .join(', ')}{' '}
                          est en train d'écrire...
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </div>

              {/* INPUT AREA */}
              <div
                className={`flex-shrink-0 border-t p-3 transition-colors lg:p-4 ${
                  isDarkMode ? 'border-slate-600 bg-slate-700' : 'border-gray-200 bg-white'
                }`}
              >
                {/* File preview */}
                <AnimatePresence>
                  {(filePreview || selectedFile) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="mb-3 flex items-center gap-3"
                    >
                      {filePreview ? (
                        <img
                          src={filePreview}
                          alt="preview"
                          className="h-16 w-16 rounded-lg border border-indigo-300 object-cover"
                        />
                      ) : selectedFile ? (
                        <div
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                            isDarkMode
                              ? 'border border-slate-500 bg-slate-600 text-slate-200'
                              : 'border border-gray-200 bg-gray-100 text-gray-700'
                          }`}
                        >
                          <FileText className="h-4 w-4 text-red-400" />
                          <span className="max-w-[200px] truncate">{selectedFile.name}</span>
                        </div>
                      ) : null}
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setFilePreview(null);
                        }}
                        className="rounded bg-red-100 p-1 text-red-700 hover:bg-red-200"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Edit mode banner */}
                <AnimatePresence>
                  {editingMessageId && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-2 flex items-center justify-between rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-1.5 text-xs text-yellow-800"
                    >
                      <span>✏️ Édition en cours...</span>
                      <button
                        onClick={() => {
                          setEditingMessageId(null);
                          setMessageInput('');
                        }}
                        className="hover:text-yellow-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative flex items-end gap-2">
                  {/* Attach */}
                  <motion.button
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-shrink-0 rounded-lg p-2 transition-colors ${
                      isDarkMode
                        ? 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title="Fichier / Photo"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Paperclip className="h-5 w-5" />
                  </motion.button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                    onChange={handleFileChange}
                  />

                  {/* Location */}
                  <motion.button
                    onClick={handleShareLocation}
                    className={`hidden flex-shrink-0 rounded-lg p-2 transition-colors sm:flex ${
                      isDarkMode
                        ? 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title="Partager GPS"
                    whileHover={{ scale: 1.05 }}
                  >
                    <MapPin className="h-5 w-5" />
                  </motion.button>

                  {/* Urgent toggle */}
                  <motion.button
                    onClick={() => setIsUrgent(!isUrgent)}
                    className={`flex-shrink-0 rounded-lg p-2 transition-colors ${
                      isUrgent
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                        : isDarkMode
                          ? 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={isUrgent ? 'Message urgent activé' : 'Marquer urgent'}
                    whileHover={{ scale: 1.05 }}
                  >
                    <AlertTriangle className="h-5 w-5" />
                  </motion.button>

                  {/* Textarea with @mention dropdown */}
                  <div className="relative flex-1">
                    <textarea
                      ref={textareaRef}
                      value={messageInput}
                      onChange={handleTextareaChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Écrire un message... (@mention, Shift+Entrée pour nouvelle ligne)"
                      className={`w-full resize-none rounded-lg px-4 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDarkMode
                          ? 'border border-slate-500 bg-slate-600 text-white placeholder-slate-400'
                          : 'border border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-500'
                      }`}
                      rows={1}
                    />

                    {/* @Mention dropdown */}
                    <AnimatePresence>
                      {showMentionDropdown && mentionSuggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className={`absolute bottom-full left-0 right-0 z-50 mb-1 max-h-48 overflow-hidden overflow-y-auto rounded-lg border shadow-xl ${
                            isDarkMode
                              ? 'border-slate-600 bg-slate-700'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div
                            className={`border-b px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${
                              isDarkMode
                                ? 'bg-slate-750 border-slate-600 text-slate-400'
                                : 'border-gray-100 bg-gray-50 text-gray-500'
                            }`}
                          >
                            <AtSign className="mr-1 inline h-3 w-3" />
                            Mentionner
                          </div>
                          {mentionSuggestions.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => handleInsertMention(user)}
                              className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                                isDarkMode
                                  ? 'text-slate-200 hover:bg-slate-600'
                                  : 'text-gray-700 hover:bg-indigo-50'
                              }`}
                            >
                              <div className="relative flex-shrink-0">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white">
                                  {getInitials(user.name)}
                                </div>
                                <span
                                  className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ${getStatusColor(user.status)}`}
                                />
                              </div>
                              <div className="flex-1 text-left">
                                <span className="font-medium">{user.name}</span>
                                {user.department && (
                                  <span
                                    className={`ml-2 text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}
                                  >
                                    {user.department}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Emoji button */}
                  <div className="relative" ref={inputContainerRef}>
                    <motion.button
                      ref={smileyButtonRef}
                      onClick={() => {
                        if (!showEmojiPicker && smileyButtonRef.current) {
                          const rect = smileyButtonRef.current.getBoundingClientRect();
                          setEmojiPickerPos({
                            bottom: window.innerHeight - rect.top + 8,
                            left: Math.max(rect.left - 300 + rect.width, 16),
                          });
                        }
                        setShowEmojiPicker(!showEmojiPicker);
                      }}
                      className={`flex-shrink-0 rounded-lg p-2 transition-colors ${
                        showEmojiPicker
                          ? 'bg-indigo-600 text-white'
                          : isDarkMode
                            ? 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title="Emoji"
                      whileHover={{ scale: 1.05 }}
                    >
                      <Smile className="h-5 w-5" />
                    </motion.button>

                    <AnimatePresence>
                      {showEmojiPicker && (
                        <motion.div
                          ref={emojiPickerRef}
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className={`fixed rounded-xl border p-4 shadow-2xl transition-colors ${
                            isDarkMode
                              ? 'border-slate-600 bg-slate-700'
                              : 'border-gray-200 bg-white'
                          }`}
                          style={{
                            width: '320px',
                            maxHeight: '350px',
                            bottom: `${emojiPickerPos.bottom}px`,
                            left: `${emojiPickerPos.left}px`,
                            zIndex: 9999,
                          }}
                        >
                          <div className="space-y-3 overflow-y-auto" style={{ maxHeight: '300px' }}>
                            {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                              <div key={category}>
                                <h3
                                  className={`mb-2 pl-1 text-xs font-semibold uppercase tracking-wide ${
                                    isDarkMode ? 'text-slate-300' : 'text-gray-600'
                                  }`}
                                >
                                  {category}
                                </h3>
                                <div className="grid grid-cols-6 gap-1">
                                  {emojis.map((emoji) => (
                                    <motion.button
                                      key={emoji}
                                      onClick={() => insertEmoji(emoji)}
                                      className={`flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-lg transition-colors ${
                                        isDarkMode ? 'hover:bg-slate-600' : 'hover:bg-indigo-100'
                                      }`}
                                      whileHover={{ scale: 1.25 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      {emoji}
                                    </motion.button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Send */}
                  <motion.button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() && !selectedFile}
                    className="flex-shrink-0 rounded-lg bg-indigo-600 p-2 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    title={editingMessageId ? 'Modifier' : 'Envoyer'}
                    whileHover={{ scale: 1.05 }}
                  >
                    {editingMessageId ? (
                      <Edit2 className="h-5 w-5" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </motion.button>
                </div>
              </div>
            </>
          )}
        </main>
      ) : (
        /* Empty state */
        <div
          className={`flex flex-1 items-center justify-center transition-colors ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
        >
          {/* Mobile hamburger for empty state */}
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className={`absolute left-4 top-4 z-10 rounded-lg p-2 lg:hidden ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className={`text-center ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
            <MessageSquare className="mx-auto mb-4 h-16 w-16 opacity-30" />
            <p className="font-medium">Sélectionnez un canal ou un contact</p>
            <p className="mt-1 text-xs">pour commencer la conversation</p>
          </div>
        </div>
      )}

      {/* ====== LIGHTBOX ====== */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setLightboxUrl(null)}
          >
            <motion.button
              onClick={() => setLightboxUrl(null)}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </motion.button>
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              src={lightboxUrl}
              alt="Agrandissement"
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== INCOMING CALL ====== */}
      <AnimatePresence>
        {incomingCall && !activeCall && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed left-1/2 top-6 z-[10000] -translate-x-1/2"
          >
            <div
              className="w-96 max-w-[92vw] rounded-2xl border p-5"
              style={{
                background: isDarkMode ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.78)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.25)',
              }}
            >
              <div className="mb-5 flex items-center gap-4">
                <motion.div
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg shadow-green-500/30"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <span className="text-lg font-bold text-white">
                    {incomingCall.callerName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()}
                  </span>
                </motion.div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                  >
                    {incomingCall.callerName}
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {incomingCall.callType === 'video'
                      ? 'Appel vidéo entrant...'
                      : 'Appel vocal entrant...'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <motion.button
                  onClick={handleAcceptCall}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:from-green-600 hover:to-emerald-700"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <PhoneCall className="h-5 w-5" /> Accepter
                </motion.button>
                <motion.button
                  onClick={handleDeclineCall}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:from-red-600 hover:to-rose-700"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <PhoneOff className="h-5 w-5" /> Décliner
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== MODALS ====== */}

      {/* Create Channel */}
      <AnimatePresence>
        {showCreateChannelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md rounded-xl border p-6 shadow-2xl ${
                isDarkMode ? 'border-slate-600 bg-slate-700' : 'border-gray-200 bg-white'
              }`}
            >
              <h2
                className={`mb-4 text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
              >
                Créer un nouveau canal
              </h2>
              <input
                type="text"
                placeholder="Nom du canal"
                value={newChannelName}
                onChange={(e) =>
                  setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))
                }
                className={`mb-4 w-full rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDarkMode
                    ? 'border border-slate-500 bg-slate-600 text-white placeholder-slate-400'
                    : 'border border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-500'
                }`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateChannel();
                }}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <motion.button
                  onClick={() => {
                    setShowCreateChannelModal(false);
                    setNewChannelName('');
                  }}
                  className={`rounded-lg px-4 py-2 ${isDarkMode ? 'bg-slate-600 text-white hover:bg-slate-500' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                  whileHover={{ scale: 1.05 }}
                >
                  Annuler
                </motion.button>
                <motion.button
                  onClick={handleCreateChannel}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                  whileHover={{ scale: 1.05 }}
                >
                  Créer
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Channel Confirm */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md rounded-xl border p-6 shadow-2xl ${
                isDarkMode ? 'border-slate-600 bg-slate-700' : 'border-gray-200 bg-white'
              }`}
            >
              <h2
                className={`mb-2 text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
              >
                Supprimer ce canal ?
              </h2>
              <p className={`mb-6 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                Cette action est irréversible.
              </p>
              <div className="flex justify-end gap-2">
                <motion.button
                  onClick={() => setShowDeleteConfirm(null)}
                  className={`rounded-lg px-4 py-2 ${isDarkMode ? 'bg-slate-600 text-white hover:bg-slate-500' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                  whileHover={{ scale: 1.05 }}
                >
                  Annuler
                </motion.button>
                <motion.button
                  onClick={() => handleDeleteChannel(showDeleteConfirm)}
                  className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                  whileHover={{ scale: 1.05 }}
                >
                  Supprimer
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manage Members */}
      <AnimatePresence>
        {showManageMembersModal && currentChannelData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl border p-6 shadow-2xl ${
                isDarkMode ? 'border-slate-600 bg-slate-700' : 'border-gray-200 bg-white'
              }`}
            >
              <h2
                className={`mb-4 text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
              >
                Gérer les membres
              </h2>

              <div className="mb-6">
                <h3
                  className={`mb-3 text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}
                >
                  Membres actuels
                </h3>
                <div className="space-y-2">
                  {currentChannelData.members.map((memberId) => {
                    const member = availableUsers.find((u) => u.id === memberId);
                    return (
                      <div
                        key={memberId}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                          isDarkMode ? 'bg-slate-600' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                            {getInitials(member?.name || memberId)}
                          </div>
                          <span
                            className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                          >
                            {member?.name || memberId}
                          </span>
                          {memberId === currentUserId && (
                            <span className="text-xs text-indigo-500">(Vous)</span>
                          )}
                        </div>
                        {memberId !== currentUserId && (
                          <motion.button
                            onClick={() => handleRemoveMember(memberId)}
                            className="rounded p-1 text-red-600 hover:bg-red-100"
                            whileHover={{ scale: 1.1 }}
                          >
                            <X className="h-4 w-4" />
                          </motion.button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mb-6">
                <h3
                  className={`mb-3 text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}
                >
                  Ajouter un membre
                </h3>
                {!showAddMemberForm ? (
                  <motion.button
                    onClick={() => setShowAddMemberForm(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-100"
                    whileHover={{ scale: 1.02 }}
                  >
                    <Plus className="h-4 w-4" /> Ajouter
                  </motion.button>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={selectedUserToAdd || ''}
                      onChange={(e) => setSelectedUserToAdd(e.target.value)}
                      className={`w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDarkMode
                          ? 'border border-slate-500 bg-slate-600 text-white'
                          : 'border border-gray-300 bg-gray-50 text-gray-900'
                      }`}
                    >
                      <option value="">Sélectionner</option>
                      {availableUsers
                        .filter((u) => !currentChannelData.members.includes(u.id))
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                      <motion.button
                        onClick={handleAddMember}
                        disabled={!selectedUserToAdd}
                        className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
                        whileHover={{ scale: 1.02 }}
                      >
                        Ajouter
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          setShowAddMemberForm(false);
                          setSelectedUserToAdd(null);
                        }}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm ${isDarkMode ? 'bg-slate-600 text-white hover:bg-slate-500' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                        whileHover={{ scale: 1.02 }}
                      >
                        Annuler
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>

              <motion.button
                onClick={() => setShowManageMembersModal(false)}
                className={`w-full rounded-lg px-4 py-2 ${isDarkMode ? 'bg-slate-600 text-white hover:bg-slate-500' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                whileHover={{ scale: 1.02 }}
              >
                Fermer
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chat;
