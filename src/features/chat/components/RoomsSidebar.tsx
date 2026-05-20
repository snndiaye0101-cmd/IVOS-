import { useEffect, useState } from 'react';
import { getRooms } from '../services/roomsService';
import { ChatRoom } from '../types/room.types';
import AddRoomForm from './AddRoomForm';

export default function RoomsSidebar({
  selectedRoomId,
  onSelectRoom,
}: {
  selectedRoomId: string;
  onSelectRoom: (id: string) => void;
}) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);

  const refreshRooms = () => getRooms().then(setRooms);
  useEffect(() => {
    refreshRooms();
  }, []);

  return (
    <aside className="mr-4 h-full w-56 border-r pr-2">
      <h2 className="mb-2 text-lg font-semibold">Salons</h2>
      <AddRoomForm onRoomAdded={refreshRooms} />
      <ul className="space-y-1">
        {rooms.map((room) => (
          <li key={room.id}>
            <button
              className={`w-full rounded px-3 py-2 text-left font-medium transition ${selectedRoomId === room.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
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
