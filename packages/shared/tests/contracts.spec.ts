import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_SYSTEMS,
  isValidSystem,
  validateSaveSyncRequest,
  validateSignalingMessage,
  RomItemDTO,
  SystemCatalogDTO,
  SaveSyncRequestDTO,
  SaveSyncResponseDTO,
  TvLockStatusDTO,
  SignalingMessage
} from '../src/index.js';

describe('Shared Domain Contracts & DTOs', () => {
  describe('System Catalog & ROM DTOs', () => {
    it('should define supported retro systems with expected core mappings', () => {
      expect(SUPPORTED_SYSTEMS.snes).toBeDefined();
      expect(SUPPORTED_SYSTEMS.snes.name).toBe('Super Nintendo');
      expect(SUPPORTED_SYSTEMS.snes.coreName).toBe('snes9x');
      expect(SUPPORTED_SYSTEMS.gba.name).toBe('Game Boy Advance');
      expect(SUPPORTED_SYSTEMS.gba.coreName).toBe('mgba');
    });

    it('should accurately validate supported system identifiers', () => {
      expect(isValidSystem('snes')).toBe(true);
      expect(isValidSystem('gba')).toBe(true);
      expect(isValidSystem('nes')).toBe(true);
      expect(isValidSystem('genesis')).toBe(true);
      expect(isValidSystem('unsupported_console')).toBe(false);
    });

    it('should enforce proper shape of RomItemDTO', () => {
      const rom: RomItemDTO = {
        id: 'snes-super-mario-world',
        system: 'snes',
        title: 'Super Mario World',
        fileName: 'Super Mario World (USA).sfc',
        fileSizeBytes: 524288,
        hasSramSave: true
      };
      expect(rom.id).toBe('snes-super-mario-world');
      expect(rom.hasSramSave).toBe(true);
    });

    it('should enforce proper shape of SystemCatalogDTO', () => {
      const catalog: SystemCatalogDTO = {
        system: 'snes',
        name: 'Super Nintendo',
        coreName: 'snes9x',
        gamesCount: 1,
        games: [
          {
            id: 'snes-smw',
            system: 'snes',
            title: 'SMW',
            fileName: 'smw.sfc',
            fileSizeBytes: 524288,
            hasSramSave: false
          }
        ]
      };
      expect(catalog.gamesCount).toBe(1);
    });
  });

  describe('Save Synchronization Contracts', () => {
    it('should validate valid save sync request payloads', () => {
      const validPayload: SaveSyncRequestDTO = {
        system: 'snes',
        romName: 'Super Mario World (USA)',
        slot: 'tv_shared',
        sramBase64: Buffer.from('fake-sram-data').toString('base64'),
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        timestamp: Date.now()
      };

      const result = validateSaveSyncRequest(validPayload);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid save sync request payloads with missing fields', () => {
      const invalidPayload = {
        system: '',
        romName: 'Test',
        slot: ''
      };

      const result = validateSaveSyncRequest(invalidPayload);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should format TvLockStatusDTO correctly', () => {
      const status: TvLockStatusDTO = {
        isLocked: true,
        activeOnTv: true,
        currentRom: 'Super Mario World (USA)',
        lockedSince: new Date().toISOString()
      };
      expect(status.isLocked).toBe(true);
      expect(status.activeOnTv).toBe(true);
    });
  });

  describe('Netplay WebRTC Signaling Messages', () => {
    it('should validate create_room signaling message', () => {
      const msg: SignalingMessage = {
        action: 'create_room',
        senderId: 'host-123'
      };
      const result = validateSignalingMessage(msg);
      expect(result.valid).toBe(true);
    });

    it('should validate join_room signaling message requiring roomCode', () => {
      const msg: SignalingMessage = {
        action: 'join_room',
        senderId: 'guest-456',
        roomCode: 'A7K2'
      };
      const result = validateSignalingMessage(msg);
      expect(result.valid).toBe(true);
    });

    it('should reject join_room message without roomCode', () => {
      const msg = {
        action: 'join_room',
        senderId: 'guest-456'
      };
      const result = validateSignalingMessage(msg);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('roomCode is required for join_room');
    });

    it('should validate sdp_offer and sdp_answer signaling messages', () => {
      const offerMsg: SignalingMessage<{ sdp: string }> = {
        action: 'sdp_offer',
        roomCode: 'A7K2',
        senderId: 'host-123',
        payload: { sdp: 'v=0...' }
      };
      expect(validateSignalingMessage(offerMsg).valid).toBe(true);
    });
  });
});
