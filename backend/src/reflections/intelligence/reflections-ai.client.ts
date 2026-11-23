import {
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { JournalSuggestion } from './intelligence.types';

type SentenceStartersResponse = {
  suggestions: JournalSuggestion[];
};

const DEFAULT_AI_SERVICE_URL = 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 15_000;

export class AiRateLimitException extends HttpException {
  constructor(public readonly retryAfterSeconds: number) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: 'AI_TOKEN_QUOTA_EXCEEDED',
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

@Injectable()
export class ReflectionsAiClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor() {
    this.baseUrl = (
      process.env.AI_SERVICE_URL ?? DEFAULT_AI_SERVICE_URL
    ).replace(/\/$/, '');

    const configuredTimeout = Number(process.env.AI_SERVICE_TIMEOUT_MS);
    this.timeoutMs =
      Number.isFinite(configuredTimeout) && configuredTimeout > 0
        ? configuredTimeout
        : DEFAULT_TIMEOUT_MS;
  }

  async generateInlineCompletion(
    currentContent: string,
    previousContent: string[],
    currentTextBlock: string,
  ): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v1/suggestions/inline-completion`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            current_content: currentContent,
            previous_entries: previousContent,
            current_text_block: currentTextBlock,
          }),
        },
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new AiRateLimitException(this.retryAfterSeconds(response));
        }
        throw new Error(`AI service returned HTTP ${response.status}`);
      }

      const payload: unknown = await response.json();
      if (!this.isInlineCompletionResponse(payload)) {
        throw new Error('AI service returned an invalid response');
      }

      return payload.suggestion;
    } catch (error) {
      if (error instanceof AiRateLimitException) throw error;
      throw new ServiceUnavailableException(
        'AI inline completion service is unavailable',
        { cause: error },
      );
    }
  }

  private isInlineCompletionResponse(
    value: unknown,
  ): value is { suggestion: string } {
    return (
      this.isRecord(value) &&
      typeof value.suggestion === 'string' &&
      value.suggestion.trim().length > 0
    );
  }

  async generateSentenceStarters(
    currentContent: string,
    previousEntries: string[],
  ): Promise<JournalSuggestion[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v1/suggestions/sentence-starters`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            current_content: currentContent,
            previous_entries: previousEntries,
          }),
          signal: AbortSignal.timeout(this.timeoutMs),
        },
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new AiRateLimitException(this.retryAfterSeconds(response));
        }
        throw new Error(`AI service returned HTTP ${response.status}`);
      }

      const payload: unknown = await response.json();
      if (!this.isSentenceStartersResponse(payload)) {
        throw new Error('AI service returned an invalid response');
      }

      return payload.suggestions;
    } catch (error) {
      if (error instanceof AiRateLimitException) throw error;
      throw new ServiceUnavailableException(
        'AI sentence starter service is unavailable',
        { cause: error },
      );
    }
  }

  private isSentenceStartersResponse(
    value: unknown,
  ): value is SentenceStartersResponse {
    if (!this.isRecord(value) || !Array.isArray(value.suggestions)) {
      return false;
    }

    return (
      value.suggestions.length === 3 &&
      value.suggestions.every(
        (suggestion) =>
          this.isRecord(suggestion) &&
          suggestion.type === 'sentence_starter' &&
          typeof suggestion.text === 'string' &&
          suggestion.text.length > 0,
      )
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private retryAfterSeconds(response: Response): number {
    const retryAfter = Number(response.headers.get('Retry-After'));
    return Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.ceil(retryAfter)
      : 1;
  }
}
