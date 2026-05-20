// Service WebRTC pour appels audio/vidéo (base)
// À compléter avec la signalisation (WebSocket/Supabase)

export type CallType = 'audio' | 'video';

export class WebRTCService {
  private localStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private remoteStream: MediaStream | null = null;
  private onRemoteStream: ((stream: MediaStream) => void) | null = null;

  async startLocalStream(type: CallType): Promise<MediaStream> {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video',
    });
    return this.localStream;
  }

  async createPeerConnection(onRemoteStream: (stream: MediaStream) => void) {
    this.peerConnection = new RTCPeerConnection();
    this.onRemoteStream = onRemoteStream;
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }
    this.peerConnection.ontrack = (event) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        this.onRemoteStream?.(this.remoteStream);
      }
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream!.addTrack(track);
      });
    };
    // TODO: Ajouter gestion ICE, signalisation, etc.
  }

  getLocalStream() {
    return this.localStream;
  }
  getRemoteStream() {
    return this.remoteStream;
  }
  close() {
    this.peerConnection?.close();
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.remoteStream = null;
    this.peerConnection = null;
    this.localStream = null;
  }
}
