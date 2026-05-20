// Simule un bus d’événements pour notifications temps réel (remplaçable par WebSocket/Supabase)

type Callback = (roomId: string) => void;
const listeners: Callback[] = [];

export function subscribeToRoomMessages(cb: Callback) {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export function notifyRoomMessage(roomId: string) {
  listeners.forEach((cb) => cb(roomId));
}
