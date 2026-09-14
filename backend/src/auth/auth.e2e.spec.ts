import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { GoogleAuthGuard } from './google-auth-guard';
import { LocalAuthGuard } from './local-auth-guard';
import { JwtAuthGuard } from './jwt-auth-guard';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import type { Server } from 'node:http';
import type { SafeUser } from '../user/user.types';

type GoogleTestUser = {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
};

type AuthTestRequest = {
  body: { email?: string };
  user?: SafeUser | GoogleTestUser;
};

type ValidationErrorBody = {
  statusCode: number;
  message: string;
  errors: Array<{
    path: string[];
    code: string;
  }>;
};

type MessageBody = {
  message: string;
};

type TokensBody = {
  access_token?: string;
  refresh_token?: string;
};

function responseBody<T>(response: { body: unknown }): T {
  return response.body as T;
}

describe('Auth flow end to end tests', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaService;

  beforeAll(async () => {
    const googleUser = {
      googleId: 'google-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
    })
      .overrideGuard(GoogleAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const request = context.switchToHttp().getRequest<AuthTestRequest>();
          request.user = googleUser;
          return true;
        },
      })
      .overrideGuard(LocalAuthGuard)
      .useValue({
        async canActivate(context: ExecutionContext) {
          const request = context.switchToHttp().getRequest<AuthTestRequest>();
          const user = request.body?.email
            ? await prisma.userAccount.findUnique({
                where: { email: request.body.email },
              })
            : await prisma.userAccount.findFirst();

          request.user = user
            ? { id: user.id, email: user.email }
            : { id: 1, email: request.body?.email ?? 'local@example.com' };
          return true;
        },
      })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        async canActivate(context: ExecutionContext) {
          const request = context.switchToHttp().getRequest<AuthTestRequest>();
          const user = await prisma.userAccount.findFirst();
          request.user = user
            ? { id: user.id, email: user.email }
            : { id: 1, email: 'local@example.com' };
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    app.use(cookieParser());
    await app.init();

    httpServer = app.getHttpServer() as Server;
    prisma = module.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.userAccount.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST auth/register creates a local user', async () => {
    const email = `register-${Date.now()}@example.com`;
    const password = 'password123';

    await request(httpServer)
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const createdUser = await prisma.userAccount.findUnique({
      where: { email },
    });

    expect(createdUser).not.toBeNull();
    const storedPassword = createdUser?.password;
    expect(storedPassword).not.toBeNull();
    expect(storedPassword).not.toBe(password);
    expect(await bcrypt.compare(password, storedPassword!)).toBe(true);
  });

  it('POST auth/register accepts the minimum valid password length', async () => {
    const email = `min-password-${Date.now()}@example.com`;
    const password = '1234567';

    await request(httpServer)
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const createdUser = await prisma.userAccount.findUnique({
      where: { email },
    });

    expect(createdUser).not.toBeNull();
  });

  it('POST auth/register rejects passwords shorter than 7 characters', async () => {
    const response = await request(httpServer)
      .post('/auth/register')
      .send({
        email: `short-password-${Date.now()}@example.com`,
        password: '123456',
      })
      .expect(400);

    const body = responseBody<ValidationErrorBody>(response);
    expect(body).toMatchObject({
      statusCode: 400,
      message: 'Validation failed',
    });
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['password'],
          code: 'too_small',
        }),
      ]),
    );
  });

  it('POST auth/register rejects passwords longer than 32 characters', async () => {
    const response = await request(httpServer)
      .post('/auth/register')
      .send({
        email: `long-password-${Date.now()}@example.com`,
        password: '123456789012345678901234567890123',
      })
      .expect(400);

    const body = responseBody<ValidationErrorBody>(response);
    expect(body).toMatchObject({
      statusCode: 400,
      message: 'Validation failed',
    });
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['password'],
          code: 'too_big',
        }),
      ]),
    );
  });

  it('POST auth/login sets auth cookies for the signed-in user', async () => {
    const email = `login-${Date.now()}@example.com`;
    const password = 'password123';

    await request(httpServer)
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const user = await prisma.userAccount.findUnique({
      where: { email },
    });

    expect(user).not.toBeNull();

    const response = await request(httpServer)
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    expect(response.get('Set-Cookie')).toBeDefined();
    expect(response.get('Set-Cookie')).toEqual(
      expect.arrayContaining([
        expect.stringContaining('access_token='),
        expect.stringContaining('refresh_token='),
      ]),
    );
  });

  it('POST auth/logout clears the auth cookies', async () => {
    const response = await request(httpServer).post('/auth/logout').expect(200);

    expect(responseBody<MessageBody>(response)).toEqual({
      message: 'Logged out',
    });
    expect(response.get('Set-Cookie')).toEqual(
      expect.arrayContaining([
        expect.stringContaining('access_token=;'),
        expect.stringContaining('refresh_token=;'),
      ]),
    );
  });

  it('POST auth/refresh returns new tokens when the refresh cookie is present', async () => {
    const email = `refresh-${Date.now()}@example.com`;
    const password = 'password123';

    await request(httpServer)
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const loginResponse = await request(httpServer)
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    const setCookies = loginResponse.get('Set-Cookie');
    expect(setCookies).toBeDefined();
    const refreshCookie = setCookies?.find((cookie) =>
      cookie.startsWith('refresh_token='),
    );

    if (!refreshCookie) throw new Error('Refresh cookie was not set');

    const response = await request(httpServer)
      .post('/auth/refresh')
      .set('Cookie', refreshCookie.split(';')[0])
      .expect(201);

    const body = responseBody<TokensBody>(response);
    expect(body.access_token).toBeDefined();
    expect(body.refresh_token).toBeDefined();
  });

  it('POST auth/refresh rejects when the refresh cookie is missing', async () => {
    const response = await request(httpServer)
      .post('/auth/refresh')
      .expect(401);

    expect(responseBody<MessageBody>(response).message).toBe(
      'User is not signed in',
    );
  });

  it('GET auth/google returns successfully through the guard', async () => {
    await request(httpServer).get('/auth/google').expect(200);
  });

  it('GET auth/google/callback returns login tokens', async () => {
    const response = await request(httpServer)
      .get('/auth/google/callback')
      .expect(200);

    const body = responseBody<TokensBody>(response);
    expect(body.access_token).toBeDefined();
    expect(body.refresh_token).toBeDefined();
  });

  it('GET auth/google/callback called twice returns a 409 conflict', async () => {
    await request(httpServer).get('/auth/google/callback').expect(200);

    const res = await request(httpServer)
      .get('/auth/google/callback')
      .expect(409);

    expect(responseBody<MessageBody>(res).message).toBe(
      'User already signed in on this device',
    );
  });
});
