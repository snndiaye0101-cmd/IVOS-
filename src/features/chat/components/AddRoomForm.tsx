import { useState } from 'react';
import { addRoom } from '../services/roomsService';

export default function AddRoomForm({ onRoomAdded }: { onRoomAdded: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await addRoom(name, description);
    setName('');
    setDescription('');
    setLoading(false);
    onRoomAdded();
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 p-2 border rounded bg-gray-50">
      <div className="mb-2">
        <input
          className="border rounded px-2 py-1 w-full"
          placeholder="Nom du salon"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
      </div>
      <div className="mb-2">
        <input
          className="border rounded px-2 py-1 w-full"
          placeholder="Description (optionnelle)"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
        disabled={loading}
      >
        Ajouter un salon
      </button>
    </form>
  );
}
