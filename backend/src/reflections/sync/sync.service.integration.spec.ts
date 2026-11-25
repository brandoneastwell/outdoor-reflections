import { Test, type TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../../database/database.module';
import { PrismaService } from '../../database/prisma.service';
import { ReflectionsRepository } from '../entries/reflections.repository';
import { SyncService } from './sync.service';
import { ReflectionDto, toReflectionDto } from '../entries/reflection.types';
import { ConfigModule } from '@nestjs/config';
import { seedExplicitReflections } from '../../database/db.seed.helpers';
import { randomUUID } from 'node:crypto';

describe('SyncService integration', () => {
  let app: TestingModule;
  let prisma: PrismaService;
  let syncService: SyncService;
  let testUser: { id: number; email: string };
  let testReflections: ReflectionDto[];
  const reflectionId = '11111111-1111-1111-1111-111111111111';

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [
        DatabaseModule,
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
      providers: [SyncService, ReflectionsRepository],
    }).compile();

    prisma = app.get(PrismaService);
    syncService = app.get(SyncService);
  });

  beforeEach(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.reflection.deleteMany();
    await prisma.userAccount.deleteMany();

    const { user, reflections } = await seedExplicitReflections(
      prisma,
      reflectionId,
    );
    testUser = user;
    testReflections = reflections
      .filter((reflection) => reflection.userId === user.id)
      .map((reflection) => toReflectionDto({ ...reflection, deletedAt: null }));
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('updates an existing reflection and returns a success response', async () => {
    const baseDate = new Date('2026-08-13T09:00:00.000Z').toISOString();
    const nextDate = new Date('2026-08-13T10:30:00.000Z').toISOString();

    const entry: ReflectionDto = {
      id: reflectionId,
      title: 'updated title',
      content: ['updated content'],
      date: nextDate,
      drawingPaths: [{ path: 'M0 0L10 10', color: '#000000' }],
      lastSyncedAt: nextDate,
      lastEditedAt: nextDate,
      createdAt: baseDate,
    };

    const result = await syncService.syncEntries([entry], testUser);

    expect(result).toMatchObject({
      status: 'SUCCESS',
      count: {
        total: 1,
        updated: 1,
        created: 0,
        failed: 0,
      },
      service_name: 'reflections_sync_service',
      errors: [],
    });

    const persisted = await prisma.reflection.findUnique({
      where: { id: reflectionId },
    });

    expect(persisted).not.toBeNull();
    expect(persisted).toMatchObject({
      id: reflectionId,
      userId: testUser.id,
      title: 'updated title',
      content: ['updated content'],
      drawingPaths: [{ path: 'M0 0L10 10', color: '#000000' }],
      lastEditedAt: new Date('2026-08-01T09:00:00.000Z'),
    });
    expect(persisted!.date.toISOString()).toBe('2026-08-13T00:00:00.000Z');
  });

  it('creates a new reflection and returns a success response with created count > 0', async () => {
    const baseDate = new Date('2026-08-13T09:00:00.000Z').toISOString();
    const nextDate = new Date('2026-08-13T10:30:00.000Z').toISOString();

    const entry: ReflectionDto = {
      id: randomUUID(),
      title: 'updated title',
      content: ['updated content'],
      date: nextDate,
      drawingPaths: [{ path: 'M0 0L10 10', color: '#000000' }],
      lastSyncedAt: nextDate,
      lastEditedAt: nextDate,
      createdAt: baseDate,
    };

    const result = await syncService.syncEntries([entry], testUser);

    expect(result).toMatchObject({
      status: 'SUCCESS',
      count: {
        total: 1,
        updated: 0,
        created: 1,
        failed: 0,
      },
    });
  });

  it('updates many entries with a successful sync', async () => {
    const title = 'new title';
    const entriesToUpdate = testReflections.map((r) => {
      r.title = title;
      r.lastEditedAt = new Date().toISOString();
      return r;
    });

    const result = await syncService.syncEntries(
      [...entriesToUpdate],
      testUser,
    );

    expect(result).toMatchObject({
      status: 'SUCCESS',
      count: {
        total: entriesToUpdate.length,
        updated: entriesToUpdate.length,
        created: 0,
        failed: 0,
      },
      errors: [],
    });
  });

  it('returns a partial response when some entries fail to sync', async () => {
    const updatedEntry: ReflectionDto = {
      ...testReflections[0],
      title: 'partial success title',
      lastEditedAt: new Date('2026-08-13T11:00:00.000Z').toISOString(),
    };

    const brokenEntry = {
      ...testReflections[1],
      title: 'broken entry',
      content: 'this should fail validation',
      lastEditedAt: new Date('2026-08-13T11:30:00.000Z').toISOString(),
    } as unknown as ReflectionDto;

    const result = await syncService.syncEntries(
      [updatedEntry, brokenEntry],
      testUser,
    );

    expect(result.status).toBe('PARTIAL');
    expect(result.count.total).toBe(2);
    expect(result.count.updated).toBe(1);
    expect(result.count.failed).toBeGreaterThan(0);
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entryId: brokenEntry.id,
        }),
      ]),
    );
  });

  it('keeps only the deletion marker and removes the stored journal data and suggestions', async () => {
    const original = testReflections[0];
    const deletedAt = '2026-08-13T12:00:00.000Z';
    const beforeDeletion = await prisma.reflection.update({
      where: { id: original.id },
      data: {
        title: 'Trail journal',
        content: ['Journal notes'],
        drawingPaths: [{ path: 'M0 0L10 10', color: '#000000' }],
        suggestions: {
          create: { type: 'sentence_starter', text: 'I saw a wren' },
        },
      },
    });

    await syncService.syncEntries([{ ...original, deletedAt }], testUser);

    const persisted = await prisma.reflection.findUniqueOrThrow({
      where: { id: original.id },
      include: { suggestions: true },
    });
    expect(persisted).toMatchObject({
      id: original.id,
      userId: testUser.id,
      date: beforeDeletion.date,
      createdAt: beforeDeletion.createdAt,
      deletedAt: new Date(deletedAt),
      lastEditedAt: new Date(deletedAt),
      title: '',
      content: [],
      drawingPaths: [],
      suggestions: [],
    });
  });

  it('acknowledges a deletion on retry and ignores a later upload for the deleted ID', async () => {
    const original = testReflections[0];
    const deletedAt = '2026-08-13T12:00:00.000Z';
    const deletion = { ...original, deletedAt };
    const attempts = [
      deletion,
      { ...deletion, deletedAt: '2026-08-13T12:01:00.000Z' },
      { ...original, lastEditedAt: '2026-08-14T12:00:00.000Z' },
    ];

    for (const entry of attempts) {
      const response = await syncService.syncEntries([entry], testUser);
      expect(response.status).toBe('SUCCESS');
      expect(response.synced_entries).toEqual([
        expect.objectContaining({
          id: original.id,
          deletedAt: new Date(deletedAt),
          title: '',
          content: [],
          drawingPaths: [],
        }),
      ]);
    }
  });

  it('blocks a later first upload for an entry deleted before it reached the server', async () => {
    const original = {
      ...testReflections[0],
      id: randomUUID(),
      title: 'Unsent reflection',
      content: ['Unsent journal notes'],
    };
    const deletedAt = '2026-08-13T12:00:00.000Z';

    const deletion = await syncService.syncEntries(
      [{ ...original, deletedAt }],
      testUser,
    );
    const staleUpload = await syncService.syncEntries([original], testUser);

    expect(deletion.status).toBe('SUCCESS');
    expect(deletion.synced_entries).toHaveLength(1);
    expect(staleUpload.status).toBe('SUCCESS');
    expect(staleUpload.count.created).toBe(0);
    expect(staleUpload.synced_entries).toEqual(deletion.synced_entries);
    expect(
      await prisma.reflection.findUniqueOrThrow({ where: { id: original.id } }),
    ).toMatchObject({
      userId: testUser.id,
      deletedAt: new Date(deletedAt),
      title: '',
      content: [],
    });
  });

  it('rejects a deletion for a reflection owned by another user', async () => {
    const otherUser = await prisma.userAccount.create({
      data: { email: 'deletion-test@example.com' },
    });
    const deletion = {
      ...testReflections[0],
      deletedAt: '2026-08-13T12:00:00.000Z',
    };

    const response = await syncService.syncEntries([deletion], otherUser);

    expect(response.status).toBe('FAILED');
    expect(response.synced_entries).toEqual([]);
    expect(
      await prisma.reflection.findUnique({ where: { id: deletion.id } }),
    ).toMatchObject({ userId: testUser.id, deletedAt: null });
  });
});
