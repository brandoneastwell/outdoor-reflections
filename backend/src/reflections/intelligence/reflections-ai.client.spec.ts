import { ServiceUnavailableException } from '@nestjs/common';
import { ReflectionsAiClient } from './reflections-ai.client';

describe('ReflectionsAiClient', () => {
  const originalAiServiceUrl = process.env.AI_SERVICE_URL;
  const originalTimeout = process.env.AI_SERVICE_TIMEOUT_MS;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    process.env.AI_SERVICE_URL = 'http://ai-service:8000/';
    process.env.AI_SERVICE_TIMEOUT_MS = '5000';
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();

    if (originalAiServiceUrl === undefined) {
      delete process.env.AI_SERVICE_URL;
    } else {
      process.env.AI_SERVICE_URL = originalAiServiceUrl;
    }

    if (originalTimeout === undefined) {
      delete process.env.AI_SERVICE_TIMEOUT_MS;
    } else {
      process.env.AI_SERVICE_TIMEOUT_MS = originalTimeout;
    }
  });

  it('calls the Python sentence-starter endpoint', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          suggestions: [
            { type: 'sentence_starter', text: 'First suggestion' },
            { type: 'sentence_starter', text: 'Second suggestion' },
            { type: 'sentence_starter', text: 'Third suggestion' },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    const client = new ReflectionsAiClient();

    const result = await client.generateSentenceStarters('Current draft', [
      'Previous entry',
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://ai-service:8000/v1/suggestions/sentence-starters',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_content: 'Current draft',
          previous_entries: ['Previous entry'],
        }),
        signal: expect.any(AbortSignal) as AbortSignal,
      }),
    );
    expect(result).toEqual([
      { type: 'sentence_starter', text: 'First suggestion' },
      { type: 'sentence_starter', text: 'Second suggestion' },
      { type: 'sentence_starter', text: 'Third suggestion' },
    ]);
  });

  it('calls the Python inline-completion endpoint', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ suggestion: 'I noticed the...' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const client = new ReflectionsAiClient();

    const result = await client.generateInlineCompletion(
      'Current draft',
      ['Previous entry'],
      'As I reached the ridge,',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://ai-service:8000/v1/suggestions/inline-completion',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_content: 'Current draft',
          previous_entries: ['Previous entry'],
          current_text_block: 'As I reached the ridge,',
        }),
      }),
    );
    expect(result).toBe('I noticed the...');
  });

  it('rejects an unsuccessful AI service response', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
    const client = new ReflectionsAiClient();

    await expect(
      client.generateSentenceStarters('Current draft', ['Previous entry']),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('rejects a malformed AI service response', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ suggestions: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const client = new ReflectionsAiClient();

    await expect(
      client.generateSentenceStarters('Current draft', ['Previous entry']),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('rejects a network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const client = new ReflectionsAiClient();

    await expect(
      client.generateSentenceStarters('Current draft', ['Previous entry']),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
