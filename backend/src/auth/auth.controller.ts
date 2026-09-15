import { AuthService } from './auth.service';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { LocalAuthGuard } from './local-auth-guard';
import { JwtAuthGuard } from './jwt-auth-guard';
import { CredentialsDto, EmailDto, ResetPasswordDto } from './auth.dto';
import { SafeUser } from '../user/user.types';
import { GoogleAuthGuard } from './google-auth-guard';
import { getRefreshTokenFromCookie, setAuthTokenInCookies } from './helpers';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Res() res: Response, @Req() req: Request) {
    const user = req.user as SafeUser;
    return res.status(200).json({ id: user.id, email: user.email });
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: Request, @Res() res: Response) {
    const refreshToken = getRefreshTokenFromCookie(req);
    const authenticated = await this.authService.login(
      req.user as SafeUser,
      refreshToken,
    );
    setAuthTokenInCookies(res, authenticated.token);
    return res
      .status(201)
      .json({ message: 'Successfully logged in', id: authenticated.userId });
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() credentials: CredentialsDto, @Res() res: Response) {
    const user: SafeUser = await this.authService.register(credentials);
    return res
      .status(201)
      .json({ message: 'Successfully registered', id: user.id });
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return res.status(200).json({ message: 'Logged out' });
  }

  @Post('refresh')
  async refresh(@Res() res: Response, @Req() req: Request) {
    const refreshToken = getRefreshTokenFromCookie(req);
    if (!refreshToken) throw new UnauthorizedException('User is not signed in');
    const accessToken = await this.authService.refresh(refreshToken);
    setAuthTokenInCookies(res, accessToken);
    return res.status(201).json({ message: 'refreshed token' });
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const authenticated = await this.authService.loginWithGoogle(
      req,
      getRefreshTokenFromCookie(req),
    );
    setAuthTokenInCookies(res, authenticated.token);
    return res.status(200).json({
      message: 'Successfully logged in with Google',
      id: authenticated.userId,
    });
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: EmailDto, @Res() res: Response) {
    const message: string =
      'If the email matches an account in our system, a password reset link has been sent.';

    try {
      await this.authService.sendPasswordResetLink(body.email);
      return res.status(200).json({ message });
    } catch {
      return res.status(200).json({ message });
    }
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.CREATED)
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }
}
