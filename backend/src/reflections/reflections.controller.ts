import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ReflectionsService } from './reflections.service';
import type { Request } from 'express';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth-guard';
import type { ReflectionDto } from './reflection.types';
import { SafeUser } from '../user/user.types';
import { IntelligenceService } from './intelligence.service';

@Controller('reflection')
export class ReflectionsController {
  constructor(
    private reflectionService: ReflectionsService,
    private syncService: SyncService,
    private intelligenceService: IntelligenceService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: Request, @Body() entry: ReflectionDto) {
    const user: SafeUser = req.user as SafeUser;
    return this.reflectionService.createEntry(entry, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string): string {
    console.log(id);
    return 'Returns a reflection';
  }

  @UseGuards(JwtAuthGuard)
  @Post('sync')
  async sync(@Req() req: Request, @Body() entries: ReflectionDto[]) {
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
}
