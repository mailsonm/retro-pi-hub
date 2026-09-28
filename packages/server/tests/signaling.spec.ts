import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { buildApp } from '../src/app.js';
import { SignalingMessage } from '@retro-pi-hub/shared';

describe('Seam: Netplay WebSocket Signaling Server (Ticket #06)', () => {
  let app: ReturnType<typeof buildApp>;
  let wsUrl: string;

  beforeEach(async () => {
    app = buildApp({
      romsDir: '/tmp',
      savesDir: '/tmp'
    });
    const address = await app.listen({ port: 0, host: '127.0.0.1' });
    wsUrl = address.replace('http://', 'ws://') + '/ws/netplay';
  });

  afterEach(async () => {
    await app.close();
  });

  function connectClient(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  }

  function waitForMessage<T = unknown>(ws: WebSocket): Promise<SignalingMessage<T>> {
    return new Promise((resolve) => {
      ws.once('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });
  }

  it('should allow host to create a room and receive a 4-character code', async () => {
    const host = await connectClient();

    host.send(
      JSON.stringify({
        action: 'create_room',
        senderId: 'host-1'
      })
    );

    const reply = await waitForMessage(host);
    expect(reply.action).toBe('room_created');
    expect(reply.roomCode).toBeDefined();
    expect(reply.roomCode).toMatch(/^[A-Z0-9]{4}$/);

    host.close();
  });

  it('should allow guest to join room and relay SDP/ICE between host and guest', async () => {
    const host = await connectClient();
    const guest = await connectClient();

    // 1. Host creates room
    host.send(
      JSON.stringify({
        action: 'create_room',
        senderId: 'host-1'
      })
    );
    const roomCreated = await waitForMessage(host);
    const roomCode = roomCreated.roomCode!;

    // 2. Guest joins room
    const hostPromise = waitForMessage(host);
    guest.send(
      JSON.stringify({
        action: 'join_room',
        senderId: 'guest-1',
        roomCode
      })
    );

    const guestJoinedSelf = await waitForMessage(guest);
    expect(guestJoinedSelf.action).toBe('peer_joined');

    const guestJoinedNotification = await hostPromise;
    expect(guestJoinedNotification.action).toBe('peer_joined');
    expect(guestJoinedNotification.senderId).toBe('guest-1');

    // 3. Host sends SDP offer
    const guestOfferPromise = waitForMessage(guest);
    host.send(
      JSON.stringify({
        action: 'sdp_offer',
        senderId: 'host-1',
        roomCode,
        payload: { sdp: 'v=0 offer' }
      })
    );

    const receivedOffer = await guestOfferPromise;
    expect(receivedOffer.action).toBe('sdp_offer');
    expect(receivedOffer.payload).toEqual({ sdp: 'v=0 offer' });

    // 4. Guest sends SDP answer
    const hostAnswerPromise = waitForMessage(host);
    guest.send(
      JSON.stringify({
        action: 'sdp_answer',
        senderId: 'guest-1',
        roomCode,
        payload: { sdp: 'v=0 answer' }
      })
    );

    const receivedAnswer = await hostAnswerPromise;
    expect(receivedAnswer.action).toBe('sdp_answer');
    expect(receivedAnswer.payload).toEqual({ sdp: 'v=0 answer' });

    host.close();
    guest.close();
  });
});
