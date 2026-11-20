import { ReflectionsAiClient } from './reflections-ai.client';

const liveTestsEnabled = process.env.RUN_LIVE_AI_SERVICE_TESTS === '1';
const describeLive = liveTestsEnabled ? describe : describe.skip;

describeLive('ReflectionsAiClient live integration', () => {
  const aiServiceUrl = (
    process.env.AI_SERVICE_URL ?? 'http://localhost:8000'
  ).replace(/\/$/, '');

  it('communicates with the running Python AI service', async () => {
    const healthResponse = await fetch(`${aiServiceUrl}/health`);

    expect(healthResponse.ok).toBe(true);
    await expect(healthResponse.json()).resolves.toEqual(
      expect.objectContaining({
        status: 'healthy',
        service: 'outdoor-reflections-ai',
      }),
    );

    const client = new ReflectionsAiClient();
    const suggestions = await client.generateSentenceStarters(
      'Today I returned to the woodland path.',
      [
        'Yesterday I watched the light change beside the river.',
        'Last week I felt calmer after walking along the ridge.',
      ],
    );

    expect(suggestions).toHaveLength(3);
    expect(suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'sentence_starter',
          text: expect.any(String) as string,
        }),
      ]),
    );
  }, 30_000);
});
