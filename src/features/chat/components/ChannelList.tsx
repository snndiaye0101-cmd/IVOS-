import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Hash, Search } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  country: string;
  site: string;
  department?: string;
}

interface ChannelListProps {
  channels: Channel[];
  currentCountry: string;
  currentSite: string;
  onSelect: (id: string) => void;
  selectedId: string;
}

export default function ChannelList({
  channels,
  currentCountry,
  currentSite,
  onSelect,
  selectedId,
}: ChannelListProps) {
  const [search, setSearch] = useState('');

  // Filtrage dynamique par pays, site et recherche
  const filtered = useMemo(
    () =>
      channels.filter(
        (c) =>
          c.country === currentCountry &&
          c.site === currentSite &&
          (c.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.department?.toLowerCase().includes(search.toLowerCase()) ?? false))
      ),
    [channels, currentCountry, currentSite, search]
  );

  // Regroupement par département
  const grouped = useMemo(() => {
    const groups: { [key: string]: Channel[] } = {};
    filtered.forEach((c) => {
      const dept = c.department || 'Général';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(c);
    });
    return groups;
  }, [filtered]);

  return (
    <aside className="flex h-full w-64 flex-col bg-[#003366] text-white shadow-xl">
      <div className="flex items-center gap-2 border-b border-blue-900 p-4 text-lg font-bold">
        <span>Canaux</span>
        <div className="flex-1" />
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Recherche..."
            className="rounded border-none bg-blue-900 py-1 pl-8 pr-2 text-sm text-white placeholder:text-blue-200 focus:outline-none"
            style={{ width: 120 }}
          />
          <Search size={16} className="absolute left-2 top-1.5 text-blue-300" />
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto py-2">
        {Object.entries(grouped).map(([dept, chans]) => (
          <li key={dept} className="mb-2">
            <div className="px-4 py-1 text-xs font-bold uppercase tracking-wider text-blue-200 opacity-80">
              {dept}
            </div>
            <ul>
              {chans.map((channel) => (
                <motion.li
                  key={channel.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <button
                    className={`mb-1 flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left font-medium transition ${selectedId === channel.id ? 'bg-blue-800' : 'hover:bg-blue-900'}`}
                    onClick={() => onSelect(channel.id)}
                  >
                    <Hash size={18} />
                    <span>{channel.name}</span>
                    {channel.department && (
                      <span className="ml-2 rounded-full bg-blue-900 px-2 py-0.5 text-xs">
                        {channel.department}
                      </span>
                    )}
                  </button>
                </motion.li>
              ))}
            </ul>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-8 text-center text-blue-200">Aucun canal trouvé</li>
        )}
      </ul>
    </aside>
  );
}
