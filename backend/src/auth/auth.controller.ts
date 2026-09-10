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
import {CredentialsDto, EmailDto} from './auth.dto';
import { SafeUser } from '../user/user.types';
import { GoogleAuthGuard } from './google-auth-guard';
import {setTokensInCookie} from "./helpers";

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    const user = req.user as SafeUser
    return user.id
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: Request, @Res() res: Response) {
    const token = await this.authService.login(req.user as SafeUser);
    setTokensInCookie(res, token)
    return res.status(201).end();
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() credentials: CredentialsDto, @Res() res: Response) {
    const user: SafeUser = await this.authService.register(credentials);
    const token = await this.authService.login(user)
    setTokensInCookie(res, token)
    return res.status(201).end();
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Res() res: Response) {
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
  async refresh(@Req() req: Request) {
    const refreshToken: string = req.cookies['refresh_token'];
    if (!refreshToken) throw new UnauthorizedException('User is not signed in');
    return this.authService.refresh(refreshToken);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleLogin(@Req() req: Request) {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request) {
    return this.authService.loginWithGoogle(req);
  }

  @Post('forgot')
  async forgotPassword(@Body() body: EmailDto) {
    return await this.authService.sendPasswordResetLink(body.email)
  }
}
