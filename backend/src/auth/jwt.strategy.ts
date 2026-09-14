import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import {getJWTFromCookie} from "./helpers";
import {SafeUser} from "../user/user.types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: getJWTFromCookie,
      ignoreExpiration: false,
      secretOrKey: <string>process.env.JWT_SECRET,
    });
  }

  async validate(payload: any): Promise<SafeUser> {
    return { id: payload.sub, email: payload.email };
  }
}
