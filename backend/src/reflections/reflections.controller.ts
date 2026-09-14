import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ReflectionsService } from './reflections.service';
import type { Request, Response } from 'express';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth-guard';
import { ReflectionDto } from './reflection.types';
import { SafeUser } from '../user/user.types';
import {IntelligenceService} from "./intelligence.service";

@Controller('reflection')
export class ReflectionsController {
  constructor(
    private reflectionService: ReflectionsService,
    private syncService: SyncService,
    private intelligenceService: IntelligenceService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: Request, @Res() res: Response) {
    const entry: ReflectionDto = req.body;
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
  async getSentenceStarters(@Req() req: Request, @Res() res: Response) {
    const { currentContent, recentContent }: { currentContent: string, recentContent: string[] } = req.body;
    return await this.intelligenceService.generateSentenceStarters(currentContent, recentContent);
  }
}
