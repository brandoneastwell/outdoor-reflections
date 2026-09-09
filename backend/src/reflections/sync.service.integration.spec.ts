import { Test, type TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../database/database.module';
import { PrismaService } from '../database/prisma.service';
import { ReflectionsRepository } from './reflections.repository';
import { SyncService } from './sync.service';
import { ReflectionDto, toReflectionDto } from './reflection.types';
import { ConfigModule } from '@nestjs/config';
import { seedExplicitReflections } from '../database/db.seed.helpers';
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
    testReflections = [];
    reflections.forEach((r) => {
      r.userId === user.id && testReflections.push(toReflectionDto(r));
    });
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
});
