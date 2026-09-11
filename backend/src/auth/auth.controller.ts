import { AuthService } from './auth.service';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus, NotFoundException,
  Post, Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { LocalAuthGuard } from './local-auth-guard';
import { JwtAuthGuard } from './jwt-auth-guard';
import {CredentialsDto, EmailDto, ResetPasswordDto} from './auth.dto';
import { SafeUser } from '../user/user.types';
import { GoogleAuthGuard } from './google-auth-guard';
import {setAuthTokenInCookies} from "./helpers";

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
    const refreshToken: string = req.cookies['refresh_token'];
    const token = await this.authService.login(req.user as SafeUser, refreshToken);
    setAuthTokenInCookies(res, token)
    return res.status(201).json({ message: 'Successfully logged in' });
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() credentials: CredentialsDto, @Res() res: Response) {
    const user: SafeUser = await this.authService.register(credentials);
    const token = await this.authService.login(user)
    setAuthTokenInCookies(res, token)
    return res.status(201).json({ message: 'Successfully registered' });
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
  async refresh(@Res() res: Response, @Req() req: Request) {
    const refreshToken: string = req.cookies['refresh_token'];
    if (!refreshToken) throw new UnauthorizedException('User is not signed in');
    const accessToken = await this.authService.refresh(refreshToken);
    setAuthTokenInCookies(res, accessToken)
    return res.status(201).json({ message: 'refreshed token' });
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleLogin(@Req() req: Request) {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request) {
    return this.authService.loginWithGoogle(req);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: EmailDto, @Res() res: Response) {
    const message = "If the email matches an account in our system, a password reset link has been sent."

    try {
      await this.authService.sendPasswordResetLink(body.email)
      return res.status(200).json({ message })
    } catch (error) {
      if (error instanceof NotFoundException) return res.status(200).json({ message })
      return error
    }
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.CREATED)
  async resetPassword(@Body() body: ResetPasswordDto) {
    return await this.authService.resetPassword(body.token, body.password)
  }
}