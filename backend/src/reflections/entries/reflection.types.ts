import type { Reflection } from '../../../generated/prisma/client';
import { z } from 'zod';

const metadata = {
  id: z.guid(),
  revision: z.guid(),
  lastEditedAt: z.iso.datetime(),
};

export const EncryptedReflectionSchema = z.strictObject({
  ...metadata,
  deletedAt: z.nullish(z.null()),
  payload: z.strictObject({
    version: z.literal(1),
    iv: z.base64().length(16),
    ciphertext: z.base64().min(24).max(10_000_000),
  }),
});

export const ReflectionSchema = z.union([
  EncryptedReflectionSchema,
  z.strictObject({
    ...metadata,
    deletedAt: z.iso.datetime(),
    payload: z.null(),
  }),
]);

export type ReflectionDto = z.infer<typeof ReflectionSchema>;
export type SyncAcknowledgement = {
  id: string;
  revision: string;
  lastEditedAt: string;
  deletedAt: string | null;
};

export type SyncResponse = {
  synced_entries: SyncAcknowledgement[];
  timestamp: string;
  service_name: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  duration_ms: number;
  count: { total: number; updated: number; created: number; failed: number };
  errors?: { entryId: string; error: string }[];
};

export type SyncResults = {
  entriesSynced: SyncAcknowledgement[];
  entriesCreated: SyncAcknowledgement[];
  entriesFailed: { entryId: string; error: string }[];
};

export function toReflectionDto(reflection: Reflection): SyncAcknowledgement {
  return {
    id: reflection.id,
    revision: reflection.revision,
    lastEditedAt: reflection.lastEditedAt.toISOString(),
    deletedAt: reflection.deletedAt?.toISOString() ?? null,
  };
}
