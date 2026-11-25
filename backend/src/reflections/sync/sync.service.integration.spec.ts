import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { DatabaseModule } from '../../database/database.module';
import {
  encryptedFixture,
  seedReflection,
} from '../../database/db.seed.helpers';
import { PrismaService } from '../../database/prisma.service';
import { ReflectionsRepository } from '../entries/reflections.repository';
import { ReflectionDto } from '../entries/reflection.types';
import { SyncService } from './sync.service';

describe('SyncService integration', () => {
  let app: TestingModule;
  let prisma: PrismaService;
  let syncService: SyncService;
  let user: { id: number; email: string };
  let original: ReflectionDto;
  const users: number[] = [];
  const editTime = '2026-08-13T12:00:00.000Z';

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [
        DatabaseModule,
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
      ],
      providers: [SyncService, ReflectionsRepository],
    }).compile();
    prisma = app.get(PrismaService);
    syncService = app.get(SyncService);
  });

  async function createUser() {
    const account = await prisma.userAccount.create({
      data: {
        email: `sync-${randomUUID()}@example.com`,
        password: 'test-only',
      },
    });
    users.push(account.id);
    return account;
  }

  beforeEach(async () => {
    user = await createUser();
    const stored = await seedReflection(user.id, randomUUID(), 0, 0, prisma);
    original = {
      id: stored.id,
      revision: stored.revision,
      lastEditedAt: stored.lastEditedAt.toISOString(),
      payload: encryptedFixture(),
    };
  });

  afterAll(async () => {
    if (users.length)
      await prisma.userAccount.deleteMany({ where: { id: { in: users } } });
    await app.close();
  });

  it('updates ciphertext, records the revision, and returns metadata only', async () => {
    const entry = {
      ...original,
      revision: randomUUID(),
      lastEditedAt: editTime,
    };
    const response = await syncService.syncEntries([entry], user);
    expect(response).toMatchObject({
      status: 'SUCCESS',
      count: { updated: 1, created: 0 },
    });
    expect(response.synced_entries).toEqual([
      {
        id: entry.id,
        revision: entry.revision,
        lastEditedAt: editTime,
        deletedAt: null,
      },
    ]);
    expect(
      await prisma.reflection.findUniqueOrThrow({ where: { id: entry.id } }),
    ).toMatchObject({
      revision: entry.revision,
      payload: entry.payload,
      lastEditedAt: new Date(editTime),
    });
  });

  it('creates and retries an encrypted entry while rejecting plaintext in the same batch', async () => {
    const entry = { ...original, id: randomUUID(), revision: randomUUID() };
    const plaintext = {
      id: randomUUID(),
      title: 'Private title',
      content: ['Private text'],
    };
    const unexpectedFields = {
      ...entry,
      id: randomUUID(),
      title: 'Private title',
    };
    const response = await syncService.syncEntries(
      [entry, plaintext, unexpectedFields],
      user,
    );
    expect(response).toMatchObject({
      status: 'PARTIAL',
      count: { created: 1, failed: 2 },
    });
    expect(
      await prisma.reflection.findUnique({ where: { id: plaintext.id } }),
    ).toBeNull();
    expect(
      await prisma.reflection.findUnique({
        where: { id: unexpectedFields.id },
      }),
    ).toBeNull();
    const retry = await syncService.syncEntries([entry], user);
    expect(retry.synced_entries).toEqual(response.synced_entries);
  });

  it('keeps the deletion marker, clears ciphertext, and rejects resurrection', async () => {
    const deletion = {
      id: original.id,
      revision: randomUUID(),
      lastEditedAt: editTime,
      deletedAt: editTime,
      payload: null,
    };
    const deleted = await syncService.syncEntries([deletion], user);
    expect(deleted.synced_entries).toEqual([
      {
        id: deletion.id,
        revision: deletion.revision,
        lastEditedAt: editTime,
        deletedAt: editTime,
      },
    ]);
    const retry = await syncService.syncEntries(
      [{ ...deletion, revision: randomUUID() }],
      user,
    );
    const stale = await syncService.syncEntries(
      [
        {
          ...original,
          lastEditedAt: '2026-08-14T12:00:00.000Z',
        },
      ],
      user,
    );
    expect(retry.synced_entries).toEqual(deleted.synced_entries);
    expect(stale.synced_entries).toEqual(deleted.synced_entries);
    expect(
      await prisma.reflection.findUniqueOrThrow({
        where: { id: original.id },
      }),
    ).toMatchObject({
      userId: user.id,
      deletedAt: new Date(editTime),
      payload: null,
    });
  });

  it('records a deletion before the first upload and rejects another owner’s deletion', async () => {
    const other = await createUser();
    const deletion = {
      id: original.id,
      revision: randomUUID(),
      lastEditedAt: editTime,
      deletedAt: editTime,
      payload: null,
    };
    expect(await syncService.syncEntries([deletion], other)).toMatchObject({
      status: 'FAILED',
    });
    expect(
      await prisma.reflection.findUniqueOrThrow({ where: { id: original.id } }),
    ).toMatchObject({ userId: user.id, deletedAt: null });
    const newId = randomUUID();
    const result = await syncService.syncEntries(
      [{ ...deletion, id: newId }],
      user,
    );
    const stale = await syncService.syncEntries(
      [{ ...original, id: newId }],
      user,
    );
    expect(result.status).toBe('SUCCESS');
    expect(stale.count.created).toBe(0);
    expect(stale.synced_entries).toEqual(result.synced_entries);
  });
});
