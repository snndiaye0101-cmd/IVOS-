import { useEffect, useState } from 'react';
import { getRooms } from '../services/roomsService';
import { ChatRoom } from '../types/room.types';
import AddRoomForm from './AddRoomForm';

export default function RoomsSidebar({ selectedRoomId, onSelectRoom }: { selectedRoomId: string; onSelectRoom: (id: string) => void }) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);

  const refreshRooms = () => getRooms().then(setRooms);
  useEffect(() => {
    refreshRooms();
  }, []);

  return (
    <aside className="w-56 border-r pr-2 mr-4 h-full">
      <h2 className="text-lg font-semibold mb-2">Salons</h2>
      <AddRoomForm onRoomAdded={refreshRooms} />
      <ul className="space-y-1">
        {rooms.map(room => (
          <li key={room.id}>
            <button
              className={`w-full text-left px-3 py-2 rounded transition font-medium ${selectedRoomId === room.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
              onClick={() => onSelectRoom(room.id)}
            >
              {room.name}
              {room.description && <div className="text-xs text-gray-400">{room.description}</div>}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
