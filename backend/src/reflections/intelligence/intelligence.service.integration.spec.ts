import { Test, type TestingModule } from '@nestjs/testing';
import { IntelligenceService } from './intelligence.service';
import { ReflectionsAiClient } from './reflections-ai.client';
import type { JournalSuggestion } from './intelligence.types';

describe('IntelligenceService integration', () => {
  let intelligenceService: IntelligenceService;
  let app: TestingModule;

  const generateSentenceStarters = jest.fn<
    Promise<JournalSuggestion[]>,
    [string, string[]]
  >();

  const mockAiClient = { generateSentenceStarters };

  beforeAll(async () => {
    app = await Test.createTestingModule({
      providers: [
        IntelligenceService,
        {
          provide: ReflectionsAiClient,
          useValue: mockAiClient,
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
    expect(generateSentenceStarters).not.toHaveBeenCalled();
  });

  it('requests sentence starters from the AI service', async () => {
    const suggestions: JournalSuggestion[] = [
      { type: 'sentence_starter', text: 'Keep going with the ridge.' },
      { type: 'sentence_starter', text: 'The weather changed the mood.' },
      { type: 'sentence_starter', text: 'I felt calmer after the hike.' },
    ];
    generateSentenceStarters.mockResolvedValue(suggestions);

    const previousEntries = [
      'Yesterday I walked along the river and watched the light change.',
      'I have been thinking about getting back on the trail.',
    ];
    const result = await intelligenceService.generateSentenceStarters(
      'Today I wanted to stay outside longer.',
      previousEntries,
    );

    expect(generateSentenceStarters).toHaveBeenCalledWith(
      'Today I wanted to stay outside longer.',
      previousEntries,
    );
    expect(result).toEqual(suggestions);
  });
});
