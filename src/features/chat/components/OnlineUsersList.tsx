import { useAuth } from '../../../shared/contexts/AuthContext';

export default function OnlineUsersList({ currentUserId }: { currentUserId: string }) {
  const { allUsers, onlineUserIds } = useAuth();
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold mb-2">Utilisateurs connectés</h2>
      <ul className="space-y-1">
        {allUsers.filter(u => onlineUserIds.includes(u.id)).map(u => (
          <li key={u.id} className={`flex items-center gap-2 ${u.id === currentUserId ? 'font-bold text-blue-700' : ''}`}>
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            {u.fullName || u.email}
            {u.id === currentUserId && <span className="ml-1 text-xs text-blue-500">(vous)</span>}
          </li>
        ))}
        {allUsers.filter(u => onlineUserIds.includes(u.id)).length === 0 && (
          <li className="text-gray-400">Aucun utilisateur en ligne</li>
        )}
      </ul>
    </div>
  );
}
