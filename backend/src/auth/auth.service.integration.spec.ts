import { ConflictException } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { UserService } from '../user/user.service';
import { AuthRepository } from './auth.repository';
import { UserRepository } from '../user/user.repository';
import { PrismaService } from '../database/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { MailService } from '../mail/mail.service';
import type { AccessTokenPayload, RefreshTokenPayload } from './types';

describe('AuthService integration', () => {
  let app: TestingModule;
  let authService: AuthService;
  let userService: UserService;
  let authRepo: AuthRepository;
  let jwtService: JwtService;
  let prisma: PrismaService;
  const mailService = {
    sendPasswordResetEmail: jest.fn(),
  };

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        JwtModule.register({
          secret: 'test-access-secret',
          signOptions: { expiresIn: '10m' },
        }),
      ],
      providers: [
        AuthService,
        UserService,
        PrismaService,
        UserRepository,
        AuthRepository,
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    prisma = app.get(PrismaService);
    authService = app.get(AuthService);
    userService = app.get(UserService);
    jwtService = app.get(JwtService);
    authRepo = app.get(AuthRepository);
  });

  beforeEach(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.reflection.deleteMany();
    await prisma.userAccount.deleteMany();
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('registers a user, persists the refresh session, and refreshes the session', async () => {
    const email = `auth-${randomUUID()}@example.com`;
    const credentials = { email, password: 'password123' };

    await authService.register(credentials);

    const createdUser = await userService.findUserByEmail(email);
    if (!createdUser) throw new Error('Registered user was not found');

    const safeUser = { id: createdUser.id, email: createdUser.email };
    const authenticated = await authService.login(safeUser);
    const tokens = authenticated.token;

    const storedSession = await authRepo.findRefreshTokenByUser(createdUser.id);
    if (!storedSession?.tokenHash)
      throw new Error('Stored refresh session was not found');
    expect(
      await bcrypt.compare(tokens.refresh_token, storedSession.tokenHash),
    ).toBe(true);

    const accessPayload = await jwtService.verifyAsync<AccessTokenPayload>(
      tokens.access_token,
    );
    const refreshPayload = await jwtService.verifyAsync<RefreshTokenPayload>(
      tokens.refresh_token,
      {
        secret: process.env.JWT_REFRESH_SECRET,
      },
    );

    expect(accessPayload).toMatchObject({
      email,
      sub: createdUser.id,
    });
    expect(refreshPayload).toMatchObject({
      sub: createdUser.id,
    });
    expect(refreshPayload).toHaveProperty('sid');

    const refreshed = await authService.refresh(tokens.refresh_token);
    const updatedSession = await authRepo.findRefreshToken(storedSession.id);

    expect(updatedSession).toBeDefined();
    expect(
      await jwtService.verifyAsync<AccessTokenPayload>(refreshed.access_token),
    ).toMatchObject({
      email,
      sub: createdUser.id,
    });
  });

  it('login a user with local credentials', async () => {
    const email = `auth-${randomUUID()}@example.com`;
    const credentials = { email, password: 'password123' };

    const user = await prisma.userAccount.create({
      data: {
        email: email,
        password: await bcrypt.hash(credentials.password, 10),
      },
    });

    const token = await authService.login({ email: user.email, id: user.id });
    expect(token).toBeDefined();
    expect(await authRepo.findRefreshTokenByUser(user.id)).toBeDefined();
  });

  it('rejects a second login while a refresh session is active', async () => {
    const email = `auth-${randomUUID()}@example.com`;
    const credentials = { email, password: 'password123' };

    await authService.register(credentials);

    const createdUser = await userService.findUserByEmail(email);
    if (!createdUser) throw new Error('Registered user was not found');
    const safeUser = { id: createdUser.id, email: createdUser.email };

    const { token } = await authService.login(safeUser);

    await expect(
      authService.login(safeUser, token.refresh_token),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
