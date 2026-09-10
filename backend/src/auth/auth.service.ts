import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger, NotFoundException,
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
import {ConfigService} from "@nestjs/config";

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private authRepository: AuthRepository,
    private jwtService: JwtService,
    private mailService: MailService,
    private configService: ConfigService
  ) {}
  private readonly logger = new Logger(AuthService.name);

  async validateLocalUser(email: string, password: string): Promise<SafeUser> {
    const user = await this.userService.findUserByEmail(email);
    if (!user || !user.password)
      throw new UnauthorizedException('Invalid email or password');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid email or password');

    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  async register(credentials: CredentialsDto) {
    return this.userService.createUser(credentials.email, credentials.password);
  }

  async login(user: SafeUser) {
    this.logger.log(`User ${user.email} attempting login`);
    const exists = await this.authRepository.findRefreshTokenByUser(user.id);
    if (exists)
      throw new ConflictException('User already signed in on this device');

    const session: RefreshToken =
      await this.authRepository.createRefreshSession({
        id: crypto.randomUUID(),
        userId: user.id,
        createdAt: new Date(),
        device: null,
        tokenHash: null,
      });

    return this.createTokens(user, session.id);
  }

  async loginWithGoogle(req) {
    if (!req.user) throw new UnauthorizedException('Invalid credentials');

    const user = await this.userService.findUserByEmail(req.user.email);
    if (user) return await this.login({ email: user.email, id: user.id });

    const provider: LoginProvider = { id: req.user.googleId, name: 'google' };
    const newUser = await this.userService.createProviderUser(
      req.user.email,
      provider,
    );
    return await this.login({ email: newUser.email, id: newUser.id });
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
    const payload = await this.jwtService.verifyAsync(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    const isValid = await this.isRefreshTokenValid(payload.sid, refreshToken);
    if (!isValid) throw new UnauthorizedException('Invalid refresh token');

    const user: SafeUser = (await this.userService.findUserByID(
      payload.sub,
    )) as SafeUser;
    return this.createTokens(user, payload.sid);
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
        secret: process.env.JWT_REFRESH_SECRET,
      }),
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async sendPasswordResetLink(email: string) {
    const user = await this.userService.findUserByEmail(email);
    if (!user) throw new NotFoundException('User not found');

    const token = await this.jwtService.signAsync({ email },
      {
        secret: this.configService.get('JWT_SECRET') + user.password,
        expiresIn: '15m',
      },
    );

    await this.mailService.sendPasswordResetEmail(email, token);
  }

  async resetPassword(token: string, newPassword: string) {
    const decoded = this.jwtService.decode(token) as { email: string }
    if (!decoded) throw new BadRequestException('Invalid token')

    const user = await this.userService.findUserByEmail(decoded.email)
    if (!user) throw new BadRequestException('User does not exist')
    const secret = this.configService.get('JWT_SECRET') + user.password

    try {
      this.jwtService.verify(token, { secret })
      const hashedPassword = await bcrypt.hash(newPassword, 10)
      await this.userService.updatePassword(user.id, hashedPassword)
    } catch (error) {
      throw new BadRequestException('Token invalid or has expired')
    }
  }
}
