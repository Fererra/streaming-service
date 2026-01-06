import { Controller, Post, Body, Res, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { AuthResponse } from './types/auth-response.type';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  async signUp(
    @Body() signUpDto: SignUpDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const { accessToken, refreshToken } =
      await this.authService.signUp(signUpDto);

    this.setRefreshTokenCookie(response, refreshToken);

    return { accessToken };
  }

  @Post('login')
  @HttpCode(200)
  public async login(
    @Body() options: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const { accessToken, refreshToken } = await this.authService.login(options);

    this.setRefreshTokenCookie(response, refreshToken);

    return { accessToken };
  }

  private setRefreshTokenCookie(response: Response, token: string) {
    response.cookie('refresh_token', token, {
      httpOnly: true,
      path: '/',
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: this.configService.get<number>('COOKIE_MAX_AGE'),
    });
  }
}
