// Service de signalisation WebSocket (base)
// À connecter à WebRTCService pour échanger offres/réponses/ICE

export class SignalingService<T = unknown> {
  private ws: WebSocket | null = null;
  private onMessage: ((msg: T) => void) | null = null;

  connect(url: string, onMessage: (msg: T) => void) {
    this.ws = new WebSocket(url);
    this.onMessage = onMessage;
    this.ws.onmessage = (event) => {
      const data: T = JSON.parse(event.data);
      this.onMessage?.(data);
    };
  }

  send(data: T) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  close() {
    this.ws?.close();
    this.ws = null;
  }
}
