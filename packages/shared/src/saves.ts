export interface SaveSyncRequestDTO {
  system: string;
  romName: string;
  slot: string;
  sramBase64: string;
  sha256: string;
  timestamp: number;
}

export interface SaveSyncResponseDTO {
  success: boolean;
  revision: number;
  slot: string;
  savedAt: string;
}

export interface TvLockStatusDTO {
  isLocked: boolean;
  activeOnTv: boolean;
  currentRom?: string;
  lockedSince?: string;
}

export interface SaveSlotDTO {
  slot: string;
  isTvShared: boolean;
  lastModified: string;
  fileSizeBytes: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSaveSyncRequest(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Payload must be a non-null object'] };
  }

  const req = data as Partial<SaveSyncRequestDTO>;

  if (!req.system || typeof req.system !== 'string' || req.system.trim().length === 0) {
    errors.push('system is required and must be a non-empty string');
  }

  if (!req.romName || typeof req.romName !== 'string' || req.romName.trim().length === 0) {
    errors.push('romName is required and must be a non-empty string');
  }

  if (!req.slot || typeof req.slot !== 'string' || req.slot.trim().length === 0) {
    errors.push('slot is required and must be a non-empty string');
  }

  if (!req.sramBase64 || typeof req.sramBase64 !== 'string') {
    errors.push('sramBase64 is required and must be a valid base64 string');
  }

  if (!req.sha256 || typeof req.sha256 !== 'string' || req.sha256.length !== 64) {
    errors.push('sha256 is required and must be a 64-character hex string');
  }

  if (typeof req.timestamp !== 'number' || isNaN(req.timestamp)) {
    errors.push('timestamp is required and must be a valid numeric timestamp');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
