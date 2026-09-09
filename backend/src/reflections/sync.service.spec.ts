import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { ReflectionsRepository } from './reflections.repository';
import { SyncService } from './sync.service';
import { ReflectionDto } from './reflection.types';
import type { SafeUser } from '../user/user.types';

describe('SyncService', () => {
  let syncService: SyncService;

  const mockReflectionRepo = {
    upsertMany: jest.fn(),
  };

  const user: SafeUser = {
    id: 42,
    email: 'sam@example.com',
  };

  const entry: ReflectionDto = {
    id: randomUUID(),
    title: 'daily reflection',
    content: ['first note'],
    date: new Date('2026-08-13T10:00:00.000Z').toISOString(),
    drawingPaths: [],
    lastSyncedAt: new Date('2026-08-13T10:00:00.000Z').toISOString(),
    lastEditedAt: new Date('2026-08-13T10:00:00.000Z').toISOString(),
    createdAt: new Date('2026-08-13T10:00:00.000Z').toISOString(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest
      .spyOn(process, 'hrtime')
      .mockImplementation(() => [0, 0] as [number, number]);

    const app = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: ReflectionsRepository,
          useValue: mockReflectionRepo,
        },
      ],
    }).compile();

    syncService = app.get(SyncService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns an error result for an empty batch', async () => {
    await expect(syncService.syncEntries([], user)).rejects.toThrow(Error);
    expect(mockReflectionRepo.upsertMany).not.toHaveBeenCalled();
  });

  it('reports success when every entry syncs cleanly', async () => {
    mockReflectionRepo.upsertMany.mockResolvedValue({
      entriesSynced: [entry],
      entriesCreated: [],
      entriesFailed: [],
    });

    await expect(syncService.syncEntries([entry], user)).resolves.toMatchObject(
      {
        status: 'SUCCESS',
        count: {
          total: 1,
          synced: 1,
          failed: 0,
        },
        service_name: 'reflections_sync_service',
        errors: [],
      },
    );

    expect(mockReflectionRepo.upsertMany).toHaveBeenCalledWith(
      [entry],
      user.id,
    );
  });

  it('reports partial when at least one entry fails and some still sync', async () => {
    mockReflectionRepo.upsertMany.mockResolvedValue({
      entriesSynced: [entry],
      entriesCreated: [],
      entriesFailed: [{ entryId: entry.id, error: 'invalid date' }],
    });

    await expect(syncService.syncEntries([entry], user)).resolves.toMatchObject(
      {
        status: 'PARTIAL',
        count: {
          total: 1,
          synced: 1,
          failed: 1,
        },
        errors: [{ entryId: entry.id, error: 'invalid date' }],
      },
    );
  });

  it('reports failure when every entry fails', async () => {
    mockReflectionRepo.upsertMany.mockResolvedValue({
      entriesSynced: [],
      entriesCreated: [],
      entriesFailed: [{ entryId: entry.id, error: 'validation failed' }],
    });

    await expect(syncService.syncEntries([entry], user)).resolves.toMatchObject(
      {
        status: 'FAILED',
        count: {
          total: 1,
          synced: 0,
          failed: 1,
        },
      },
    );
  });
});
