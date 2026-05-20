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
    <form onSubmit={handleSubmit} className="mb-4 rounded border bg-gray-50 p-2">
      <div className="mb-2">
        <input
          className="w-full rounded border px-2 py-1"
          placeholder="Nom du salon"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="mb-2">
        <input
          className="w-full rounded border px-2 py-1"
          placeholder="Description (optionnelle)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700 disabled:opacity-50"
        disabled={loading}
      >
        Ajouter un salon
      </button>
    </form>
  );
}
