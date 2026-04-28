import { User, Circle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatHeaderProps {
  channelName: string;
  onlineUsers: { id: string; name: string; online: boolean }[];
}

export default function ChatHeader({ channelName, onlineUsers }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-[#003366] text-white shadow">
      <div className="flex items-center gap-3">
        <User size={22} />
        <span className="font-bold text-lg">{channelName}</span>
      </div>
      <div className="flex items-center gap-2">
        {onlineUsers.map(user => (
          <motion.div
            key={user.id}
            className="flex items-center gap-1"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Circle size={12} className={user.online ? 'text-green-400' : 'text-gray-400'} />
            <span className="text-sm font-medium">{user.name}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
