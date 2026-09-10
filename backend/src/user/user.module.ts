import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { AuthService } from '../auth/auth.service';
import { AuthRepository } from '../auth/auth.repository';
import { JwtService } from '@nestjs/jwt';
import {MailService} from "../mail/mail.service";
import {MailModule} from "../mail/mail.module";

@Module({
  imports: [DatabaseModule, MailModule],
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    AuthService,
    AuthRepository,
    JwtService
  ],
  exports: [UserService],
})
export class UserModule {}
