import {
  BadRequestException,
  Body,
  Controller,
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

@UseFilters(AiRateLimitExceptionFilter)
@Controller('reflection')
export class ReflectionsController {
  constructor(
    private reflectionService: ReflectionsService,
    private syncService: SyncService,
    private intelligenceService: IntelligenceService,
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

  @Post(':id/intelligence/sentence-starters')
  getSentenceStarters(
    @Body() body: { currentContent: string; recentContent: string[] },
  ) {
    return this.intelligenceService.generateSentenceStarters(
      body.currentContent,
      body.recentContent,
    );
  }

  @Post(':id/intelligence/inline-completion')
  async getInlineCompletion(
    @Body()
    body: {
      currentContent: string;
      currentTextBlock: string;
      recentContent: string[];
    },
  ) {
    const suggestion = await this.intelligenceService.generateInlineCompletion(
      body.currentContent,
      body.recentContent,
      body.currentTextBlock,
    );
    return { suggestion };
  }
}
