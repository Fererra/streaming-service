import {
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
} from '../token/types/payload.types';

export abstract class BaseJwtGuard implements CanActivate {
  constructor(
    protected readonly usersService: UsersService,
    protected readonly jwtService: JwtService,
    protected readonly configService: ConfigService,
  ) {}

  protected abstract extractToken(request: Request): string | null;
  protected abstract getSecretName(): string;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authorization token is missing');
    }

    const secretName = this.getSecretName();
    const secret = this.configService.get<string>(secretName);

    if (!secret) throw new UnauthorizedException(`${secret} not configured`);

    const payload = await this.validateToken(token, secret).catch(() => {
      throw new UnauthorizedException('Invalid authorization token');
    });

    const isUserExists = await this.usersService.existsById(payload.sub);

    if (!isUserExists) {
      throw new UnauthorizedException('User does not exist');
    }

    request.user = payload;
    return true;
  }

  private validateToken(
    token: string,
    secret: string,
  ): Promise<AccessTokenPayload | RefreshTokenPayload> {
    return this.jwtService.verifyAsync(token, { secret });
  }
}
