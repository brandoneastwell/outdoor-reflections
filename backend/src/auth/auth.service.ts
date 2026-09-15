import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginProvider, SafeUser } from '../user/user.types';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { CredentialsDto } from './auth.dto';
import { AuthRepository } from './auth.repository';
import { REFRESH_TOKEN_AGE_DAYS } from './constants';
import { RefreshToken } from '../../generated/prisma/client';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import type {
  AccessTokenPayload,
  GoogleUser,
  RefreshTokenPayload,
} from './types';

function isGoogleUser(user: unknown): user is GoogleUser {
  if (!user || typeof user !== 'object') return false;
  const candidate = user as Partial<GoogleUser>;
  return (
    typeof candidate.googleId === 'string' &&
    typeof candidate.email === 'string'
  );
}

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private authRepository: AuthRepository,
    private jwtService: JwtService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}
  private readonly logger = new Logger(AuthService.name);

  async validateLocalUser(email: string, password: string): Promise<SafeUser> {
    const user = await this.userService.findUserByEmail(email);
    if (!user || !user.password)
      throw new UnauthorizedException('Invalid email or password');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid email or password');

    return { id: user.id, email: user.email };
  }

  async register(credentials: CredentialsDto) {
    return this.userService.createUser(credentials.email, credentials.password);
  }

  async login(user: SafeUser, refreshToken?: string) {
    this.logger.log(`User ${user.email} attempting login`);

    if (refreshToken) {
      const decoded = this.jwtService.decode<RefreshTokenPayload>(refreshToken);
      const refreshSession = decoded?.sid
        ? await this.authRepository.findRefreshToken(decoded.sid)
        : null;
      if (refreshSession) {
        const expiresAt = new Date(refreshSession.createdAt);
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_AGE_DAYS);
        if (expiresAt > new Date())
          throw new ConflictException(
            'You are already signed in on this device',
          );
      }
    }

    const session: RefreshToken =
      await this.authRepository.createRefreshSession({
        id: crypto.randomUUID(),
        userId: user.id,
        createdAt: new Date(),
        device: null,
        tokenHash: null,
      });

    return {
      token: await this.createTokens(user, session.id),
      userId: user.id,
    };
  }

  async loginWithGoogle(req: { user?: unknown }, refreshToken?: string) {
    if (!isGoogleUser(req.user))
      throw new UnauthorizedException('Invalid credentials');

    let user = await this.userService.findUserByEmail(req.user.email);
    if (!user) {
      const provider: LoginProvider = { id: req.user.googleId, name: 'google' };
      user = await this.userService.createProviderUser(
        req.user.email,
        provider,
      );
    }

    return this.login({ email: user.email, id: user.id }, refreshToken);
  }

  async isRefreshTokenValid(refreshSessionId: string, token: string) {
    const refresh: RefreshToken | null =
      await this.authRepository.findRefreshToken(refreshSessionId);
    if (!refresh) throw new UnauthorizedException('User not signed in');
    if (refresh.tokenHash)
      return await bcrypt.compare(token, refresh.tokenHash);
    return false;
  }

  async refresh(refreshToken: string) {
    let payload: { sid: string; sub: number };

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const isValid = await this.isRefreshTokenValid(payload.sid, refreshToken);
    if (!isValid) throw new UnauthorizedException('Invalid refresh token');

    const user: SafeUser = (await this.userService.findUserByID(
      payload.sub,
    )) as SafeUser;

    const accessTokenPayload = { email: user.email, sub: user.id };
    return {
      access_token: await this.jwtService.signAsync(accessTokenPayload),
    };
  }

  async createTokens(user: SafeUser, refreshSessionId: string) {
    const token = await this.signTokens(user, refreshSessionId);
    const hashedToken = await bcrypt.hash(token.refresh_token, 10);
    await this.authRepository.updateRefreshToken(refreshSessionId, hashedToken);
    return token;
  }

  async signTokens(user: SafeUser, refreshSessionId: string) {
    const payload = { email: user.email, sub: user.id };
    const refreshPayload = { sub: user.id, sid: refreshSessionId };
    return {
      refresh_token: await this.jwtService.signAsync(refreshPayload, {
        expiresIn: `${REFRESH_TOKEN_AGE_DAYS}d`,
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      }),
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async sendPasswordResetLink(email: string) {
    const user = await this.userService.findUserByEmail(email);
    if (!user?.password) throw new NotFoundException('User not found');

    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    if (!jwtSecret) throw new Error('JWT_SECRET is not configured');

    const resetSecret = jwtSecret + user.password;

    const token = await this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: resetSecret,
        expiresIn: '15m',
      },
    );

    await this.mailService.sendPasswordResetEmail(email, token);
  }

  async resetPassword(token: string, newPassword: string) {
    const decoded =
      this.jwtService.decode<Pick<AccessTokenPayload, 'sub'>>(token);
    if (typeof decoded?.sub !== 'number')
      throw new UnauthorizedException('Invalid reset token');

    const user = await this.userService.findUserByID(decoded.sub);
    if (!user?.password) throw new UnauthorizedException('Invalid reset token');

    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    if (!jwtSecret) throw new Error('JWT_SECRET is not configured');

    const resetSecret = jwtSecret + user.password;

    try {
      await this.jwtService.verifyAsync(token, {
        secret: resetSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    return this.userService.updatePassword(user.id, newPassword);
  }
}
