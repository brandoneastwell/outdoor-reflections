import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import { ReflectionsService } from '../entries/reflections.service';
import type { Request } from 'express';
import { SyncService } from '../sync/sync.service';
import { JwtAuthGuard } from '../../auth/jwt-auth-guard';
import { EncryptedReflectionSchema } from '../entries/reflection.types';
import { SafeUser } from '../../user/user.types';
import { IntelligenceService } from '../intelligence/intelligence.service';
import { AiRateLimitExceptionFilter } from './ai-rate-limit.filter';
import { AccountSettingsService } from '../../account-settings/account-settings.service';

@UseFilters(AiRateLimitExceptionFilter)
@Controller('reflection')
export class ReflectionsController {
  constructor(
    private reflectionService: ReflectionsService,
    private syncService: SyncService,
    private intelligenceService: IntelligenceService,
    private settings: AccountSettingsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: Request, @Body() entry: unknown) {
    const user: SafeUser = req.user as SafeUser;
    const parsed = EncryptedReflectionSchema.safeParse(entry);
    if (!parsed.success)
      throw new BadRequestException('Expected an encrypted reflection');
    return this.reflectionService.createEntry(parsed.data, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string): string {
    console.log(id);
    return 'Returns a reflection';
  }

  @UseGuards(JwtAuthGuard)
  @Post('sync')
  async sync(@Req() req: Request, @Body() entries: unknown[]) {
    const user: SafeUser = req.user as SafeUser;
    return this.syncService.syncEntries(entries, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/intelligence/sentence-starters')
  async getSentenceStarters(
    @Req() req: Request,
    @Body() body: { currentContent: string; recentContent: string[] },
  ) {
    await this.assertCloudAiEnabled(req);
    return this.intelligenceService.generateSentenceStarters(
      body.currentContent,
      body.recentContent,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/intelligence/inline-completion')
  async getInlineCompletion(
    @Req() req: Request,
    @Body()
    body: {
      currentContent: string;
      currentTextBlock: string;
      recentContent: string[];
    },
  ) {
    await this.assertCloudAiEnabled(req);
    const suggestion = await this.intelligenceService.generateInlineCompletion(
      body.currentContent,
      body.recentContent,
      body.currentTextBlock,
    );
    return { suggestion };
  }

  private async assertCloudAiEnabled(req: Request) {
    if (!(await this.settings.get((req.user as SafeUser).id)).cloudAiEnabled) {
      throw new ForbiddenException('Cloud AI is off for this account');
    }
  }
}
