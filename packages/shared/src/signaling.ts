export type SignalingAction =
  | 'create_room'
  | 'room_created'
  | 'join_room'
  | 'peer_joined'
  | 'sdp_offer'
  | 'sdp_answer'
  | 'ice_candidate'
  | 'peer_left'
  | 'error';

export interface SignalingMessage<T = unknown> {
  action: SignalingAction;
  roomCode?: string;
  senderId?: string;
  targetPeerId?: string;
  payload?: T;
}

export interface SignalingValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_ACTIONS: Set<SignalingAction> = new Set([
  'create_room',
  'room_created',
  'join_room',
  'peer_joined',
  'sdp_offer',
  'sdp_answer',
  'ice_candidate',
  'peer_left',
  'error'
]);

export function validateSignalingMessage(data: unknown): SignalingValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Signaling message must be a non-null object'] };
  }

  const msg = data as Partial<SignalingMessage>;

  if (!msg.action || !VALID_ACTIONS.has(msg.action as SignalingAction)) {
    errors.push(`Invalid or missing action. Allowed actions: ${Array.from(VALID_ACTIONS).join(', ')}`);
  }

  if (msg.action === 'join_room') {
    if (!msg.roomCode || typeof msg.roomCode !== 'string' || msg.roomCode.trim().length === 0) {
      errors.push('roomCode is required for join_room');
    }
  }

  if (msg.action === 'sdp_offer' || msg.action === 'sdp_answer' || msg.action === 'ice_candidate') {
    if (!msg.roomCode || typeof msg.roomCode !== 'string') {
      errors.push(`roomCode is required for ${msg.action}`);
    }
    if (!msg.payload) {
      errors.push(`payload is required for ${msg.action}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
