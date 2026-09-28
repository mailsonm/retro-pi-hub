// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  WebRtcPeerCoordinator,
  generateJoinQrSvg
} from '../src/services/netplay-coordinator.service.js';
import { SignalingMessage } from '@retro-pi-hub/shared';

describe('Seam: Client Netplay Lobby & WebRTC Peer Coordinator (Ticket #10)', () => {
  it('generateJoinQrSvg should generate valid SVG markup pointing to room URL', () => {
    const svg = generateJoinQrSvg('192.168.1.100', 3000, 'A7K2');
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('A7K2');
  });

  describe('WebRtcPeerCoordinator', () => {
    let mockSendSignaling: ReturnType<typeof vi.fn>;
    let coordinator: WebRtcPeerCoordinator;

    beforeEach(() => {
      mockSendSignaling = vi.fn();
      coordinator = new WebRtcPeerCoordinator({
        sendSignaling: mockSendSignaling
      });
    });

    it('createRoom should send create_room signaling message and set isHost=true', () => {
      coordinator.createRoom('host-player');

      expect(mockSendSignaling).toHaveBeenCalledWith({
        action: 'create_room',
        senderId: 'host-player'
      });
      expect(coordinator.isHost()).toBe(true);
    });

    it('joinRoom should send join_room signaling message and set isHost=false', () => {
      coordinator.joinRoom('B8M9', 'guest-player');

      expect(mockSendSignaling).toHaveBeenCalledWith({
        action: 'join_room',
        roomCode: 'B8M9',
        senderId: 'guest-player'
      });
      expect(coordinator.isHost()).toBe(false);
      expect(coordinator.getRoomCode()).toBe('B8M9');
    });

    it('should forward incoming controller input frame to registered callback', () => {
      const inputCallback = vi.fn();
      coordinator.onInputFrame(inputCallback);

      const mockFrame = {
        player: 2,
        buttons: { a: true, b: false, up: false, down: false }
      };

      coordinator.handleDataChannelMessage(JSON.stringify(mockFrame));

      expect(inputCallback).toHaveBeenCalledWith(mockFrame);
    });
  });
});
