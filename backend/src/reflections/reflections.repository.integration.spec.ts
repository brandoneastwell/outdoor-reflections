import { PrismaService } from '../database/prisma.service';
import { Test } from '@nestjs/testing';
import { ReflectionsRepository } from './reflections.repository';
import { DatabaseModule } from '../database/database.module';
import { randomUUID } from 'node:crypto';
import { ReflectionDto } from './reflection.types';
import { ConfigModule } from '@nestjs/config';

describe('ReflectionsRepository', () => {
  let reflectionRepository: ReflectionsRepository;
  let prisma: PrismaService;

  const testData = { email: 'test@gmail.com', password: 'test' };
  let testUserID: number;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
  });

  beforeEach(async () => {
    const app = await Test.createTestingModule({
      imports: [
        DatabaseModule,
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
      providers: [ReflectionsRepository],
    }).compile();

    reflectionRepository = app.get(ReflectionsRepository);
    prisma = app.get(PrismaService);

    const res = await prisma.userAccount.upsert({
      create: testData,
      update: testData,
      where: { email: testData.email },
    });

    testUserID = res.id;
  });

  afterAll(async () => {
    await prisma.userAccount.delete({
      where: { id: testUserID },
    });
    await prisma.$disconnect();
  });

  it('should create a new reflections entry in reflections table', async () => {
    const entry: ReflectionDto = {
      date: new Date().toISOString(),
      id: randomUUID(),
      lastSyncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      lastEditedAt: new Date().toISOString(),
      title: 'test entry',
      content: ['it is day 3'],
      drawingPaths: [],
    };

    const before = await prisma.reflection.count();
    await reflectionRepository.create(entry, testUserID);
    const after = await prisma.reflection.count();
    expect(after).toBe(before + 1);
  });

  it('should delete a reflections entry from reflections table', async () => {
    const entry = await prisma.reflection.create({
      data: {
        id: randomUUID(),
        userId: testUserID,
        title: 'test',
        lastEditedAt: new Date().toISOString(),
      },
    });

    await reflectionRepository.delete(entry.id, testUserID);
    const res = await prisma.reflection.findFirst({
      where: { id: entry.id },
    });
    expect(res).toBe(null);
  });
});
