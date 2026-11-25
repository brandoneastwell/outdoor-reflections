import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  ReflectionDto,
  ReflectionSchema,
  SyncAcknowledgement,
  SyncResults,
  toReflectionDto,
} from './reflection.types';
import { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class ReflectionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    entry: ReflectionDto,
    userId: number,
  ): Promise<SyncAcknowledgement> {
    const reflection = await this.prisma.reflection.create({
      data: {
        id: entry.id,
        userId,
        revision: entry.revision,
        payload: entry.payload ?? Prisma.DbNull,
        lastEditedAt: new Date(entry.lastEditedAt),
      },
    });
    return toReflectionDto(reflection);
  }

  async delete(reflectionId: string, userId: number): Promise<void> {
    await this.prisma.reflection.deleteMany({
      where: { id: reflectionId, userId },
    });
  }

  async upsertMany(
    reflectionEntries: unknown[],
    userId: number,
  ): Promise<SyncResults> {
    const results: SyncResults = {
      entriesSynced: [],
      entriesCreated: [],
      entriesFailed: [],
    };

    await this.prisma.$transaction(async (tx) => {
      for (const candidate of reflectionEntries) {
        const validation = ReflectionSchema.safeParse(candidate);
        if (!validation.success) {
          const id =
            typeof candidate === 'object' &&
            candidate !== null &&
            'id' in candidate &&
            typeof candidate.id === 'string'
              ? candidate.id
              : '';
          results.entriesFailed.push({
            entryId: id,
            error: 'Expected an encrypted reflection or deletion marker',
          });
          continue;
        }

        const { id, revision, payload, deletedAt } = validation.data;
        const lastEditedAt = new Date(validation.data.lastEditedAt);
        const where = { id, userId };
        const data = {
          revision,
          payload: payload ?? Prisma.DbNull,
          deletedAt: deletedAt ? new Date(deletedAt) : null,
          lastEditedAt,
          lastSyncedAt: new Date(),
        };

        const inserted = await tx.reflection.createMany({
          data: { ...where, ...data },
          skipDuplicates: true,
        });
        if (!inserted.count) {
          await tx.reflection.updateMany({
            where: {
              ...where,
              deletedAt: null,
              ...(deletedAt
                ? {}
                : {
                    OR: [
                      { lastEditedAt: { lt: lastEditedAt } },
                      { lastEditedAt, revision: { lt: revision } },
                    ],
                  }),
            },
            data,
          });
        }

        const stored = await tx.reflection.findFirst({ where });
        if (!stored) {
          results.entriesFailed.push({
            entryId: id,
            error: 'Unable to sync reflection',
          });
          continue;
        }
        const target =
          inserted.count && !deletedAt
            ? results.entriesCreated
            : results.entriesSynced;
        target.push(toReflectionDto(stored));
      }
    });

    return results;
  }
}
