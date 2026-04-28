import { useEffect, useRef, useState } from 'react';
import { getMessages, sendMessage } from '../services/chatService';
import { ChatMessage } from '../types/chat.types';
import { toast } from 'sonner';
import { subscribeToRoomMessages } from '../services/realtimeService';

export default function ChatWindow({ userId, userName, roomId = 'general', dmUserId }: { userId: string; userName: string; roomId?: string; dmUserId?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatKey = dmUserId
    ? `dm:${[userId, dmUserId].sort().join('-')}`
    : roomId;

  useEffect(() => {
    let mounted = true;
    let lastMessageId = '';
    const fetchAndNotify = async () => {
      const msgs = await getMessages(chatKey);
      if (!mounted) return;
      if (msgs.length > 0 && msgs[msgs.length - 1].id !== lastMessageId) {
        if (lastMessageId && msgs[msgs.length - 1].user_id !== userId) {
          toast(`${msgs[msgs.length - 1].user_name} : ${msgs[msgs.length - 1].content}`);
        }
        lastMessageId = msgs[msgs.length - 1].id;
      }
      setMessages(msgs);
    };
    fetchAndNotify();
    const unsubscribe = subscribeToRoomMessages((changedRoomId) => {
      if (changedRoomId === chatKey) fetchAndNotify();
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [chatKey, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      channel_id: chatKey,
      user_id: userId,
      user_name: userName,
      content: input,
      type: 'text',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
    };
    await sendMessage(newMessage, chatKey);
    setMessages([...messages, newMessage]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`mb-2 ${msg.user_id === userId ? 'text-right' : 'text-left'}`}>
            <span className="font-semibold text-blue-700 mr-2">{msg.user_name}</span>
            <span className="inline-block bg-gray-100 px-3 py-1 rounded-lg text-gray-800 max-w-xs break-words">
              {msg.content}
            </span>
            <div className="text-xs text-gray-400 mt-0.5">{new Date(msg.created_at).toLocaleTimeString()}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-2 border-t flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2 text-sm"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ecrivez un message..."
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={handleSend}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
