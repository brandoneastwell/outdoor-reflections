import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AccountSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: number) {
    return (
      (await this.prisma.accountSettings.findUnique({
        where: { userId },
        select: { cloudAiEnabled: true },
      })) ?? { cloudAiEnabled: false }
    );
  }

  setCloudAi(userId: number, cloudAiEnabled: boolean) {
    return this.prisma.accountSettings.upsert({
      where: { userId },
      create: { userId, cloudAiEnabled },
      update: { cloudAiEnabled },
      select: { cloudAiEnabled: true },
    });
  }
}
