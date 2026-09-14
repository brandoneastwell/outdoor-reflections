import { Test, type TestingModule } from '@nestjs/testing';
import { IntelligenceService } from './intelligence.service';
import { GroqProvider } from './groq.provider';
import { ReflectionsRepository } from './reflections.repository';
import type {
  ChatCompletionMessageParam,
  CompletionCreateParams,
} from 'groq-sdk/resources/chat/completions';

describe('IntelligenceService integration', () => {
  let intelligenceService: IntelligenceService;
  let app: TestingModule;

  const chatGeneration = jest.fn(
    (
      messages: ChatCompletionMessageParam[],
      responseFormat: CompletionCreateParams.ResponseFormatJsonSchema,
    ): Promise<string[]> => {
      void messages;
      void responseFormat;
      return Promise.resolve([]);
    },
  );

  const mockGroqProvider = { chatGeneration };

  const mockReflectionsRepository = {};

  beforeAll(async () => {
    app = await Test.createTestingModule({
      providers: [
        IntelligenceService,
        {
          provide: ReflectionsRepository,
          useValue: mockReflectionsRepository,
        },
        {
          provide: GroqProvider,
          useValue: mockGroqProvider,
        },
      ],
    }).compile();

    intelligenceService = app.get(IntelligenceService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns no suggestions when there is no previous content', async () => {
    const result = await intelligenceService.generateSentenceStarters(
      'I went for a walk by the river.',
      [],
    );

    expect(result).toEqual([]);
    expect(mockGroqProvider.chatGeneration).not.toHaveBeenCalled();
  });

  it('generates sentence starter suggestions from prior entries', async () => {
    mockGroqProvider.chatGeneration.mockResolvedValue([
      'Keep going with the ridge.',
      'The weather changed the mood.',
      'I felt calmer after the hike.',
    ]);

    const result = await intelligenceService.generateSentenceStarters(
      'Today I wanted to stay outside longer.',
      [
        'Yesterday I walked along the river and watched the light change.',
        'I have been thinking about getting back on the trail.',
      ],
    );

    expect(chatGeneration).toHaveBeenCalledTimes(1);
    const call = chatGeneration.mock.calls[0];
    if (!call) throw new Error('Groq provider was not called');
    const [messages, responseFormat] = call;
    const systemMessage = messages.find((message) => message.role === 'system');
    const userMessage = messages.find((message) => message.role === 'user');
    if (!systemMessage || typeof systemMessage.content !== 'string')
      throw new Error('System message was not generated');
    if (!userMessage || typeof userMessage.content !== 'string')
      throw new Error('User message was not generated');

    expect(systemMessage.content).toContain(
      'Generate exactly 3 short sentence starters.',
    );
    expect(userMessage.content).toContain(
      'CURRENT JOURNAL ENTRY: Today I wanted to stay outside longer.',
    );
    expect(responseFormat.type).toBe('json_schema');
    expect(responseFormat.json_schema.name).toBe('sentence_starters');
    expect(responseFormat.json_schema.schema).toBeDefined();

    expect(userMessage.content).toContain(
      'Previous entry 1:\nYesterday I walked along the river and watched the light change.',
    );
    expect(userMessage.content).toContain(
      'Previous entry 2:\nI have been thinking about getting back on the trail.',
    );

    expect(result).toEqual([
      { type: 'sentence_starter', text: 'Keep going with the ridge.' },
      { type: 'sentence_starter', text: 'The weather changed the mood.' },
      { type: 'sentence_starter', text: 'I felt calmer after the hike.' },
    ]);
  });
});
