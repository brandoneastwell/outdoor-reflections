import type { ArgumentsHost } from '@nestjs/common';
import { AiRateLimitException } from '../intelligence/reflections-ai.client';
import { AiRateLimitExceptionFilter } from './ai-rate-limit.filter';

describe('AiRateLimitExceptionFilter', () => {
  it('returns the retry delay to the client', () => {
    const response = {
      setHeader: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as ArgumentsHost;
    const exception = new AiRateLimitException(42);

    new AiRateLimitExceptionFilter().catch(exception, host);

    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '42');
    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.json).toHaveBeenCalledWith(exception.getResponse());
  });
});
