import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { AccountSettingsService } from './account-settings.service';
import { AccountSettingsModule } from './account-settings.module';
import { DatabaseModule } from '../database/database.module';
import { PrismaService } from '../database/prisma.service';
import { seedUser } from '../database/db.seed.helpers';

it('defaults off, persists consent across sessions, and keeps accounts separate', async () => {
  const app = await Test.createTestingModule({
    imports: [DatabaseModule, AccountSettingsModule],
  }).compile();
  const prisma = app.get(PrismaService);
  const users: number[] = [];
  try {
    const first = await seedUser(
      `settings-${randomUUID()}@example.com`,
      prisma,
    );
    users.push(first.id);
    const second = await seedUser(
      `settings-${randomUUID()}@example.com`,
      prisma,
    );
    users.push(second.id);

    const settings = app.get(AccountSettingsService);
    await expect(settings.get(first.id)).resolves.toEqual({
      cloudAiEnabled: false,
    });
    await settings.setCloudAi(first.id, true);
    const anotherSession = new AccountSettingsService(prisma);
    await expect(anotherSession.get(first.id)).resolves.toEqual({
      cloudAiEnabled: true,
    });
    await expect(anotherSession.get(second.id)).resolves.toEqual({
      cloudAiEnabled: false,
    });
    await anotherSession.setCloudAi(first.id, false);
    await expect(settings.get(first.id)).resolves.toEqual({
      cloudAiEnabled: false,
    });
  } finally {
    if (users.length)
      await prisma.userAccount.deleteMany({ where: { id: { in: users } } });
    await app.close();
  }
});
