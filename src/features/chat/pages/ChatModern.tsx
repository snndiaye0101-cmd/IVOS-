import React, { useState } from 'react';
import { useContextSelector } from '../../../shared/contexts/ContextProvider';
import ChannelList from '../components/ChannelList';
import ChatHeader from '../components/ChatHeader';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import MessageReactions from '../components/MessageReactions';
import { AnimatePresence } from 'framer-motion';

// MOCK DATA
const MOCK_CHANNELS = [
  { id: 'general-senegal', name: 'Général', country: 'SEN', site: 'DKR' },
  { id: 'logistique-senegal', name: 'Logistique', country: 'SEN', site: 'DKR', department: 'Logistique' },
  { id: 'technique-senegal', name: 'Technique', country: 'SEN', site: 'DKR', department: 'Technique' },
  { id: 'finances-senegal', name: 'Finances', country: 'SEN', site: 'DKR', department: 'Finances' },
  { id: 'general-civ', name: 'Général', country: 'CIV', site: 'ABJ' },
  { id: 'logistique-civ', name: 'Logistique', country: 'CIV', site: 'ABJ', department: 'Logistique' },
];
const MOCK_USERS = [
  { id: 'u1', name: 'Alice', online: true },
  { id: 'u2', name: 'Bob', online: false },
  { id: 'u3', name: 'Chad', online: true },
];
type ReactionType = 'check' | 'warning' | 'bravo';
interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  reactions: { type: ReactionType; count: number }[];
}
const MOCK_MESSAGES: Message[] = [
  { id: 'm1', userId: 'u1', userName: 'Alice', content: 'Bienvenue sur le chat !', createdAt: '2026-04-09T09:00:00Z', reactions: [{ type: 'check', count: 2 }] },
  { id: 'm2', userId: 'u3', userName: 'Chad', content: 'Operation #123 affectée.', createdAt: '2026-04-09T09:01:00Z', reactions: [{ type: 'bravo', count: 1 }] },
];

export default function ChatModern() {
  const { country, site } = useContextSelector();
  const [selectedChannel, setSelectedChannel] = useState(MOCK_CHANNELS[0].id);
  const [messages, setMessages] = useState(MOCK_MESSAGES);

  // Pour la démo, on prend tous les users
  const onlineUsers = MOCK_USERS;

  const handleSend = (msg: { content: string; type?: "text" | "image" | "file" | "location"; fileUrl?: string; fileName?: string }) => {
    setMessages([...messages, {
      id: Date.now().toString(),
      userId: 'u1',
      userName: 'Alice',
      content: msg.content,
      createdAt: new Date().toISOString(),
      reactions: []
    }]);
  };
  const handleReact = (msgId: string, type: ReactionType) => {
    setMessages(msgs => msgs.map(m => m.id === msgId ? {
      ...m,
      reactions: m.reactions ? updateReactions(m.reactions, type) : [{ type, count: 1 }]
    } : m));
  };
  function updateReactions(reactions: { type: ReactionType; count: number }[], type: ReactionType) {
    const idx = reactions.findIndex(r => r.type === type);
    if (idx > -1) {
      return reactions.map((r, i) => i === idx ? { ...r, count: r.count + 1 } : r);
    }
    return [...reactions, { type, count: 1 }];
  }

  return (
    <div className="flex h-[80vh] rounded-2xl overflow-hidden shadow-xl border border-blue-100 bg-white">
      <ChannelList
        channels={MOCK_CHANNELS}
        currentCountry={country?.code || 'SEN'}
        currentSite={site?.code || 'DKR'}
        onSelect={setSelectedChannel}
        selectedId={selectedChannel}
      />
      <div className="flex-1 flex flex-col">
        <ChatHeader channelName={MOCK_CHANNELS.find(c => c.id === selectedChannel)?.name || ''} onlineUsers={onlineUsers} />
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-blue-50 to-white">
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <React.Fragment key={msg.id}>
                <MessageBubble
                  id={msg.id}
                  content={msg.content}
                  isOwn={msg.userId === 'u1'}
                  userName={msg.userName}
                  timestamp={new Date(msg.createdAt).toLocaleTimeString()}
                />
                <div className={`flex mb-2 ${msg.userId === 'u1' ? 'justify-end' : 'justify-start'}`}>
                  <MessageReactions reactions={msg.reactions || []} onReact={(type: ReactionType) => handleReact(msg.id, type)} />
                </div>
              </React.Fragment>
            ))}
          </AnimatePresence>
        </div>
        <MessageInput
          onSend={handleSend}
        />
      </div>
    </div>
  );
}
