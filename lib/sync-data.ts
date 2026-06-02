import { eq, lt } from "drizzle-orm";

import { syncRooms } from "@/db/schema";
import { getDb } from "@/lib/db";
import {
  clampFontStep,
  clampManualSpeed,
  clampScrollRatio,
  generateSyncCode,
  getSyncExpiresAt,
  isSyncRoomExpired,
  isValidSyncCode,
  normalizeSyncCode,
  roomRowToState,
  type SyncRoomState,
} from "@/lib/sync";

export async function purgeExpiredSyncRooms(): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await db.delete(syncRooms).where(lt(syncRooms.expiresAt, now));
}

export async function getSyncRoom(code: string): Promise<SyncRoomState | null> {
  await purgeExpiredSyncRooms();
  const normalized = normalizeSyncCode(code);
  if (!isValidSyncCode(normalized)) {
    return null;
  }

  const db = getDb();
  const rows = await db.select().from(syncRooms).where(eq(syncRooms.code, normalized)).limit(1);
  const row = rows[0];
  if (!row || isSyncRoomExpired(row.expiresAt)) {
    if (row) {
      await db.delete(syncRooms).where(eq(syncRooms.code, normalized));
    }
    return null;
  }

  return roomRowToState(row);
}

type CreateSyncRoomInput = {
  songId: string;
  hostSecret: string;
  scrollRatio?: number;
  isPlaying?: boolean;
  manualSpeed?: number;
  fontStep?: number;
};

export async function createSyncRoom(input: CreateSyncRoomInput): Promise<SyncRoomState> {
  await purgeExpiredSyncRooms();
  const db = getDb();
  const now = new Date().toISOString();
  const expiresAt = getSyncExpiresAt();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateSyncCode();
    try {
      await db.insert(syncRooms).values({
        code,
        hostSecret: input.hostSecret,
        songId: input.songId,
        scrollRatio: clampScrollRatio(input.scrollRatio ?? 0),
        isPlaying: input.isPlaying ? 1 : 0,
        manualSpeed: clampManualSpeed(input.manualSpeed ?? 0.2),
        fontStep: clampFontStep(input.fontStep ?? 1),
        updatedAt: now,
        expiresAt,
      });
      const created = await getSyncRoom(code);
      if (!created) {
        throw new Error("Failed to load created sync room");
      }
      return created;
    } catch {
      // collision on code — retry
    }
  }

  throw new Error("Could not allocate sync room code");
}

type UpdateSyncRoomInput = {
  songId?: string;
  scrollRatio?: number;
  isPlaying?: boolean;
  manualSpeed?: number;
  fontStep?: number;
};

export async function updateSyncRoom(
  code: string,
  hostSecret: string,
  patch: UpdateSyncRoomInput,
): Promise<SyncRoomState | null> {
  const existing = await getSyncRoom(code);
  if (!existing) {
    return null;
  }

  const db = getDb();
  const rows = await db.select().from(syncRooms).where(eq(syncRooms.code, existing.code)).limit(1);
  const row = rows[0];
  if (!row || row.hostSecret !== hostSecret) {
    return null;
  }

  const now = new Date().toISOString();
  await db
    .update(syncRooms)
    .set({
      ...(patch.songId !== undefined ? { songId: patch.songId } : {}),
      ...(patch.scrollRatio !== undefined
        ? { scrollRatio: clampScrollRatio(patch.scrollRatio) }
        : {}),
      ...(patch.isPlaying !== undefined ? { isPlaying: patch.isPlaying ? 1 : 0 } : {}),
      ...(patch.manualSpeed !== undefined
        ? { manualSpeed: clampManualSpeed(patch.manualSpeed) }
        : {}),
      ...(patch.fontStep !== undefined ? { fontStep: clampFontStep(patch.fontStep) } : {}),
      updatedAt: now,
      expiresAt: getSyncExpiresAt(),
    })
    .where(eq(syncRooms.code, existing.code));

  return getSyncRoom(existing.code);
}

export async function deleteSyncRoom(code: string, hostSecret: string): Promise<boolean> {
  const normalized = normalizeSyncCode(code);
  if (!isValidSyncCode(normalized)) {
    return false;
  }

  const db = getDb();
  const rows = await db.select().from(syncRooms).where(eq(syncRooms.code, normalized)).limit(1);
  const row = rows[0];
  if (!row || row.hostSecret !== hostSecret) {
    return false;
  }

  await db.delete(syncRooms).where(eq(syncRooms.code, normalized));
  return true;
}
