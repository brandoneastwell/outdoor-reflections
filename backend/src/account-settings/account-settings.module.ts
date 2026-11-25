import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AccountSettingsController } from './account-settings.controller';
import { AccountSettingsService } from './account-settings.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AccountSettingsController],
  providers: [AccountSettingsService],
  exports: [AccountSettingsService],
})
export class AccountSettingsModule {}
