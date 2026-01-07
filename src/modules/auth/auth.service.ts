import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SignUpDto } from './dto/sign-up.dto';
import type { AuthTokens } from '../token/types/auth-tokens.type';
import { hash, verify } from 'argon2';
import { LoginDto } from './dto/login.dto';
import { TokenService } from '../token/token.service';
import { UsersService } from '../users/users.service';
import { CountryEntity } from 'src/database/entities/country.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
  ) {}

  async signUp(dto: SignUpDto): Promise<AuthTokens> {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await this.hashData(dto.password);

    const user = await this.usersService.createUser({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      dateOfBirth: new Date(dto.dateOfBirth),
      country: { code: dto.country } as CountryEntity,
    });

    return this.tokenService.generateAuthTokens({
      userId: user.id,
      role: user.role,
    });
  }

  private hashData(data: string): Promise<string> {
    return hash(data);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new ForbiddenException('Invalid email or password');
    }

    const isPasswordValid = await verify(user.password, dto.password);

    if (!isPasswordValid) {
      throw new ForbiddenException('Invalid email or password');
    }

    return this.tokenService.generateAuthTokens({
      userId: user.id,
      role: user.role,
    });
  }

  async rotateAuthTokens(
    refreshToken: string,
    userId: string,
  ): Promise<AuthTokens> {
    const authUser = await this.usersService.resolveAuthUser(userId);

    return this.tokenService.rotateAuthTokens(refreshToken, authUser);
  }

  logout(refreshToken: string, userId: string): Promise<void> {
    return this.tokenService.invalidateRefreshToken(refreshToken, userId);
  }
}
