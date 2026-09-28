import { WebSocket } from 'ws';
import crypto from 'node:crypto';
import {
  SignalingMessage,
  validateSignalingMessage
} from '@retro-pi-hub/shared';

interface ConnectedPeer {
  id: string;
  socket: WebSocket;
  roomCode?: string;
  isHost: boolean;
}

interface NetplayRoom {
  code: string;
  hostId: string;
  peers: Map<string, ConnectedPeer>;
  createdAt: number;
}

export class NetplaySignalingManager {
  private rooms: Map<string, NetplayRoom> = new Map();
  private peers: Map<WebSocket, ConnectedPeer> = new Map();

  handleConnection(socket: WebSocket) {
    const peerId = crypto.randomUUID();
    const peer: ConnectedPeer = {
      id: peerId,
      socket,
      isHost: false
    };
    this.peers.set(socket, peer);

    socket.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        this.processMessage(peer, data);
      } catch {
        this.send(socket, {
          action: 'error',
          payload: { message: 'Malformed JSON payload' }
        });
      }
    });

    socket.on('close', () => {
      this.handleDisconnection(peer);
    });
  }

  private processMessage(peer: ConnectedPeer, msg: unknown) {
    const validation = validateSignalingMessage(msg);
    if (!validation.valid) {
      this.send(peer.socket, {
        action: 'error',
        payload: { errors: validation.errors }
      });
      return;
    }

    const message = msg as SignalingMessage;
    const senderId = message.senderId || peer.id;

    switch (message.action) {
      case 'create_room': {
        const roomCode = this.generateRoomCode();
        peer.isHost = true;
        peer.roomCode = roomCode;

        const room: NetplayRoom = {
          code: roomCode,
          hostId: senderId,
          peers: new Map([[senderId, peer]]),
          createdAt: Date.now()
        };
        this.rooms.set(roomCode, room);

        this.send(peer.socket, {
          action: 'room_created',
          roomCode,
          senderId
        });
        break;
      }

      case 'join_room': {
        const roomCode = message.roomCode!.toUpperCase();
        const room = this.rooms.get(roomCode);

        if (!room) {
          this.send(peer.socket, {
            action: 'error',
            roomCode,
            payload: { message: 'Room not found' }
          });
          return;
        }

        peer.isHost = false;
        peer.roomCode = roomCode;
        room.peers.set(senderId, peer);

        // Notify host that guest joined
        const hostPeer = room.peers.get(room.hostId);
        if (hostPeer && hostPeer.socket.readyState === WebSocket.OPEN) {
          this.send(hostPeer.socket, {
            action: 'peer_joined',
            roomCode,
            senderId
          });
        }

        // Notify guest that join was accepted
        this.send(peer.socket, {
          action: 'peer_joined',
          roomCode,
          senderId
        });
        break;
      }

      case 'sdp_offer':
      case 'sdp_answer':
      case 'ice_candidate': {
        const roomCode = message.roomCode!.toUpperCase();
        const room = this.rooms.get(roomCode);
        if (!room) return;

        // Relay to other peers in room
        for (const [targetId, targetPeer] of room.peers.entries()) {
          if (targetId !== senderId && targetPeer.socket.readyState === WebSocket.OPEN) {
            this.send(targetPeer.socket, {
              ...message,
              senderId
            });
          }
        }
        break;
      }
    }
  }

  private handleDisconnection(peer: ConnectedPeer) {
    this.peers.delete(peer.socket);

    if (!peer.roomCode) return;
    const room = this.rooms.get(peer.roomCode);
    if (!room) return;

    room.peers.delete(peer.id);

    if (peer.isHost) {
      // If host left, notify all and terminate room
      for (const otherPeer of room.peers.values()) {
        if (otherPeer.socket.readyState === WebSocket.OPEN) {
          this.send(otherPeer.socket, {
            action: 'peer_left',
            roomCode: room.code,
            senderId: peer.id
          });
        }
      }
      this.rooms.delete(room.code);
    } else {
      // Notify host that guest left
      const host = room.peers.get(room.hostId);
      if (host && host.socket.readyState === WebSocket.OPEN) {
        this.send(host.socket, {
          action: 'peer_left',
          roomCode: room.code,
          senderId: peer.id
        });
      }
    }
  }

  private send(socket: WebSocket, message: SignalingMessage) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude ambiguous 0, O, 1, I
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }
}
