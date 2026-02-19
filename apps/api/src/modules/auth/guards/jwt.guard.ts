import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { BaseJwtGuard } from './base-jwt.guard';
import { TokenType } from '../../token/types/token-types.enum';

@Injectable()
export class JwtGuard extends BaseJwtGuard {
  protected extractToken(request: Request): string | null {
    const header = request.headers['authorization'];
    if (!header) return null;

    const [scheme, token] = String(header).split(' ');
    if (scheme !== 'Bearer' || !token) return null;

    return token;
  }

  protected getSecretName(): string {
    return `${TokenType.ACCESS_TOKEN}_SECRET`;
  }
}
