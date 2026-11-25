import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from './prisma.service';

export const seedUser = (email: string, prisma: PrismaService) =>
  prisma.userAccount.create({ data: { email, password: 'password123' } });

export const encryptedFixture = () => ({
  version: 1 as const,
  iv: randomBytes(12).toString('base64'),
  ciphertext: randomBytes(48).toString('base64'),
});

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
      revision: randomUUID(),
      payload: encryptedFixture(),
      createdAt: date,
      lastSyncedAt: date,
      lastEditedAt: date,
    },
  });
};
