import { Module } from '@nestjs/common';
import { ReflectionsController } from './api/reflections.controller';
import { ReflectionsService } from './entries/reflections.service';
import { DatabaseModule } from '../database/database.module';
import { ReflectionsRepository } from './entries/reflections.repository';
import { SyncService } from './sync/sync.service';
import { IntelligenceService } from './intelligence/intelligence.service';
import { ReflectionsAiClient } from './intelligence/reflections-ai.client';
import { AccountSettingsModule } from '../account-settings/account-settings.module';

@Module({
  imports: [DatabaseModule, AccountSettingsModule],
  controllers: [ReflectionsController],
  providers: [
    ReflectionsService,
    ReflectionsRepository,
    SyncService,
    IntelligenceService,
    ReflectionsAiClient,
  ],
  exports: [ReflectionsService, SyncService, IntelligenceService],
})
export class ReflectionsModule {}
