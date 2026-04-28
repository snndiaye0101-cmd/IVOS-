// Exemple de serveur WebSocket Node.js pour signalisation WebRTC (à lancer séparément)
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3001 });

const clients = new Map(); // id -> ws

wss.on('connection', (ws) => {
  let userId = null;
  ws.on('message', (msg) => {
    const data = JSON.parse(msg);
    if (data.type === 'register') {
      userId = data.userId;
      clients.set(userId, ws);
    } else if (data.to && clients.has(data.to)) {
      clients.get(data.to).send(JSON.stringify({ ...data, from: userId }));
    }
  });
  ws.on('close', () => {
    if (userId) clients.delete(userId);
  });
});
console.log('Signaling server running on ws://localhost:3001');
