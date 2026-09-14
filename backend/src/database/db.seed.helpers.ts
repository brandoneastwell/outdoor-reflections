import { PrismaService } from './prisma.service';

export const seedUser = (email: string, prisma: PrismaService) => {
  return prisma.userAccount.create({
    data: {
      email,
      password: 'password123',
    },
  });
};

export const seedReflection = (
  userId: number,
  id: string,
  index: number,
  dayOffset: number,
  prisma: PrismaService,
) => {
  const date = new Date(Date.UTC(2026, 7, 1 + dayOffset, 9, index % 60, 0));

  return prisma.reflection.create({
    data: {
      id,
      userId,
      title: `seeded reflection ${index}`,
      content: [`seeded content ${index}`, `seeded detail ${index}`],
      date,
      drawingPaths: [
        {
          path: `M0 ${index}L10 ${index + 10}`,
          color: index % 2 === 0 ? '#111111' : '#222222',
        },
      ],
      createdAt: date,
      lastSyncedAt: date,
      lastEditedAt: date,
    },
  });
};

export const seedExplicitReflections = async (
  prisma: PrismaService,
  reflectionId: string,
) => {
  const primaryUser = await prisma.userAccount.create({
    data: {
      email: 'primary.sync@example.com',
      password: 'password123',
    },
  });

  const archiveUser = await prisma.userAccount.create({
    data: {
      email: 'archive.sync@example.com',
      password: 'password123',
    },
  });

  const collaboratorUser = await prisma.userAccount.create({
    data: {
      email: 'collab.sync@example.com',
      password: 'password123',
    },
  });

  const primaryReflectionSeeds = [
    {
      id: reflectionId,
      userId: primaryUser.id,
      title: 'before sync',
      content: ['first draft', 'needs cleanup'],
      date: new Date('2026-08-01T09:00:00.000Z'),
      drawingPaths: [{ path: 'M0 0L4 4', color: '#111111' }],
      createdAt: new Date('2026-08-01T09:00:00.000Z'),
      lastSyncedAt: new Date('2026-08-01T09:00:00.000Z'),
      lastEditedAt: new Date('2026-08-01T09:00:00.000Z'),
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      userId: primaryUser.id,
      title: 'morning walk',
      content: ['trail conditions', 'clear sky'],
      date: new Date('2026-08-02T09:00:00.000Z'),
      drawingPaths: [{ path: 'M0 1L5 6', color: '#222222' }],
      createdAt: new Date('2026-08-02T09:00:00.000Z'),
      lastSyncedAt: new Date('2026-08-02T09:00:00.000Z'),
      lastEditedAt: new Date('2026-08-02T09:00:00.000Z'),
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      userId: primaryUser.id,
      title: 'evening notes',
      content: ['light fading', 'pack early'],
      date: new Date('2026-08-03T09:00:00.000Z'),
      drawingPaths: [{ path: 'M1 0L6 5', color: '#333333' }],
      createdAt: new Date('2026-08-03T09:00:00.000Z'),
      lastSyncedAt: new Date('2026-08-03T09:00:00.000Z'),
      lastEditedAt: new Date('2026-08-03T09:00:00.000Z'),
    },
    {
      id: '77777777-7777-7777-7777-777777777777',
      userId: primaryUser.id,
      title: 'ridge line',
      content: ['wind picked up', 'pause near the summit'],
      date: new Date('2026-08-04T09:00:00.000Z'),
      drawingPaths: [{ path: 'M0 2L6 8', color: '#777777' }],
      createdAt: new Date('2026-08-04T09:00:00.000Z'),
      lastSyncedAt: new Date('2026-08-04T09:00:00.000Z'),
      lastEditedAt: new Date('2026-08-04T09:00:00.000Z'),
    },
    {
      id: '88888888-8888-8888-8888-888888888888',
      userId: primaryUser.id,
      title: 'lake edge',
      content: ['quiet water', 'one canoe'],
      date: new Date('2026-08-05T09:00:00.000Z'),
      drawingPaths: [{ path: 'M1 3L7 9', color: '#888888' }],
      createdAt: new Date('2026-08-05T09:00:00.000Z'),
      lastSyncedAt: new Date('2026-08-05T09:00:00.000Z'),
      lastEditedAt: new Date('2026-08-05T09:00:00.000Z'),
    },
    {
      id: '99999999-9999-9999-9999-999999999999',
      userId: primaryUser.id,
      title: 'rain break',
      content: ['held under trees', 'waiting for a gap'],
      date: new Date('2026-08-06T09:00:00.000Z'),
      drawingPaths: [{ path: 'M2 4L8 10', color: '#999999' }],
      createdAt: new Date('2026-08-06T09:00:00.000Z'),
      lastSyncedAt: new Date('2026-08-06T09:00:00.000Z'),
      lastEditedAt: new Date('2026-08-06T09:00:00.000Z'),
    },
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      userId: primaryUser.id,
      title: 'trail junction',
      content: ['left fork looked steep', 'right fork looked muddy'],
      date: new Date('2026-08-07T09:00:00.000Z'),
      drawingPaths: [{ path: 'M3 1L9 7', color: '#aaaaaa' }],
      createdAt: new Date('2026-08-07T09:00:00.000Z'),
      lastSyncedAt: new Date('2026-08-07T09:00:00.000Z'),
      lastEditedAt: new Date('2026-08-07T09:00:00.000Z'),
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      userId: primaryUser.id,
      title: 'camp setup',
      content: ['tent east-facing', 'firewood stacked'],
      date: new Date('2026-08-08T09:00:00.000Z'),
      drawingPaths: [{ path: 'M4 2L10 8', color: '#bbbbbb' }],
      createdAt: new Date('2026-08-08T09:00:00.000Z'),
      lastSyncedAt: new Date('2026-08-08T09:00:00.000Z'),
      lastEditedAt: new Date('2026-08-08T09:00:00.000Z'),
    },
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      userId: primaryUser.id,
      title: 'sunrise',
      content: ['fog in the valley', 'birds before dawn'],
      date: new Date('2026-08-09T09:00:00.000Z'),
      drawingPaths: [{ path: 'M5 0L11 6', color: '#cccccc' }],
      createdAt: new Date('2026-08-09T09:00:00.000Z'),
      lastSyncedAt: new Date('2026-08-09T09:00:00.000Z'),
      lastEditedAt: new Date('2026-08-09T09:00:00.000Z'),
    },
    {
      id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      userId: primaryUser.id,
      title: 'mossy rocks',
      content: ['slippery near stream', 'slow pace helped'],
      date: new Date('2026-08-10T09:00:00.000Z'),
      drawingPaths: [{ path: 'M6 1L12 7', color: '#dddddd' }],
      createdAt: new Date('2026-08-10T09:00:00.000Z'),
      lastSyncedAt: new Date('2026-08-10T09:00:00.000Z'),
      lastEditedAt: new Date('2026-08-10T09:00:00.000Z'),
    },
    {
      id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      userId: primaryUser.id,
      title: 'late lunch',
      content: ['trail mix', 'warm flask'],
      date: new Date('2026-08-11T09:00:00.000Z'),
      drawingPaths: [{ path: 'M7 2L13 8', color: '#eeeeee' }],
      createdAt: new Date('2026-08-11T09:00:00.000Z'),
      lastSyncedAt: new Date('2026-08-11T09:00:00.000Z'),
      lastEditedAt: new Date('2026-08-11T09:00:00.000Z'),
    },
    {
      id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      userId: primaryUser.id,
      title: 'final note',
      content: ['pack out trash', 'rest tomorrow'],
      date: new Date('2026-08-12T09:00:00.000Z'),
      drawingPaths: [{ path: 'M8 3L14 9', color: '#ffffff' }],
      createdAt: new Date('2026-08-12T09:00:00.000Z'),
      lastSyncedAt: new Date('2026-08-12T09:00:00.000Z'),
      lastEditedAt: new Date('2026-08-12T09:00:00.000Z'),
    },
  ];

  const reflectionSeeds = [
    ...primaryReflectionSeeds,
    {
      id: '44444444-4444-4444-4444-444444444444',
      userId: archiveUser.id,
      title: 'archive one',
      content: ['older context'],
      date: new Date('2026-08-04T09:00:00.000Z'),
      drawingPaths: [{ path: 'M2 2L8 8', color: '#444444' }],
      createdAt: new Date('2026-08-04T09:00:00.000Z'),
      lastSyncedAt: new Date('2026-08-04T09:00:00.000Z'),
      lastEditedAt: new Date('2026-08-04T09:00:00.000Z'),
    },
    {
      id: '55555555-5555-5555-5555-555555555555',
      userId: archiveUser.id,
      title: 'archive two',
      content: ['reference note', 'saved for later'],
      date: new Date('2026-08-05T09:00:00.000Z'),
      drawingPaths: [{ path: 'M3 3L9 9', color: '#555555' }],
      createdAt: new Date('2026-08-05T09:00:00.000Z'),
      lastSyncedAt: new Date('2026-08-05T09:00:00.000Z'),
      lastEditedAt: new Date('2026-08-05T09:00:00.000Z'),
    },
    {
      id: '66666666-6666-6666-6666-666666666666',
      userId: collaboratorUser.id,
      title: 'shared path',
      content: ['collaboration context'],
      date: new Date('2026-08-06T09:00:00.000Z'),
      drawingPaths: [{ path: 'M4 4L10 10', color: '#666666' }],
      createdAt: new Date('2026-08-06T09:00:00.000Z'),
      lastSyncedAt: new Date('2026-08-06T09:00:00.000Z'),
      lastEditedAt: new Date('2026-08-06T09:00:00.000Z'),
    },
  ];

  await prisma.reflection.createMany({
    data: reflectionSeeds,
  });

  return { user: primaryUser, reflections: reflectionSeeds };
};
