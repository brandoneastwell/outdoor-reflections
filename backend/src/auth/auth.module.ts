import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { LocalStrategy } from './local.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { AuthRepository } from './auth.repository';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './google.strategy';
import {JwtStrategy} from "./jwt.strategy";

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '10m' },
    }),
    DatabaseModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, AuthRepository, GoogleStrategy],
  exports: [AuthService],
})
export class AuthModule {}
