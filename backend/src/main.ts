import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConsoleLogger } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import cookieParser from 'cookie-parser';
import {json} from "express";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      prefix: 'Reflections API',
      logLevels: ['error', 'warn', 'log', 'debug'],
    }),
  });

  app.use(json({ limit: '10mb' }));
  app.enableCors({ origin: process.env.ORIGIN, credentials: true });
  app.use(cookieParser());
  app.useGlobalPipes(new ZodValidationPipe());
  await app.listen(8000);
}
bootstrap();
