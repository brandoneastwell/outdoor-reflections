import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { AiRateLimitException } from '../intelligence/reflections-ai.client';

@Catch(AiRateLimitException)
export class AiRateLimitExceptionFilter implements ExceptionFilter {
  catch(exception: AiRateLimitException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response
      .setHeader('Retry-After', String(exception.retryAfterSeconds))
      .status(HttpStatus.TOO_MANY_REQUESTS)
      .json(exception.getResponse());
  }
}
