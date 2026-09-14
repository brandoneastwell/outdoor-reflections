import type { Reflection } from '../../generated/prisma/client';
import { z } from 'zod';

export const ReflectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.array(z.string()),
  date: z.iso.datetime(),
  drawingPaths: z.array(
    z.object({
      path: z.string(),
      color: z.string(),
    }).optional(),
  ),
  lastSyncedAt: z.iso.datetime().optional(),
  lastEditedAt: z.iso.datetime(),
  createdAt: z.iso.datetime().optional(),
});

export type SyncResponse = {
  synced_entries: Reflection[];
  timestamp: string;
  service_name: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  duration_ms: number;
  count: { total: number; updated: number; created: number; failed: number };
  errors?: { entryId: string; error: string }[];
};

export type SyncResults = {
  entriesSynced: Reflection[];
  entriesCreated: Reflection[];
  entriesFailed: { entryId: string; error: string }[];
}

export type DrawPath = {
  path: string;
  color: string;
};

export type ReflectionDto = {
  id: string;
  title: string;
  content: string[];
  date: string;
  drawingPaths: DrawPath[];
  lastSyncedAt: string | null;
  lastEditedAt: string;
  createdAt: string;
};

export function toReflectionDto(reflection: Reflection): ReflectionDto {
  return {
    id: reflection.id,
    title: reflection.title,
    content: reflection.content,
    date: reflection.date.toISOString(),
    drawingPaths: reflection.drawingPaths as DrawPath[],
    lastSyncedAt: reflection.lastSyncedAt?.toISOString() ?? null,
    createdAt: reflection.createdAt.toISOString(),
    lastEditedAt: reflection.lastEditedAt.toISOString(),
  };
}
