import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { AuthResponse } from './types/auth-response.type';
import { JwtGuard } from './guards/jwt.guard';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';
import { RefreshToken } from 'src/common/decorators/refresh-token.decorator';
import { RefreshTokenGuard } from './guards/refresh-token.guard';

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
  async login(
    @Body() options: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const { accessToken, refreshToken } = await this.authService.login(options);

    this.setRefreshTokenCookie(response, refreshToken);

    return { accessToken };
  }

  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  @HttpCode(200)
  async refresh(
    @RefreshToken() refreshToken: string,
    @CurrentUserId() userId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const { accessToken, refreshToken: newRefreshToken } =
      await this.authService.rotateAuthTokens(refreshToken, userId);

    this.setRefreshTokenCookie(response, newRefreshToken);

    return { accessToken };
  }

  private setRefreshTokenCookie(response: Response, token: string): void {
    response.cookie('refresh_token', token, {
      httpOnly: true,
      path: '/',
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: this.configService.get<number>('COOKIE_MAX_AGE'),
    });
  }

  @Post('logout')
  @UseGuards(JwtGuard)
  @HttpCode(200)
  async logout(
    @RefreshToken() refreshToken: string,
    @CurrentUserId() userId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(refreshToken, userId);

    this.clearRefreshTokenCookie(response);

    return { message: 'Logged out successfully' };
  }

  private clearRefreshTokenCookie(response: Response): void {
    response.clearCookie('refresh_token', {
      httpOnly: true,
      path: '/',
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
    });
  }
}
