import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';
import type {
  ChatCompletionMessageParam,
  CompletionCreateParams,
} from 'groq-sdk/resources/chat/completions';

@Injectable()
export class GroqProvider {
  private readonly client: Groq;

  constructor() {
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async chatGeneration(
    messages: ChatCompletionMessageParam[],
    responseFormat: CompletionCreateParams.ResponseFormatJsonSchema,
  ): Promise<string[]> {
    const response = await this.client.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages,
      response_format: responseFormat,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Groq returned an empty response');
    }

    const parsed = JSON.parse(content) as {
      starters: { text: string }[];
    };

    return parsed.starters.map((starter) => starter.text);
  }
}
