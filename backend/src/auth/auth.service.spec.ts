import { CredentialsSchema } from './auth.dto';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import {ConflictException, NotFoundException, UnauthorizedException} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { UserService } from '../user/user.service';
import type { SafeUser } from '../user/user.types';
import { randomUUID } from 'node:crypto';
import { MailService } from '../mail/mail.service';
import {ConfigService} from "@nestjs/config";

describe('AuthService', () => {
  let authService: AuthService;

  const mockUserService = {
    findUserByEmail: jest.fn(),
    findUserByID: jest.fn(),
    createUser: jest.fn(),
  };

  const mockAuthRepository = {
    findRefreshTokenByUser: jest.fn(),
    createRefreshSession: jest.fn(),
    updateRefreshToken: jest.fn(),
    findRefreshToken: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockMailService = {
    sendPasswordResetEmail: jest.fn(),
  };

  const compareMock = jest.mocked(bcrypt.compare);
  const hashMock = jest.mocked(bcrypt.hash);

  beforeEach(async () => {
    jest.clearAllMocks();
    compareMock.mockReset();
    hashMock.mockReset();
    mockJwtService.signAsync.mockReset();
    mockJwtService.verifyAsync.mockReset();

    const app = await Test.createTestingModule({
      providers: [
        AuthService, ConfigService,
        { provide: UserService, useValue: mockUserService },
        { provide: AuthRepository, useValue: mockAuthRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    authService = app.get(AuthService);
  });

  describe('validateUser', () => {
    it('returns a safe user when the password matches', async () => {
      mockUserService.findUserByEmail.mockResolvedValue({
        id: 7,
        email: 'sam@example.com',
        password: 'hashed-password',
      });
      compareMock.mockResolvedValue(true);

      const result = await authService.validateLocalUser(
        'sam@example.com',
        'secret',
      );

      expect(result).toEqual({
        id: 7,
        email: 'sam@example.com',
      });
      expect(compareMock).toHaveBeenCalledWith('secret', 'hashed-password');
    });

    it('throws when the user does not exist', async () => {
      mockUserService.findUserByEmail.mockResolvedValue(null);

      await expect(
        authService.validateLocalUser('missing@example.com', 'secret'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws when the password is invalid', async () => {
      mockUserService.findUserByEmail.mockResolvedValue({
        id: 7,
        email: 'sam@example.com',
        password: 'hashed-password',
      });
      compareMock.mockResolvedValue(false);

      await expect(
        authService.validateLocalUser('sam@example.com', 'wrong'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('delegates user creation to the user service', async () => {
      const credentials = { email: 'sam@example.com', password: 'password123' };
      mockUserService.createUser.mockResolvedValue({ id: 1, ...credentials });

      await expect(authService.register(credentials)).resolves.toEqual({
        id: 1,
        ...credentials,
      });
      expect(mockUserService.createUser).toHaveBeenCalledWith(
        credentials.email,
        credentials.password,
      );
    });
  });

  describe('login', () => {
    const user: SafeUser = { id: 1, email: 'sam@example.com' };

    it('rejects a duplicate device session', async () => {
      mockAuthRepository.findRefreshTokenByUser.mockResolvedValue({
        id: 'session-1',
      });

      await expect(authService.login(user)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('creates a refresh session and returns signed tokens', async () => {
      mockAuthRepository.findRefreshTokenByUser.mockResolvedValue(null);
      mockAuthRepository.createRefreshSession.mockResolvedValue({
        id: 'session-1',
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('refresh-token')
        .mockResolvedValueOnce('access-token');
      hashMock.mockResolvedValue('hashed-refresh-token');

      const result = await authService.login(user);

      expect(result).toEqual({
        refresh_token: 'refresh-token',
        access_token: 'access-token',
      });
      expect(mockAuthRepository.createRefreshSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          device: null,
          tokenHash: null,
        }),
      );
      expect(mockAuthRepository.updateRefreshToken).toHaveBeenCalledWith(
        'session-1',
        'hashed-refresh-token',
      );
    });
  });

  describe('isRefreshTokenValid', () => {
    it('returns false when the refresh session has no stored hash', async () => {
      mockAuthRepository.findRefreshToken.mockResolvedValue({
        id: 'session-1',
        tokenHash: null,
      });

      await expect(
        authService.isRefreshTokenValid('session-1', 'refresh-token'),
      ).resolves.toBe(false);
    });

    it('returns true when the token matches the stored hash', async () => {
      mockAuthRepository.findRefreshToken.mockResolvedValue({
        id: 'session-1',
        tokenHash: 'hashed-token',
      });
      compareMock.mockResolvedValue(true);

      await expect(
        authService.isRefreshTokenValid('session-1', 'refresh-token'),
      ).resolves.toBe(true);
      expect(compareMock).toHaveBeenCalledWith('refresh-token', 'hashed-token');
    });

    it('throws when the refresh session is missing', async () => {
      mockAuthRepository.findRefreshToken.mockResolvedValue(null);

      await expect(
        authService.isRefreshTokenValid('missing', 'refresh-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('verifies the refresh token and issues new tokens', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sid: 'session-1',
        sub: 1,
      });
      mockAuthRepository.findRefreshToken.mockResolvedValue({
        id: 'session-1',
        tokenHash: 'hashed-token',
      });
      mockUserService.findUserByID.mockResolvedValue({
        id: 1,
        email: 'sam@example.com',
      });
      compareMock.mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-refresh-token')
        .mockResolvedValueOnce('new-access-token');
      hashMock.mockResolvedValue('hashed-new-refresh-token');

      const result = await authService.refresh('refresh-token');

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('refresh-token', {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      expect(result).toEqual({
        refresh_token: 'new-refresh-token',
        access_token: 'new-access-token',
      });
    });

    it('rejects an invalid refresh token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sid: 'session-1',
        sub: 1,
      });
      mockAuthRepository.findRefreshToken.mockResolvedValue({
        id: 'session-1',
        tokenHash: 'hashed-token',
      });
      compareMock.mockResolvedValue(false);

      await expect(authService.refresh('refresh-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('password validation', () => {
    it('accepts the minimum valid password length', () => {
      const result = CredentialsSchema.safeParse({
        email: `auth-${randomUUID()}@example.com`,
        password: '1234567',
      });

      expect(result.success).toBe(true);
    });

    it('rejects passwords shorter than 7 characters', () => {
      const result = CredentialsSchema.safeParse({
        email: `auth-${randomUUID()}@example.com`,
        password: '123456',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['password'],
              code: 'too_small',
            }),
          ]),
        );
      }
    });

    it('rejects passwords longer than 32 characters', () => {
      const result = CredentialsSchema.safeParse({
        email: `auth-${randomUUID()}@example.com`,
        password: '123456789012345678901234567890123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['password'],
              code: 'too_big',
            }),
          ]),
        );
      }
    });
  });

  describe('Password reset', () => {
    it('sends a reset email with a short-lived token', async () => {
      mockUserService.findUserByEmail.mockResolvedValue({
        id: 1,
        email: 'sam@example.com',
      });

      mockJwtService.signAsync.mockResolvedValue('reset-token');
      await authService.sendPasswordResetLink('sam@example.com');

      expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'sam@example.com',
        'reset-token',
      );
    });

    it('rejects reset requests for unknown users', async () => {
      mockUserService.findUserByEmail.mockResolvedValue(null);

      await expect(authService.sendPasswordResetLink('missing@example.com')).rejects.toBeInstanceOf(NotFoundException);
      expect(mockMailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });
});
