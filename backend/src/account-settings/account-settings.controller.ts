import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { JwtAuthGuard } from '../auth/jwt-auth-guard';
import type { SafeUser } from '../user/user.types';
import { AccountSettingsService } from './account-settings.service';

const settingsSchema = z.strictObject({ cloudAiEnabled: z.boolean() });

@UseGuards(JwtAuthGuard)
@Controller('account/settings')
export class AccountSettingsController {
  constructor(private readonly settings: AccountSettingsService) {}

  @Get()
  get(@Req() req: Request) {
    return this.settings.get((req.user as SafeUser).id);
  }

  @Patch()
  update(@Req() req: Request, @Body() body: unknown) {
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException('Invalid account settings');
    return this.settings.setCloudAi(
      (req.user as SafeUser).id,
      parsed.data.cloudAiEnabled,
    );
  }
}
