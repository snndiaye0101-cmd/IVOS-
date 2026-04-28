import React from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';

export default function DirectMessageList({ currentUserId, onSelectUser }: { currentUserId: string; onSelectUser: (userId: string) => void }) {
  const { allUsers, onlineUserIds } = useAuth();
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold mb-2">Messages privés</h2>
      <ul className="space-y-1">
        {allUsers.filter(u => u.id !== currentUserId).map(u => (
          <li key={u.id}>
            <button
              className={`flex items-center gap-2 px-2 py-1 rounded w-full text-left hover:bg-gray-100`}
              onClick={() => onSelectUser(u.id)}
            >
              <span className={`inline-block w-2 h-2 rounded-full ${onlineUserIds.includes(u.id) ? 'bg-green-500' : 'bg-gray-300'}`} />
              {u.fullName || u.email}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
