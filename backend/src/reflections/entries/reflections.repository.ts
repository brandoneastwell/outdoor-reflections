import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  ReflectionDto,
  ReflectionSchema,
  SyncResults,
  toReflectionDto,
} from './reflection.types';
import { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class ReflectionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(entry: ReflectionDto, userId: number): Promise<ReflectionDto> {
    const reflection = await this.prisma.reflection.create({
      data: {
        id: entry.id,
        userId,
        title: entry.title,
        content: entry.content,
        date: new Date(entry.date),
        drawingPaths: entry.drawingPaths,
        lastSyncedAt: new Date(),
        lastEditedAt: new Date(entry.lastEditedAt),
      },
    });

    return toReflectionDto(reflection);
  }

  async delete(
    reflectionId: string,
    userId: number,
  ): Promise<ReflectionDto | null> {
    const reflection = await this.prisma.reflection.findFirst({
      where: {
        id: reflectionId,
        userId,
      },
    });

    if (!reflection) {
      return null;
    }

    const deleted = await this.prisma.reflection.delete({
      where: {
        id: reflectionId,
      },
    });

    return toReflectionDto(deleted);
  }

  async upsertMany(reflectionEntries: ReflectionDto[], userId: number) {
    const results: SyncResults = {
      entriesSynced: [],
      entriesCreated: [],
      entriesFailed: [],
    };

    await this.prisma.$transaction(async (tx) => {
      for (const entry of reflectionEntries) {
        const validation = ReflectionSchema.safeParse(entry);
        if (!validation.success) {
          results.entriesFailed.push({
            entryId: entry.id,
            error: validation.error.message,
          });
          continue;
        }

        const existing = await tx.reflection.findUnique({
          where: { id: entry.id },
        });

        if (entry.deletedAt) {
          if (!existing || existing.userId === userId) {
            const deletedAt = new Date(entry.deletedAt);
            const marker = {
              title: '',
              content: [],
              drawingPaths: [],
              deletedAt,
              lastEditedAt: deletedAt,
              lastSyncedAt: new Date(),
            };

            if (!existing) {
              await tx.reflection.createMany({
                data: {
                  id: entry.id,
                  userId,
                  date: new Date(entry.date),
                  createdAt: new Date(entry.createdAt ?? entry.lastEditedAt),
                  ...marker,
                },
                skipDuplicates: true,
              });
            }

            await tx.reflection.updateMany({
              where: { id: entry.id, userId, deletedAt: null },
              data: marker,
            });
            const acknowledged = await tx.reflection.findFirst({
              where: { id: entry.id, userId, deletedAt: { not: null } },
            });
            if (acknowledged) {
              await tx.reflectionSuggestion.deleteMany({
                where: { reflectionId: acknowledged.id },
              });
              results.entriesSynced.push(acknowledged);
              continue;
            }
          }
          results.entriesFailed.push({
            entryId: entry.id,
            error: 'Unable to delete reflection',
          });
          continue;
        }

        if (existing?.userId === userId && existing.deletedAt) {
          results.entriesSynced.push(existing);
          continue;
        }

        if (!existing) {
          try {
            const res = await tx.reflection.create({
              data: {
                id: entry.id,
                userId,
                title: entry.title,
                content: entry.content,
                date: new Date(entry.date),
                drawingPaths: entry.drawingPaths,
                createdAt: new Date(entry.createdAt),
                lastSyncedAt: new Date(),
                lastEditedAt: new Date(entry.lastEditedAt),
              },
            });

            results.entriesCreated.push(res);
            continue;
          } catch (error) {
            if (error instanceof Prisma.PrismaClientValidationError) {
              results.entriesFailed.push({
                entryId: entry.id,
                error: error.message,
              });
              continue;
            }
            console.error('Error creating reflection:', error);
          }
        }

        if (existing && existing.userId !== userId) continue;
        if (existing && existing.lastEditedAt > new Date(entry.lastEditedAt))
          continue;

        try {
          const res = await tx.reflection.update({
            where: {
              id: entry.id,
              userId,
              deletedAt: null,
              lastEditedAt: {
                lt: entry.lastEditedAt,
              },
            },
            data: {
              title: entry.title,
              content: entry.content,
              date: new Date(entry.date),
              drawingPaths: entry.drawingPaths,
              lastSyncedAt: new Date(),
            },
          });

          results.entriesSynced.push(res);
        } catch (error) {
          if (error instanceof Prisma.PrismaClientValidationError) {
            results.entriesFailed.push({
              entryId: entry.id,
              error: error.message,
            });
          }
        }
      }
    });

    return results;
  }
}
