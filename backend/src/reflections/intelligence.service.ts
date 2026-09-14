import { Injectable } from '@nestjs/common';
import type {
  ChatCompletionMessageParam,
  CompletionCreateParams,
} from 'groq-sdk/resources/chat/completions';
import { GroqProvider } from './groq.provider';
import { ReflectionsRepository } from './reflections.repository';
import { JournalSuggestion } from './intelligence.types';

@Injectable()
export class IntelligenceService {
  constructor(
    private readonly repo: ReflectionsRepository,
    private readonly groqProvider: GroqProvider,
  ) {}

  async generateSentenceStarters(
    currentContent: string,
    previousContent: string[],
  ): Promise<JournalSuggestion[]> {
    if (previousContent.length <= 0) return [];

    const context = previousContent
      .map((entry, index) => `Previous entry ${index + 1}:\n${entry}`)
      .join('\n\n');

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are a journaling assistant for an outdoor journal.
                    Your job is to help the user continue writing in their own voice. 
                    Generate exactly 3 short sentence starters.
                    Use previous journal entries only to understand recurring themes, experiences and interests.
                 
                    Do not invent memories or events.
                    Do not write complete journal paragraphs.
                    Do not copy sentences from previous entries.
                    Keep each suggestion under 20 words`.trim(),
      },
      {
        role: 'user',
        content: `CURRENT JOURNAL ENTRY: ${currentContent}
                    PREVIOUS JOURNAL ENTRIES: ${context}`.trim(),
      },
    ];

    const responseFormat: CompletionCreateParams.ResponseFormatJsonSchema = {
      type: 'json_schema',
      json_schema: {
        name: 'sentence_starters',
        strict: false,
        schema: {
          type: 'object',
          properties: {
            starters: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: {
                    type: 'string',
                  },
                },
                required: ['text'],
                additionalProperties: false,
              },
            },
          },
          required: ['starters'],
          additionalProperties: false,
        },
      },
    };

    const result = await this.groqProvider.chatGeneration(
      messages,
      responseFormat,
    );

    return result.map((text) => ({
      type: 'sentence_starter',
      text,
    }));
  }
}
