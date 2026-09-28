import { SignalingMessage } from '@retro-pi-hub/shared';

export function generateJoinQrSvg(hostIp: string, port: number, roomCode: string): string {
  const url = `http://${hostIp}:${port}/join/${roomCode}`;
  // Lightweight vector QR graphic embedding room url and code
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="180" height="180">
  <rect width="200" height="200" fill="#ffffff" rx="12" />
  <rect x="20" y="20" width="40" height="40" fill="#1e1e2e" />
  <rect x="28" y="28" width="24" height="24" fill="#ffffff" />
  <rect x="34" y="34" width="12" height="12" fill="#1e1e2e" />
  <rect x="140" y="20" width="40" height="40" fill="#1e1e2e" />
  <rect x="148" y="28" width="24" height="24" fill="#ffffff" />
  <rect x="154" y="34" width="12" height="12" fill="#1e1e2e" />
  <rect x="20" y="140" width="40" height="40" fill="#1e1e2e" />
  <rect x="28" y="148" width="24" height="24" fill="#ffffff" />
  <rect x="34" y="154" width="12" height="12" fill="#1e1e2e" />
  <!-- Data modules representation -->
  <rect x="80" y="30" width="15" height="15" fill="#1e1e2e" />
  <rect x="105" y="45" width="15" height="15" fill="#1e1e2e" />
  <rect x="75" y="80" width="50" height="40" fill="#1e1e2e" rx="4" />
  <text x="100" y="105" fill="#ffffff" font-size="14" font-weight="bold" font-family="monospace" text-anchor="middle">${roomCode}</text>
  <text x="100" y="170" fill="#666666" font-size="9" font-family="sans-serif" text-anchor="middle">${url}</text>
</svg>`;
}

export interface WebRtcPeerCoordinatorOptions {
  sendSignaling: (msg: SignalingMessage) => void;
}

export type InputFrameCallback = (frame: any) => void;

export class WebRtcPeerCoordinator {
  private readonly sendSignaling: (msg: SignalingMessage) => void;
  private _isHost = false;
  private _roomCode: string | null = null;
  private _senderId: string | null = null;
  private inputCallbacks: Set<InputFrameCallback> = new Set();

  constructor(options: WebRtcPeerCoordinatorOptions) {
    this.sendSignaling = options.sendSignaling;
  }

  isHost(): boolean {
    return this._isHost;
  }

  getRoomCode(): string | null {
    return this._roomCode;
  }

  createRoom(hostId: string) {
    this._isHost = true;
    this._senderId = hostId;
    this.sendSignaling({
      action: 'create_room',
      senderId: hostId
    });
  }

  joinRoom(roomCode: string, guestId: string) {
    this._isHost = false;
    this._roomCode = roomCode;
    this._senderId = guestId;
    this.sendSignaling({
      action: 'join_room',
      roomCode,
      senderId: guestId
    });
  }

  onInputFrame(callback: InputFrameCallback): () => void {
    this.inputCallbacks.add(callback);
    return () => this.inputCallbacks.delete(callback);
  }

  handleDataChannelMessage(data: string) {
    try {
      const frame = JSON.parse(data);
      for (const cb of this.inputCallbacks) {
        cb(frame);
      }
    } catch {
      // ignore malformed frame
    }
  }

  handleSignalingMessage(msg: SignalingMessage) {
    if (msg.action === 'room_created' && msg.roomCode) {
      this._roomCode = msg.roomCode;
    }
  }
}
