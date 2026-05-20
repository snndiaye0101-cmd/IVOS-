import { ChatRoom } from '../types/room.types';

// Fictitious chat rooms for demonstration
const rooms: ChatRoom[] = [
  { id: 'general', name: 'Général', description: 'Discussions générales de l’équipe.' },
  { id: 'dev', name: 'Développement', description: 'Questions techniques et entraide.' },
  { id: 'random', name: 'Café', description: 'Discussions informelles.' },
];

export function getRooms(): Promise<ChatRoom[]> {
  return Promise.resolve(rooms);
}

export function addRoom(name: string, description?: string): Promise<ChatRoom> {
  const id = name.toLowerCase().replace(/[^a-z0-9]/gi, '-') + '-' + Date.now();
  const newRoom: ChatRoom = { id, name, description };
  rooms.push(newRoom);
  return Promise.resolve(newRoom);
}
