import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ReflectionsRepository } from './reflections.repository';
import { ReflectionDto, SyncResponse } from './reflection.types';
import { SafeUser } from '../user/user.types';

@Injectable()
export class SyncService {
  constructor(private repo: ReflectionsRepository) {}
  private readonly logger = new Logger(SyncService.name);

  async syncEntries(entries: ReflectionDto[], user: SafeUser) {
    if (!entries || entries.length === 0)
      throw new BadRequestException('No entries provided to sync');
    this.logger.log(`Syncing ${entries.length} entries`);

    const start = process.hrtime();
    const results = await this.repo.upsertMany(entries, user.id);
    const diff = process.hrtime(start);

    this.logger.log(
      `${results.entriesSynced.length} entries synced in ${diff[0]}s ${diff[1] / 1000000}ms`,
    );
    if (results.entriesCreated.length > 0) {
      this.logger.log(`${results.entriesCreated.length} entries created`);
    }

    const syncResults: SyncResponse = {
      synced_entries: results.entriesSynced.concat(results.entriesCreated),
      count: {
        failed: results.entriesFailed.length,
        updated: results.entriesSynced.length,
        created: results.entriesCreated.length,
        total: entries.length,
      },
      duration_ms: diff[0] * 1000 + diff[1],
      service_name: 'reflections_sync_service',
      status:
        results.entriesFailed.length > 0
          ? results.entriesSynced.length > 0 ||
            results.entriesCreated.length > 0
            ? 'PARTIAL'
            : 'FAILED'
          : 'SUCCESS',
      timestamp: new Date().toISOString(),
      errors: results.entriesFailed,
    };

    return syncResults;
  }
}
