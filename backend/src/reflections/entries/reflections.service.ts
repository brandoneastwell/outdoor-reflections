import { Injectable } from '@nestjs/common';
import { ReflectionsRepository } from './reflections.repository';
import { ReflectionDto } from './reflection.types';

@Injectable()
export class ReflectionsService {
  constructor(private repo: ReflectionsRepository) {}

  async createEntry(reflection: ReflectionDto, userId: number) {
    try {
      return await this.repo.create(reflection, userId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to create reflection: ${message}`);
    }
  }
}
