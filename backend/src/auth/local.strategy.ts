import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SafeUser } from '../user/user.types';
import { CredentialsSchema } from './auth.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<SafeUser> {
    const credentials = CredentialsSchema.parse({ email, password });
    const user = await this.authService.validateLocalUser(
      credentials.email,
      credentials.password,
    );
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
