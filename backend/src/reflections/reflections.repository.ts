import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  ReflectionDto,
  ReflectionSchema,
  SyncResults,
  toReflectionDto,
} from './reflection.types';
import { Prisma } from '../../generated/prisma/client';

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
          select: {
            userId: true,
            lastEditedAt: true,
          },
        });

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
