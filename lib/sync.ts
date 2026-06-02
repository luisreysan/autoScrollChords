export const SYNC_CODE_LENGTH = 5;
export const SYNC_ROOM_TTL_MS = 2 * 60 * 60 * 1000;
export const MAX_FONT_STEP = 2;
export const MIN_FONT_STEP = 0;

export const SYNC_SESSION_STORAGE_KEY = "asc-sync-session";

export type SyncRole = "host" | "follower";

export type SyncSession = {
  role: SyncRole;
  code: string;
  hostSecret?: string;
};

export type SyncRoomState = {
  code: string;
  songId: string;
  scrollRatio: number;
  isPlaying: boolean;
  manualSpeed: number;
  fontStep: number;
  updatedAt: string;
};

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateSyncCode(): string {
  let code = "";
  for (let i = 0; i < SYNC_CODE_LENGTH; i += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]!;
  }
  return code;
}

export function normalizeSyncCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidSyncCode(code: string): boolean {
  return code.length === SYNC_CODE_LENGTH && /^[A-Z0-9]+$/.test(code);
}

export function clampScrollRatio(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

export function clampFontStep(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(MAX_FONT_STEP, Math.max(MIN_FONT_STEP, Math.floor(value)));
}

export function clampManualSpeed(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.2;
  }
  return Math.min(30, Math.max(0.1, value));
}

export function getSyncExpiresAt(fromMs: number = Date.now()): string {
  return new Date(fromMs + SYNC_ROOM_TTL_MS).toISOString();
}

export function isSyncRoomExpired(expiresAt: string, nowMs: number = Date.now()): boolean {
  const expires = Date.parse(expiresAt);
  return !Number.isFinite(expires) || expires <= nowMs;
}

export function loadSyncSession(): SyncSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(SYNC_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as SyncSession;
    if (
      (parsed.role !== "host" && parsed.role !== "follower") ||
      typeof parsed.code !== "string" ||
      !isValidSyncCode(normalizeSyncCode(parsed.code))
    ) {
      return null;
    }
    if (parsed.role === "host" && typeof parsed.hostSecret !== "string") {
      return null;
    }
    return {
      role: parsed.role,
      code: normalizeSyncCode(parsed.code),
      ...(parsed.hostSecret ? { hostSecret: parsed.hostSecret } : {}),
    };
  } catch {
    return null;
  }
}

export function saveSyncSession(session: SyncSession): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(SYNC_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSyncSession(): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(SYNC_SESSION_STORAGE_KEY);
}

export function roomRowToState(row: {
  code: string;
  songId: string;
  scrollRatio: number;
  isPlaying: number;
  manualSpeed: number;
  fontStep: number;
  updatedAt: string;
}): SyncRoomState {
  return {
    code: row.code,
    songId: row.songId,
    scrollRatio: clampScrollRatio(row.scrollRatio),
    isPlaying: row.isPlaying === 1,
    manualSpeed: clampManualSpeed(row.manualSpeed),
    fontStep: clampFontStep(row.fontStep),
    updatedAt: row.updatedAt,
  };
}
