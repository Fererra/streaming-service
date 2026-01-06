import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { BaseJwtGuard } from './base-jwt.guard';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { TokenType } from '../token/types/token-types.enum';

@Injectable()
export class JwtGuard extends BaseJwtGuard {
  constructor(
    usersService: UsersService,
    jwtService: JwtService,
    configService: ConfigService,
  ) {
    super(usersService, jwtService, configService);
  }

  protected extractToken(request: Request): string | null {
    const header = request.headers['Authorization'];
    if (!header) return null;

    const [scheme, token] = String(header).split(' ');
    if (scheme !== 'Bearer' || !token) return null;

    return token;
  }

  protected getSecretName(): string {
    return `${TokenType.ACCESS_TOKEN}_SECRET`;
  }
}
