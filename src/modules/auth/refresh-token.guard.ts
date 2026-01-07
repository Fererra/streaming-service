import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { BaseJwtGuard } from './base-jwt.guard';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { TokenType } from '../token/types/token-types.enum';

@Injectable()
export class RefreshTokenGuard extends BaseJwtGuard {
  constructor(
    usersService: UsersService,
    jwtService: JwtService,
    configService: ConfigService,
  ) {
    super(usersService, jwtService, configService);
  }

  protected extractToken(request: Request): string | null {
    return request.cookies?.['refresh_token'] ?? null;
  }

  protected getSecretName(): string {
    return `${TokenType.REFRESH_TOKEN}_SECRET`;
  }
}
