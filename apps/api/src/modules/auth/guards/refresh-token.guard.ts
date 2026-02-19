import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { BaseJwtGuard } from './base-jwt.guard';
import { TokenType } from '../../token/types/token-types.enum';

@Injectable()
export class RefreshTokenGuard extends BaseJwtGuard {
  protected extractToken(request: Request): string | null {
    return request.cookies?.['refresh_token'] ?? null;
  }

  protected getSecretName(): string {
    return `${TokenType.REFRESH_TOKEN}_SECRET`;
  }
}
