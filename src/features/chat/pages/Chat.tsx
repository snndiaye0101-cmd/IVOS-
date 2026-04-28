import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Hash, Users, Plus, Trash2, Smile, Send, Video, VideoOff, Phone, PhoneCall,
  PhoneOff, Mic, MicOff, MonitorUp, ScreenShare, ScreenShareOff, MapPin, X,
  Paperclip, AlertCircle, Clock, Edit2, Pin, CheckCheck, Moon, Sun, Search,
  AlertTriangle, AtSign, FileText, Image as ImageIcon, ChevronDown, Menu,
  MessageSquare, Bot, Shield, Truck, Wrench, Building2, UserCheck, Bell, ZoomIn
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/shared/contexts/AuthContext";

// ============= TYPES =============

interface ChatUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  department?: string;
  status: "online" | "away" | "offline" | "en-operation";
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
  conversation_type: "channel" | "direct" | "thread";
  sender_id: string;
  sender_name: string;
  content: string;
  type: "text" | "image" | "file" | "location" | "bot";
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
  type: "audio" | "video";
  jitsiUrl: string;
}

interface IncomingCall {
  callerId: string;
  callerName: string;
  callType: "audio" | "video";
  roomName: string;
}

// ============= CONSTANTS =============

const EMOJI_CATEGORIES: Record<string, string[]> = {
  "Smileys": ["😀","😂","🤣","😊","😍","🥰","😎","🤩","😋","🤔","😴","🥱","😷","🤮","🤕","🫡"],
  "Gestes": ["👍","👎","👏","🙌","🤝","✌️","🤞","💪","🫶","🙏","👋","✋","🤙","👊"],
  "Transport": ["🚗","🚕","🚌","🚛","🚜","🏍️","🚀","✈️","🚢","🚂","🚲","⛽","🔧","🛞"],
  "Objets": ["📎","📁","📋","📊","📈","🔔","💡","⚙️","🔑","📱","💻","🖨️","📷","🎯"],
  "Alertes": ["⚠️","🚨","❌","✅","🔴","🟢","🟡","⏰","📢","🆘","🔥","💥","⛔","🚫"],
  "Nature": ["☀️","🌧️","❄️","🌪️","🌈","⭐","🌙","💧","🌍","🌿","🌸","🍃","🔥","💨"],
};

const DEPARTMENT_CHANNELS: Omit<Channel, "created_at">[] = [
  { id: "dept-logistique", name: "logistique", description: "Canal département Logistique", created_by: "system", members: [], is_archived: false, is_department: true, icon: "🚛" },
  { id: "dept-mecanique", name: "mecanique", description: "Canal département Mécanique", created_by: "system", members: [], is_archived: false, is_department: true, icon: "🔧" },
  { id: "dept-administration", name: "administration", description: "Canal département Administration", created_by: "system", members: [], is_archived: false, is_department: true, icon: "🏢" },
  { id: "dept-chauffeurs", name: "chauffeurs", description: "Canal département Chauffeurs", created_by: "system", members: [], is_archived: false, is_department: true, icon: "🚗" },
  { id: "dept-alertes", name: "alertes", description: "Notifications automatiques du système", created_by: "system", members: [], is_archived: false, is_department: true, icon: "🚨" },
];

const STORAGE_KEY = "ivos_chat_v3";

// ============= COMPONENT =============

const Chat: React.FC = () => {
  const authContext = useAuth();
  const currentUserId = authContext?.user?.id || "user-1";
  const currentUserName = authContext?.user?.fullName || "Utilisateur";
  const currentUserRole = (authContext?.user as any)?.role || "admin";

  // ---- State ----
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("ivos_chat_dark") === "true");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Conversations
  const [channels, setChannels] = useState<Channel[]>([]);
  const [availableUsers, setAvailableUsers] = useState<ChatUser[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  // Current conversation
  const [currentConversation, setCurrentConversation] = useState<{ id: string; type: "channel" | "direct" | "thread" } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [messageSearchTerm, setMessageSearchTerm] = useState("");

  // Message input
  const [messageInput, setMessageInput] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);

  // @mention
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);

  // Emoji
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerPos, setEmojiPickerPos] = useState({ bottom: 0, left: 0 });

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Modals
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
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
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const getStatusColor = (status: ChatUser["status"]) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "away": return "bg-yellow-500";
      case "en-operation": return "bg-blue-500";
      default: return "bg-gray-400";
    }
  };

  const getStatusLabel = (status: ChatUser["status"]) => {
    switch (status) {
      case "online": return "En ligne";
      case "away": return "Absent";
      case "en-operation": return "En opération";
      default: return "Hors ligne";
    }
  };

  const getDeptIcon = (name: string) => {
    switch (name) {
      case "logistique": return <Truck className="w-4 h-4" />;
      case "mecanique": return <Wrench className="w-4 h-4" />;
      case "administration": return <Building2 className="w-4 h-4" />;
      case "chauffeurs": return <UserCheck className="w-4 h-4" />;
      case "alertes": return <Bell className="w-4 h-4" />;
      default: return <Hash className="w-4 h-4" />;
    }
  };

  // ---- Persistence ----
  const saveToStorage = useCallback((ch: Channel[], msg: Message[], usr: ChatUser[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ channels: ch, messages: msg, users: usr }));
    } catch { /* quota exceeded — ignore */ }
  }, []);

  // ---- Init ----
  useEffect(() => {
    const timer = setTimeout(() => {
      let savedData: { channels?: Channel[]; messages?: Message[]; users?: ChatUser[] } = {};
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) savedData = JSON.parse(raw);
      } catch { /* ignore */ }

      // Mock users
      const defaultUsers: ChatUser[] = [
        { id: "user-1", name: "Alice Johnson", email: "alice@ivos.dz", role: "admin", department: "administration", status: "online" },
        { id: "user-2", name: "Bob Smith", email: "bob@ivos.dz", role: "chauffeur", department: "chauffeurs", status: "away" },
        { id: "user-3", name: "Carol Davis", email: "carol@ivos.dz", role: "mecanicien", department: "mecanique", status: "offline" },
        { id: "user-4", name: "David Martin", email: "david@ivos.dz", role: "logisticien", department: "logistique", status: "en-operation" },
        { id: "user-5", name: "Eva Leclerc", email: "eva@ivos.dz", role: "rh", department: "administration", status: "online" },
      ];
      const users = savedData.users?.length ? savedData.users : defaultUsers;

      // Department channels + saved custom channels
      const now = new Date().toISOString();
      const deptChannels: Channel[] = DEPARTMENT_CHANNELS.map((dc) => ({
        ...dc,
        created_at: now,
        members: users.map((u) => u.id),
      }));

      const savedCustomChannels = (savedData.channels || []).filter(
        (c) => !c.is_department
      );
      const allChannels = [...deptChannels, ...savedCustomChannels];

      // Default messages if none saved
      const defaultMessages: Message[] = [
        {
          id: "msg-1", conversation_id: "dept-logistique", conversation_type: "channel",
          sender_id: "user-4", sender_name: "David Martin",
          content: "Livraison site Oran terminée, retour prévu à 17h",
          type: "text", created_at: new Date(Date.now() - 3600000).toISOString(),
          reactions: [{ emoji: "👍", users: ["user-1"] }], is_pinned: false, read_by: ["user-4", "user-1"],
          is_deleted: false, is_urgent: false, mentions: [],
        },
        {
          id: "msg-2", conversation_id: "dept-mecanique", conversation_type: "channel",
          sender_id: "user-3", sender_name: "Carol Davis",
          content: "Véhicule 1234-ABC-16 : vidange + freins terminés ✅",
          type: "text", created_at: new Date(Date.now() - 1800000).toISOString(),
          reactions: [], is_pinned: false, read_by: ["user-3"],
          is_deleted: false, is_urgent: false, mentions: [],
        },
        {
          id: "msg-bot-1", conversation_id: "dept-alertes", conversation_type: "channel",
          sender_id: "system-bot", sender_name: "IVOS Bot",
          content: "⚠️ Visite technique expirée : Véhicule 5678-DEF-16 — Échéance dépassée de 3 jours",
          type: "bot", created_at: new Date(Date.now() - 900000).toISOString(),
          reactions: [], is_pinned: false, read_by: [],
          is_deleted: false, is_urgent: true, mentions: [],
        },
        {
          id: "msg-bot-2", conversation_id: "dept-alertes", conversation_type: "channel",
          sender_id: "system-bot", sender_name: "IVOS Bot",
          content: "🔴 Retard pointage : Bob Smith — Arrivée prévue 08:00, non pointé à 08:30",
          type: "bot", created_at: new Date(Date.now() - 600000).toISOString(),
          reactions: [], is_pinned: false, read_by: [],
          is_deleted: false, is_urgent: true, mentions: [],
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
    localStorage.setItem("ivos_chat_dark", String(isDarkMode));
  }, [isDarkMode]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentConversation]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node) &&
        smileyButtonRef.current && !smileyButtonRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ---- Derived ----
  const currentChannelData = useMemo(() => {
    if (!currentConversation || currentConversation.type !== "channel") return null;
    return channels.find((c) => c.id === currentConversation.id) || null;
  }, [currentConversation, channels]);

  const currentDmUser = useMemo(() => {
    if (!currentConversation || currentConversation.type !== "direct") return null;
    return availableUsers.find((u) => u.id === currentConversation.id) || null;
  }, [currentConversation, availableUsers]);

  const filteredChannels = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return channels.filter((c) => !c.is_archived && c.name.toLowerCase().includes(term));
  }, [channels, searchTerm]);

  const departmentChannels = useMemo(() => filteredChannels.filter((c) => c.is_department), [filteredChannels]);
  const customChannels = useMemo(() => filteredChannels.filter((c) => !c.is_department), [filteredChannels]);

  const currentMessages = useMemo(() => {
    if (!currentConversation) return [];
    return messages.filter((m) => {
      if (m.is_deleted) return false;
      if (currentConversation.type === "direct") {
        return (
          m.conversation_type === "direct" &&
          ((m.sender_id === currentUserId && m.conversation_id === currentConversation.id) ||
            (m.sender_id === currentConversation.id && m.conversation_id === currentUserId))
        );
      }
      return m.conversation_id === currentConversation.id && m.conversation_type === currentConversation.type;
    });
  }, [messages, currentConversation, currentUserId]);

  const groupedMessages = useMemo((): GroupedMessage[] => {
    const groups: GroupedMessage[] = [];
    let current: GroupedMessage | null = null;
    const sorted = [...currentMessages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (const msg of sorted) {
      if (!current || current.sender_id !== msg.sender_id || new Date(msg.created_at).getTime() - new Date(current.timestamp).getTime() > 300000) {
        current = { sender_id: msg.sender_id, sender_name: msg.sender_name, timestamp: msg.created_at, messages: [msg] };
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
    return availableUsers.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
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

  const handleSelectConversation = useCallback((id: string, type: "channel" | "direct" | "thread") => {
    setCurrentConversation({ id, type });
    setEditingMessageId(null);
    setMessageInput("");
    setSelectedFile(null);
    setFilePreview(null);
    setIsUrgent(false);
    setShowMentionDropdown(false);
    setIsMobileSidebarOpen(false);
  }, []);

  const handleCreateChannel = useCallback(() => {
    if (!newChannelName.trim()) return;
    const newChannel: Channel = {
      id: `ch-${Date.now()}`,
      name: newChannelName.trim().toLowerCase().replace(/\s+/g, "-"),
      description: "",
      created_by: currentUserId,
      created_at: new Date().toISOString(),
      members: [currentUserId],
      is_archived: false,
      is_department: false,
    };
    setChannels((prev) => [...prev, newChannel]);
    setNewChannelName("");
    setShowCreateChannelModal(false);
    handleSelectConversation(newChannel.id, "channel");
  }, [newChannelName, currentUserId, handleSelectConversation]);

  const handleDeleteChannel = useCallback((channelId: string) => {
    const ch = channels.find((c) => c.id === channelId);
    if (ch?.is_department) {
      setError("Impossible de supprimer un canal département");
      setShowDeleteConfirm(null);
      return;
    }
    setChannels((prev) => prev.filter((c) => c.id !== channelId));
    setMessages((prev) => prev.filter((m) => m.conversation_id !== channelId));
    if (currentConversation?.id === channelId) setCurrentConversation(null);
    setShowDeleteConfirm(null);
  }, [channels, currentConversation]);

  const handleAddMember = useCallback(() => {
    if (!selectedUserToAdd || !currentChannelData) return;
    setChannels((prev) =>
      prev.map((c) =>
        c.id === currentChannelData.id
          ? { ...c, members: [...c.members, selectedUserToAdd] }
          : c
      )
    );
    setSelectedUserToAdd(null);
    setShowAddMemberForm(false);
  }, [selectedUserToAdd, currentChannelData]);

  const handleRemoveMember = useCallback((memberId: string) => {
    if (!currentChannelData) return;
    setChannels((prev) =>
      prev.map((c) =>
        c.id === currentChannelData.id
          ? { ...c, members: c.members.filter((m) => m !== memberId) }
          : c
      )
    );
  }, [currentChannelData]);

  // ---- Message Actions ----

  const extractMentions = (text: string): string[] => {
    const regex = /@(\w+(?:\s\w+)?)/g;
    const mentions: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      const name = match[1];
      const user = availableUsers.find((u) => u.name.toLowerCase().replace(/\s+/g, " ").startsWith(name.toLowerCase()));
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
          m.id === editingMessageId
            ? { ...m, content: messageInput, edited_at: now, mentions }
            : m
        )
      );
      setEditingMessageId(null);
    } else {
      let msgType: Message["type"] = "text";
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      let fileType: string | undefined;

      if (selectedFile) {
        const isImage = selectedFile.type.startsWith("image/");
        msgType = isImage ? "image" : "file";
        fileUrl = filePreview || URL.createObjectURL(selectedFile);
        fileName = selectedFile.name;
        fileType = selectedFile.type;
      }

      const newMsg: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        conversation_id: currentConversation.type === "direct" ? currentConversation.id : currentConversation.id,
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

    setMessageInput("");
    setSelectedFile(null);
    setFilePreview(null);
    setIsUrgent(false);
    setShowMentionDropdown(false);
  }, [messageInput, selectedFile, filePreview, currentConversation, currentUserId, currentUserName, editingMessageId, isUrgent, availableUsers]);

  const handleDeleteMessage = useCallback((msgId: string) => {
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, is_deleted: true } : m)));
  }, []);

  const handlePinMessage = useCallback((msgId: string) => {
    setPinnedMessages((prev) => {
      const next = new Set(prev);
      next.has(msgId) ? next.delete(msgId) : next.add(msgId);
      return next;
    });
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, is_pinned: !m.is_pinned } : m)));
  }, []);

  const handleReactToMessage = useCallback((msgId: string, emoji: string) => {
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
  }, [currentUserId]);

  const handleMarkAsRead = useCallback((msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && !m.read_by.includes(currentUserId)
          ? { ...m, read_by: [...m.read_by, currentUserId] }
          : m
      )
    );
  }, [currentUserId]);

  // ---- File handling ----

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 10 MB limit
    if (file.size > 10 * 1024 * 1024) {
      setError("Fichier trop volumineux (max 10 Mo)");
      return;
    }
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else if (file.type === "application/pdf") {
      setFilePreview(null); // PDF shown by name
    } else {
      setFilePreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
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
      setMentionQuery("");
      setMentionStartIndex(-1);
    }

    // Typing indicator (mock)
    // In production: emit via websocket
  }, []);

  const handleInsertMention = useCallback((user: ChatUser) => {
    const before = messageInput.slice(0, mentionStartIndex);
    const after = messageInput.slice(textareaRef.current?.selectionStart || messageInput.length);
    setMessageInput(`${before}@${user.name} ${after}`);
    setShowMentionDropdown(false);
    setMentionQuery("");
    setMentionStartIndex(-1);
    textareaRef.current?.focus();
  }, [messageInput, mentionStartIndex]);

  // ---- Location ----

  const handleShareLocation = useCallback(() => {
    if (!currentConversation) return;
    if (!navigator.geolocation) {
      setError("Géolocalisation non supportée");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newMsg: Message = {
          id: `msg-${Date.now()}`,
          conversation_id: currentConversation.type === "direct" ? currentConversation.id : currentConversation.id,
          conversation_type: currentConversation.type,
          sender_id: currentUserId,
          sender_name: currentUserName,
          content: `📍 Position: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`,
          type: "location",
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

  const handleStartCall = useCallback((type: "audio" | "video") => {
    if (activeCall) return;
    const room = `ivos-${currentConversation?.id || "lobby"}-${Date.now()}`;
    setActiveCall({
      roomName: room,
      type,
      jitsiUrl: `https://meet.jit.si/${room}`,
    });
  }, [activeCall, currentConversation]);

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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (showMentionDropdown && mentionSuggestions.length > 0) {
        handleInsertMention(mentionSuggestions[0]);
      } else {
        handleSendMessage();
      }
    }
    if (e.key === "Escape") {
      setShowMentionDropdown(false);
      if (editingMessageId) {
        setEditingMessageId(null);
        setMessageInput("");
      }
    }
  }, [showMentionDropdown, mentionSuggestions, handleInsertMention, handleSendMessage, editingMessageId]);

  // ---- Render helpers ----

  const renderMessageContent = (msg: Message) => {
    // Render @mentions in bold
    const renderTextWithMentions = (text: string) => {
      const parts = text.split(/(@\w+(?:\s\w+)?)/g);
      return parts.map((part, i) => {
        if (part.startsWith("@")) {
          return (
            <span key={i} className="font-semibold text-indigo-400 bg-indigo-500/20 px-1 rounded">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      });
    };

    switch (msg.type) {
      case "text":
        return <p className="whitespace-pre-wrap">{renderTextWithMentions(msg.content)}</p>;
      case "bot":
        return (
          <div className="flex items-start gap-2">
            <Bot className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        );
      case "image":
        return (
          <div>
            {msg.content && <p className="mb-2 whitespace-pre-wrap">{renderTextWithMentions(msg.content)}</p>}
            {msg.file_url && (
              <button onClick={() => setLightboxUrl(msg.file_url!)} className="block">
                <img
                  src={msg.file_url}
                  alt={msg.file_name || "image"}
                  className="max-w-xs max-h-48 rounded-lg border border-white/20 cursor-pointer hover:opacity-90 transition-opacity"
                />
                <span className="flex items-center gap-1 text-xs mt-1 opacity-60">
                  <ZoomIn className="w-3 h-3" /> Cliquer pour agrandir
                </span>
              </button>
            )}
          </div>
        );
      case "file":
        return (
          <div>
            {msg.content && <p className="mb-2 whitespace-pre-wrap">{renderTextWithMentions(msg.content)}</p>}
            <div className="px-3 py-2 rounded inline-flex items-center gap-2 text-sm bg-white/10 border border-white/20">
              {msg.file_type === "application/pdf" ? (
                <FileText className="w-4 h-4 flex-shrink-0 text-red-400" />
              ) : (
                <Paperclip className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="truncate max-w-[200px]">{msg.file_name}</span>
            </div>
          </div>
        );
      case "location":
        return (
          <div className="px-3 py-2 rounded inline-flex items-center gap-2 text-sm bg-white/10 border border-white/20">
            <MapPin className="w-4 h-4 flex-shrink-0 text-blue-400" />
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
      <div className="h-[calc(100vh-64px)] flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // ============= MAIN RENDER =============

  return (
    <div className={`h-[calc(100vh-64px)] flex relative overflow-hidden transition-colors ${
      isDarkMode ? "bg-slate-900 text-white" : "bg-gray-50 text-gray-900"
    }`}>

      {/* MOBILE OVERLAY */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ====== SIDEBAR ====== */}
      <aside className={`
        ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 fixed lg:relative z-40 lg:z-auto
        w-80 h-full flex flex-col border-r flex-shrink-0 transition-all duration-300
        ${isDarkMode
          ? "bg-slate-900 border-slate-700"
          : "bg-white border-gray-200"
        }
      `}>
        {/* Sidebar Header */}
        <div className={`p-4 border-b flex-shrink-0 ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-500" />
              Chat IVOS
            </h2>
            <div className="flex items-center gap-1">
              <motion.button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDarkMode ? "hover:bg-slate-700 text-yellow-400" : "hover:bg-gray-100 text-blue-600"
                }`}
                whileHover={{ scale: 1.1 }}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </motion.button>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 lg:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
              isDarkMode ? "text-slate-500" : "text-gray-400"
            }`} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm transition-colors ${
                isDarkMode
                  ? "bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:border-indigo-500"
                  : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-500"
              } focus:outline-none focus:ring-1 focus:ring-indigo-500`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {/* Department Channels */}
          <div>
            <div className={`flex items-center justify-between px-2 mb-1 ${
              isDarkMode ? "text-slate-400" : "text-gray-500"
            }`}>
              <span className="text-xs font-semibold uppercase tracking-wider">Départements</span>
              <Shield className="w-3 h-3" />
            </div>
            {departmentChannels.map((ch) => {
              const isActive = currentConversation?.id === ch.id;
              const unread = unreadCounts[ch.id] || 0;
              return (
                <motion.button
                  key={ch.id}
                  onClick={() => handleSelectConversation(ch.id, "channel")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                    isActive
                      ? isDarkMode ? "bg-indigo-600/30 text-indigo-300" : "bg-indigo-50 text-indigo-700"
                      : isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-700"
                  }`}
                  whileHover={{ x: 2 }}
                >
                  <span className={`flex-shrink-0 ${isActive ? "text-indigo-400" : isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                    {getDeptIcon(ch.name)}
                  </span>
                  <span className="truncate font-medium">#{ch.name}</span>
                  {unread > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                      {unread}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Custom Channels */}
          <div>
            <div className={`flex items-center justify-between px-2 mb-1 ${
              isDarkMode ? "text-slate-400" : "text-gray-500"
            }`}>
              <span className="text-xs font-semibold uppercase tracking-wider">Canaux</span>
              <motion.button
                onClick={() => setShowCreateChannelModal(true)}
                className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                whileHover={{ scale: 1.2 }}
              >
                <Plus className="w-3.5 h-3.5" />
              </motion.button>
            </div>
            {customChannels.length === 0 ? (
              <p className={`px-3 py-2 text-xs italic ${isDarkMode ? "text-slate-600" : "text-gray-400"}`}>
                Aucun canal personnalisé
              </p>
            ) : (
              customChannels.map((ch) => {
                const isActive = currentConversation?.id === ch.id;
                const unread = unreadCounts[ch.id] || 0;
                return (
                  <motion.button
                    key={ch.id}
                    onClick={() => handleSelectConversation(ch.id, "channel")}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                      isActive
                        ? isDarkMode ? "bg-indigo-600/30 text-indigo-300" : "bg-indigo-50 text-indigo-700"
                        : isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-700"
                    }`}
                    whileHover={{ x: 2 }}
                  >
                    <Hash className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-indigo-400" : isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
                    <span className="truncate font-medium">#{ch.name}</span>
                    {unread > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
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
            <div className={`px-2 mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
              <span className="text-xs font-semibold uppercase tracking-wider">Messages directs</span>
            </div>
            {availableUsers
              .filter((u) => u.id !== currentUserId)
              .map((user) => {
                const isActive = currentConversation?.id === user.id && currentConversation.type === "direct";
                const unread = unreadCounts[user.id] || 0;
                return (
                  <motion.button
                    key={user.id}
                    onClick={() => handleSelectConversation(user.id, "direct")}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                      isActive
                        ? isDarkMode ? "bg-indigo-600/30 text-indigo-300" : "bg-indigo-50 text-indigo-700"
                        : isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-700"
                    }`}
                    whileHover={{ x: 2 }}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                        {getInitials(user.name)}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                        isDarkMode ? "border-slate-900" : "border-white"
                      } ${getStatusColor(user.status)}`} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <span className="block truncate font-medium">{user.name}</span>
                      {user.status === "en-operation" && (
                        <span className="text-[10px] text-blue-400 flex items-center gap-0.5">
                          <Truck className="w-2.5 h-2.5" /> En opération
                        </span>
                      )}
                    </div>
                    {unread > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                        {unread}
                      </span>
                    )}
                  </motion.button>
                );
              })}
          </div>
        </div>

        {/* Current user */}
        <div className={`p-3 border-t flex items-center gap-2 flex-shrink-0 ${
          isDarkMode ? "border-slate-700 bg-slate-900/50" : "border-gray-200 bg-gray-50"
        }`}>
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
              {getInitials(currentUserName)}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white dark:border-slate-900" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>{currentUserName}</p>
            <p className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>En ligne</p>
          </div>
        </div>
      </aside>

      {/* ====== CHAT AREA ====== */}
      {currentConversation && (currentChannelData || currentDmUser) ? (
        <main className={`flex-1 flex flex-col overflow-hidden transition-colors ${
          isDarkMode ? "bg-slate-800" : "bg-white"
        }`}>
          {/* HEADER */}
          <header className={`flex items-center justify-between px-4 lg:px-6 py-3 border-b flex-shrink-0 gap-3 transition-colors ${
            isDarkMode ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"
          }`}>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Mobile hamburger */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className={`p-1.5 rounded-lg lg:hidden ${isDarkMode ? "hover:bg-slate-600 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`}
              >
                <Menu className="w-5 h-5" />
              </button>

              {currentDmUser ? (
                <>
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white">
                      {getInitials(currentDmUser.name)}
                    </div>
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 ${
                      isDarkMode ? "border-slate-700" : "border-white"
                    } ${getStatusColor(currentDmUser.status)}`} />
                  </div>
                  <div className="min-w-0">
                    <h1 className={`font-bold text-base lg:text-lg truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>{currentDmUser.name}</h1>
                    <p className={`text-xs flex items-center gap-1 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(currentDmUser.status)}`} />
                      {getStatusLabel(currentDmUser.status)}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <span className="flex-shrink-0 text-indigo-500">
                    {currentChannelData!.is_department ? getDeptIcon(currentChannelData!.name) : <Hash className="w-5 h-5" />}
                  </span>
                  <div className="min-w-0">
                    <h1 className={`font-bold text-base lg:text-lg truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      #{currentChannelData!.name}
                    </h1>
                    <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                      {currentChannelData!.members.length} membre{currentChannelData!.members.length !== 1 ? "s" : ""}
                      {currentChannelData!.is_department && " · Département"}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {currentChannelData && (
                <motion.button
                  onClick={() => setShowManageMembersModal(true)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode ? "bg-slate-600 hover:bg-slate-500 text-slate-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                  title="Membres"
                  whileHover={{ scale: 1.1 }}
                >
                  <Users className="w-4 h-4 lg:w-5 lg:h-5" />
                </motion.button>
              )}
              <motion.button
                onClick={() => handleStartCall("video")}
                disabled={!!activeCall}
                className={`p-2 rounded-lg transition-colors hidden sm:flex ${
                  activeCall
                    ? "opacity-50 cursor-not-allowed bg-gray-200 text-gray-400"
                    : isDarkMode ? "bg-slate-600 hover:bg-slate-500 text-slate-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
                title="Appel vidéo"
                whileHover={activeCall ? {} : { scale: 1.1 }}
              >
                <Video className="w-4 h-4 lg:w-5 lg:h-5" />
              </motion.button>
              <motion.button
                onClick={() => handleStartCall("audio")}
                disabled={!!activeCall}
                className={`p-2 rounded-lg transition-colors hidden sm:flex ${
                  activeCall
                    ? "opacity-50 cursor-not-allowed bg-gray-200 text-gray-400"
                    : isDarkMode ? "bg-green-900/30 hover:bg-green-900/50 text-green-400" : "bg-green-50 hover:bg-green-100 text-green-700"
                }`}
                title="Appel vocal"
                whileHover={activeCall ? {} : { scale: 1.1 }}
              >
                <Phone className="w-4 h-4 lg:w-5 lg:h-5" />
              </motion.button>
              {currentChannelData && !currentChannelData.is_department && (
                <motion.button
                  onClick={() => setShowDeleteConfirm(currentChannelData.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode ? "bg-red-900/30 hover:bg-red-900/50 text-red-400" : "bg-red-50 hover:bg-red-100 text-red-700"
                  }`}
                  title="Supprimer"
                  whileHover={{ scale: 1.1 }}
                >
                  <Trash2 className="w-4 h-4 lg:w-5 lg:h-5" />
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
                className={`mx-4 mt-3 p-3 rounded-lg flex items-center gap-2 text-sm ${
                  isDarkMode ? "bg-red-900/30 border border-red-700 text-red-400" : "bg-red-50 border border-red-200 text-red-700"
                }`}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
                <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ACTIVE CALL */}
          {activeCall ? (
            <div className="flex-1 flex flex-col overflow-hidden relative">
              <div ref={jitsiContainerRef} className="flex-1 relative bg-gradient-to-br from-gray-900 via-slate-900 to-black overflow-hidden">
                <iframe
                  src={`${activeCall.jitsiUrl}#config.startWithAudioMuted=${activeCall.type === "audio"}&config.startWithVideoMuted=${activeCall.type === "audio"}&config.prejoinPageEnabled=false&interfaceConfig.TOOLBAR_BUTTONS=[]&interfaceConfig.FILM_STRIP_MAX_HEIGHT=0&config.disableDeepLinking=true`}
                  allow="camera; microphone; display-capture; autoplay; clipboard-write"
                  className={`w-full h-full border-0 transition-opacity duration-300 ${isScreenSharing ? "opacity-0 absolute inset-0" : "opacity-100"}`}
                  title={`Appel ${activeCall.type === "video" ? "vidéo" : "vocal"}`}
                />
                {isScreenSharing && (
                  <video ref={screenVideoRef} autoPlay playsInline muted className="w-full h-full object-contain bg-black" />
                )}

                {/* Call badges */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
                  <motion.span
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-3 py-1.5 rounded-full bg-black/50 text-white text-xs font-medium flex items-center gap-1.5 backdrop-blur-md border border-white/10"
                  >
                    {activeCall.type === "video" ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                    {activeCall.type === "video" ? "Appel vidéo" : "Appel vocal"} en cours
                  </motion.span>
                  <AnimatePresence>
                    {isScreenSharing && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="px-3 py-1.5 rounded-full bg-emerald-500/80 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md animate-pulse"
                      >
                        <ScreenShare className="w-3.5 h-3.5" /> Partage écran
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {/* Muted/camera indicators */}
                <div className="absolute bottom-20 left-4 flex items-center gap-2 z-10">
                  <AnimatePresence>
                    {isMuted && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="px-2.5 py-1 rounded-full bg-red-500/70 text-white text-[11px] font-medium flex items-center gap-1 backdrop-blur-md">
                        <MicOff className="w-3 h-3" /> Micro coupé
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {isCameraOff && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="px-2.5 py-1 rounded-full bg-red-500/70 text-white text-[11px] font-medium flex items-center gap-1 backdrop-blur-md">
                        <VideoOff className="w-3 h-3" /> Caméra coupée
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Call controls */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 rounded-2xl border"
                style={{
                  background: "rgba(15, 23, 42, 0.65)",
                  backdropFilter: "blur(20px) saturate(180%)",
                  WebkitBackdropFilter: "blur(20px) saturate(180%)",
                  borderColor: "rgba(255, 255, 255, 0.12)",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
                }}
              >
                <motion.button onClick={handleToggleMute}
                  className={`p-3 sm:p-4 rounded-full transition-all ${isMuted ? "bg-red-500/90 hover:bg-red-600 text-white" : "bg-white/10 hover:bg-white/20 text-white"}`}
                  whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.92 }}>
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </motion.button>
                <motion.button onClick={handleToggleCamera}
                  className={`p-3 sm:p-4 rounded-full transition-all ${isCameraOff ? "bg-red-500/90 hover:bg-red-600 text-white" : "bg-white/10 hover:bg-white/20 text-white"}`}
                  whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.92 }}>
                  {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </motion.button>
                <motion.button onClick={handleToggleScreenShare}
                  className={`p-3 sm:p-4 rounded-full transition-all ${isScreenSharing ? "bg-emerald-500/90 text-white" : "bg-white/10 hover:bg-white/20 text-white"}`}
                  whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.92 }}>
                  {isScreenSharing ? <ScreenShareOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
                </motion.button>
                <div className="w-px h-8 sm:h-10 mx-1" style={{ background: "rgba(255,255,255,0.15)" }} />
                <motion.button onClick={handleEndCall}
                  className="p-3 sm:p-4 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/40"
                  whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.92 }}>
                  <PhoneOff className="w-5 h-5" />
                </motion.button>
              </motion.div>
            </div>
          ) : (
            <>
              {/* MESSAGES */}
              <div className={`flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 transition-colors ${
                isDarkMode ? "bg-slate-800" : "bg-white"
              }`}>
                {groupedMessages.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center h-full ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                    <Hash className="w-12 h-12 mb-4 opacity-30" />
                    <p className="text-center">Aucun message pour l'instant</p>
                    <p className="text-xs mt-1">Commencez la conversation !</p>
                  </div>
                ) : (
                  groupedMessages.map((group, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 group">
                      <div className="flex-shrink-0 pt-1">
                        {group.sender_id === "system-bot" ? (
                          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-xs">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                            {getInitials(group.sender_name)}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 text-sm flex-wrap">
                          <span className="font-semibold">{group.sender_name}</span>
                          {group.sender_id === "system-bot" && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-full font-medium">BOT</span>
                          )}
                          <span className={`text-xs flex items-center gap-1 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                            <Clock className="w-3 h-3" />
                            {new Date(group.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <div className="space-y-2 mt-1">
                          {group.messages.map((msg) => {
                            const isSent = group.sender_id === currentUserId;
                            return (
                              <div
                                key={msg.id}
                                onMouseEnter={() => handleMarkAsRead(msg.id)}
                                className={`break-words leading-relaxed text-sm rounded-lg p-3 transition-colors relative ${
                                  msg.is_urgent
                                    ? "bg-red-500/20 border border-red-500/40 text-red-100"
                                    : isSent
                                    ? "bg-indigo-600 text-white ml-auto w-fit max-w-xs lg:max-w-md"
                                    : msg.type === "bot"
                                    ? isDarkMode
                                      ? "bg-amber-900/20 border border-amber-700/30 text-amber-100"
                                      : "bg-amber-50 border border-amber-200 text-amber-900"
                                    : isDarkMode
                                    ? "bg-slate-700 text-slate-100"
                                    : "bg-gray-100 text-gray-900"
                                }`}
                              >
                                {/* Urgent badge */}
                                {msg.is_urgent && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 mb-1">
                                    <AlertTriangle className="w-3 h-3" /> URGENT
                                  </span>
                                )}

                                {/* Edited indicator */}
                                {msg.edited_at && (
                                  <span className="text-[10px] opacity-50 ml-1">(édité)</span>
                                )}

                                {renderMessageContent(msg)}

                                {/* Reactions */}
                                {msg.reactions && msg.reactions.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {msg.reactions.map((reaction, i) => (
                                      <motion.button
                                        key={i}
                                        onClick={() => handleReactToMessage(msg.id, reaction.emoji)}
                                        className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                                          reaction.users.includes(currentUserId)
                                            ? "bg-indigo-500/30 border border-indigo-400/40"
                                            : isDarkMode ? "bg-slate-600/50 hover:bg-slate-600" : "bg-gray-200/50 hover:bg-gray-200"
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
                                  <div className="flex items-center gap-1 mt-1 text-xs opacity-60">
                                    <CheckCheck className="w-3 h-3" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Hover actions */}
                        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {group.messages.map((msg) =>
                            group.sender_id === currentUserId ? (
                              <div key={msg.id} className="flex gap-1">
                                <motion.button
                                  onClick={() => { setEditingMessageId(msg.id); setMessageInput(msg.content); }}
                                  className={`p-1 rounded transition-colors ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-600"}`}
                                  title="Éditer" whileHover={{ scale: 1.2 }}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </motion.button>
                                <motion.button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className={`p-1 rounded transition-colors ${isDarkMode ? "hover:bg-red-900/30 text-red-400" : "hover:bg-red-100 text-red-700"}`}
                                  title="Supprimer" whileHover={{ scale: 1.2 }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </motion.button>
                                <motion.button
                                  onClick={() => handlePinMessage(msg.id)}
                                  className={`p-1 rounded transition-colors ${
                                    pinnedMessages.has(msg.id)
                                      ? "bg-yellow-900/30 text-yellow-400"
                                      : isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-600"
                                  }`}
                                  title="Épingler" whileHover={{ scale: 1.2 }}
                                >
                                  <Pin className="w-3 h-3" />
                                </motion.button>
                              </div>
                            ) : (
                              <motion.button
                                key={msg.id}
                                onClick={() => handleReactToMessage(msg.id, "👍")}
                                className={`p-1 rounded transition-colors ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-600"}`}
                                title="Réagir" whileHover={{ scale: 1.2 }}
                              >
                                <Smile className="w-3 h-3" />
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
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-xs font-bold text-white">✎</div>
                      <div className={`p-3 rounded-lg ${isDarkMode ? "bg-slate-700" : "bg-gray-100"}`}>
                        <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>
                          {typingUsers.filter((u) => u.userId !== currentUserId).map((u) => u.userName).join(", ")} est en train d'écrire...
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </div>

              {/* INPUT AREA */}
              <div className={`border-t p-3 lg:p-4 flex-shrink-0 transition-colors ${
                isDarkMode ? "border-slate-600 bg-slate-700" : "border-gray-200 bg-white"
              }`}>
                {/* File preview */}
                <AnimatePresence>
                  {(filePreview || selectedFile) && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mb-3 flex items-center gap-3">
                      {filePreview ? (
                        <img src={filePreview} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-indigo-300" />
                      ) : selectedFile ? (
                        <div className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm ${
                          isDarkMode ? "bg-slate-600 border border-slate-500 text-slate-200" : "bg-gray-100 border border-gray-200 text-gray-700"
                        }`}>
                          <FileText className="w-4 h-4 text-red-400" />
                          <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                        </div>
                      ) : null}
                      <button
                        onClick={() => { setSelectedFile(null); setFilePreview(null); }}
                        className="p-1 rounded bg-red-100 hover:bg-red-200 text-red-700"
                      >
                        <X className="w-4 h-4" />
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
                      className="mb-2 bg-yellow-100 border border-yellow-300 px-3 py-1.5 rounded-lg text-xs text-yellow-800 flex items-center justify-between"
                    >
                      <span>✏️ Édition en cours...</span>
                      <button onClick={() => { setEditingMessageId(null); setMessageInput(""); }} className="hover:text-yellow-900">
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-end gap-2 relative">
                  {/* Attach */}
                  <motion.button
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 rounded-lg flex-shrink-0 transition-colors ${
                      isDarkMode ? "bg-slate-600 hover:bg-slate-500 text-slate-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                    title="Fichier / Photo"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Paperclip className="w-5 h-5" />
                  </motion.button>
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={handleFileChange} />

                  {/* Location */}
                  <motion.button
                    onClick={handleShareLocation}
                    className={`p-2 rounded-lg flex-shrink-0 transition-colors hidden sm:flex ${
                      isDarkMode ? "bg-slate-600 hover:bg-slate-500 text-slate-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                    title="Partager GPS"
                    whileHover={{ scale: 1.05 }}
                  >
                    <MapPin className="w-5 h-5" />
                  </motion.button>

                  {/* Urgent toggle */}
                  <motion.button
                    onClick={() => setIsUrgent(!isUrgent)}
                    className={`p-2 rounded-lg flex-shrink-0 transition-colors ${
                      isUrgent
                        ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                        : isDarkMode ? "bg-slate-600 hover:bg-slate-500 text-slate-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                    title={isUrgent ? "Message urgent activé" : "Marquer urgent"}
                    whileHover={{ scale: 1.05 }}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </motion.button>

                  {/* Textarea with @mention dropdown */}
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={messageInput}
                      onChange={handleTextareaChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Écrire un message... (@mention, Shift+Entrée pour nouvelle ligne)"
                      className={`w-full rounded-lg px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                        isDarkMode
                          ? "bg-slate-600 border border-slate-500 text-white placeholder-slate-400"
                          : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500"
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
                          className={`absolute bottom-full left-0 right-0 mb-1 rounded-lg shadow-xl border overflow-hidden z-50 max-h-48 overflow-y-auto ${
                            isDarkMode ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"
                          }`}
                        >
                          <div className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider border-b ${
                            isDarkMode ? "text-slate-400 border-slate-600 bg-slate-750" : "text-gray-500 border-gray-100 bg-gray-50"
                          }`}>
                            <AtSign className="w-3 h-3 inline mr-1" />
                            Mentionner
                          </div>
                          {mentionSuggestions.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => handleInsertMention(user)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                                isDarkMode ? "hover:bg-slate-600 text-slate-200" : "hover:bg-indigo-50 text-gray-700"
                              }`}
                            >
                              <div className="relative flex-shrink-0">
                                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] font-bold text-white">
                                  {getInitials(user.name)}
                                </div>
                                <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${getStatusColor(user.status)}`} />
                              </div>
                              <div className="flex-1 text-left">
                                <span className="font-medium">{user.name}</span>
                                {user.department && (
                                  <span className={`ml-2 text-[10px] ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}>
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
                      className={`p-2 rounded-lg flex-shrink-0 transition-colors ${
                        showEmojiPicker
                          ? "bg-indigo-600 text-white"
                          : isDarkMode ? "bg-slate-600 hover:bg-slate-500 text-slate-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                      title="Emoji"
                      whileHover={{ scale: 1.05 }}
                    >
                      <Smile className="w-5 h-5" />
                    </motion.button>

                    <AnimatePresence>
                      {showEmojiPicker && (
                        <motion.div
                          ref={emojiPickerRef}
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className={`fixed rounded-xl p-4 shadow-2xl border transition-colors ${
                            isDarkMode ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"
                          }`}
                          style={{
                            width: "320px",
                            maxHeight: "350px",
                            bottom: `${emojiPickerPos.bottom}px`,
                            left: `${emojiPickerPos.left}px`,
                            zIndex: 9999,
                          }}
                        >
                          <div className="overflow-y-auto space-y-3" style={{ maxHeight: "300px" }}>
                            {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                              <div key={category}>
                                <h3 className={`text-xs font-semibold uppercase tracking-wide mb-2 pl-1 ${
                                  isDarkMode ? "text-slate-300" : "text-gray-600"
                                }`}>
                                  {category}
                                </h3>
                                <div className="grid grid-cols-6 gap-1">
                                  {emojis.map((emoji) => (
                                    <motion.button
                                      key={emoji}
                                      onClick={() => insertEmoji(emoji)}
                                      className={`text-lg rounded-lg p-1.5 transition-colors cursor-pointer flex items-center justify-center ${
                                        isDarkMode ? "hover:bg-slate-600" : "hover:bg-indigo-100"
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
                    className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={editingMessageId ? "Modifier" : "Envoyer"}
                    whileHover={{ scale: 1.05 }}
                  >
                    {editingMessageId ? <Edit2 className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                  </motion.button>
                </div>
              </div>
            </>
          )}
        </main>
      ) : (
        /* Empty state */
        <div className={`flex-1 flex items-center justify-center transition-colors ${isDarkMode ? "bg-slate-800" : "bg-white"}`}>
          {/* Mobile hamburger for empty state */}
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className={`absolute top-4 left-4 p-2 rounded-lg lg:hidden z-10 ${isDarkMode ? "bg-slate-700 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className={`text-center ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
            <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Sélectionnez un canal ou un contact</p>
            <p className="text-xs mt-1">pour commencer la conversation</p>
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
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-[10000] p-4"
            onClick={() => setLightboxUrl(null)}
          >
            <motion.button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </motion.button>
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              src={lightboxUrl}
              alt="Agrandissement"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
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
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000]"
          >
            <div
              className="rounded-2xl p-5 w-96 max-w-[92vw] border"
              style={{
                background: isDarkMode ? "rgba(15, 23, 42, 0.75)" : "rgba(255, 255, 255, 0.78)",
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                borderColor: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
                boxShadow: "0 12px 40px rgba(0, 0, 0, 0.25)",
              }}
            >
              <div className="flex items-center gap-4 mb-5">
                <motion.div
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <span className="text-white font-bold text-lg">
                    {incomingCall.callerName.split(" ").map((n) => n[0]).join("").toUpperCase()}
                  </span>
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-base ${isDarkMode ? "text-white" : "text-gray-900"}`}>{incomingCall.callerName}</p>
                  <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                    {incomingCall.callType === "video" ? "Appel vidéo entrant..." : "Appel vocal entrant..."}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <motion.button onClick={handleAcceptCall}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold text-sm shadow-lg"
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <PhoneCall className="w-5 h-5" /> Accepter
                </motion.button>
                <motion.button onClick={handleDeclineCall}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold text-sm shadow-lg"
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <PhoneOff className="w-5 h-5" /> Décliner
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className={`rounded-xl p-6 w-full max-w-md shadow-2xl border ${
                isDarkMode ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"
              }`}>
              <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                Créer un nouveau canal
              </h2>
              <input
                type="text"
                placeholder="Nom du canal"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                className={`w-full rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4 ${
                  isDarkMode ? "bg-slate-600 border border-slate-500 text-white placeholder-slate-400" : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500"
                }`}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateChannel(); }}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <motion.button
                  onClick={() => { setShowCreateChannelModal(false); setNewChannelName(""); }}
                  className={`px-4 py-2 rounded-lg ${isDarkMode ? "bg-slate-600 hover:bg-slate-500 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}
                  whileHover={{ scale: 1.05 }}>
                  Annuler
                </motion.button>
                <motion.button onClick={handleCreateChannel}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white" whileHover={{ scale: 1.05 }}>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className={`rounded-xl p-6 w-full max-w-md shadow-2xl border ${
                isDarkMode ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"
              }`}>
              <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                Supprimer ce canal ?
              </h2>
              <p className={`mb-6 ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>
                Cette action est irréversible.
              </p>
              <div className="flex gap-2 justify-end">
                <motion.button onClick={() => setShowDeleteConfirm(null)}
                  className={`px-4 py-2 rounded-lg ${isDarkMode ? "bg-slate-600 hover:bg-slate-500 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}
                  whileHover={{ scale: 1.05 }}>
                  Annuler
                </motion.button>
                <motion.button onClick={() => handleDeleteChannel(showDeleteConfirm)}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white" whileHover={{ scale: 1.05 }}>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className={`rounded-xl p-6 w-full max-w-md shadow-2xl border max-h-[80vh] overflow-y-auto ${
                isDarkMode ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"
              }`}>
              <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                Gérer les membres
              </h2>

              <div className="mb-6">
                <h3 className={`text-sm font-semibold mb-3 ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>Membres actuels</h3>
                <div className="space-y-2">
                  {currentChannelData.members.map((memberId) => {
                    const member = availableUsers.find((u) => u.id === memberId);
                    return (
                      <div key={memberId} className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                        isDarkMode ? "bg-slate-600" : "bg-gray-50"
                      }`}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                            {getInitials(member?.name || memberId)}
                          </div>
                          <span className={`text-sm font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>{member?.name || memberId}</span>
                          {memberId === currentUserId && <span className="text-xs text-indigo-500">(Vous)</span>}
                        </div>
                        {memberId !== currentUserId && (
                          <motion.button onClick={() => handleRemoveMember(memberId)}
                            className="p-1 rounded hover:bg-red-100 text-red-600" whileHover={{ scale: 1.1 }}>
                            <X className="w-4 h-4" />
                          </motion.button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mb-6">
                <h3 className={`text-sm font-semibold mb-3 ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>Ajouter un membre</h3>
                {!showAddMemberForm ? (
                  <motion.button onClick={() => setShowAddMemberForm(true)}
                    className="w-full px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm flex items-center gap-2 justify-center"
                    whileHover={{ scale: 1.02 }}>
                    <Plus className="w-4 h-4" /> Ajouter
                  </motion.button>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={selectedUserToAdd || ""}
                      onChange={(e) => setSelectedUserToAdd(e.target.value)}
                      className={`w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDarkMode ? "bg-slate-600 border border-slate-500 text-white" : "bg-gray-50 border border-gray-300 text-gray-900"
                      }`}
                    >
                      <option value="">Sélectionner</option>
                      {availableUsers
                        .filter((u) => !currentChannelData.members.includes(u.id))
                        .map((user) => (
                          <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                      <motion.button onClick={handleAddMember} disabled={!selectedUserToAdd}
                        className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm disabled:opacity-50"
                        whileHover={{ scale: 1.02 }}>
                        Ajouter
                      </motion.button>
                      <motion.button onClick={() => { setShowAddMemberForm(false); setSelectedUserToAdd(null); }}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm ${isDarkMode ? "bg-slate-600 hover:bg-slate-500 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}
                        whileHover={{ scale: 1.02 }}>
                        Annuler
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>

              <motion.button onClick={() => setShowManageMembersModal(false)}
                className={`w-full px-4 py-2 rounded-lg ${isDarkMode ? "bg-slate-600 hover:bg-slate-500 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}
                whileHover={{ scale: 1.02 }}>
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
