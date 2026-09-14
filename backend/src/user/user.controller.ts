import { UserService } from './user.service';
import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';

@Controller('users')
export class UserController {
  constructor(
    private userService: UserService,
    private authService: AuthService,
  ) {}

  @Get(':id')
  findOne(@Req() req: Request) {
    const userId = Number(req.params.id);
    return this.userService.findUserByID(userId);
  }
}
