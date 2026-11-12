import { Injectable } from '@nestjs/common';
import { JournalSuggestion } from './intelligence.types';
import { ReflectionsAiClient } from './reflections-ai.client';

@Injectable()
export class IntelligenceService {
  constructor(private readonly aiClient: ReflectionsAiClient) {}

  async generateSentenceStarters(
    currentContent: string,
    previousContent: string[],
  ): Promise<JournalSuggestion[]> {
    if (previousContent.length <= 0) return [];

    return this.aiClient.generateSentenceStarters(
      currentContent,
      previousContent,
    );
  }
}
