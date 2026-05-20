// Service WebRTC pour visioconférence de groupe (mesh, démo)
// Chaque participant connecte un peer avec tous les autres (mesh)

export class WebRTCGroupService {
  private peers: Record<string, RTCPeerConnection> = {};
  private localStream: MediaStream | null = null;
  private onRemoteStream: ((userId: string, stream: MediaStream) => void) | null = null;

  async startLocalStream(video: boolean = true): Promise<MediaStream> {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    return this.localStream;
  }

  async addPeer(userId: string, onRemoteStream: (userId: string, stream: MediaStream) => void) {
    this.onRemoteStream = onRemoteStream;
    const pc = new RTCPeerConnection();
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => pc.addTrack(track, this.localStream!));
    }
    pc.ontrack = (event) => {
      const remoteStream = new MediaStream();
      event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
      this.onRemoteStream?.(userId, remoteStream);
    };
    this.peers[userId] = pc;
    return pc;
  }

  getLocalStream() {
    return this.localStream;
  }
  close() {
    Object.values(this.peers).forEach((pc) => pc.close());
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.peers = {};
    this.localStream = null;
  }
}
