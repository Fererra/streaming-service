import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserEntity } from 'src/database/entities/user.entity';
import type { AuthUser } from '../auth/types/auth-user.type';
import type { IUsersRepository } from 'src/database/repositories/interfaces/users-repository.interface';
import { USERS_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';
import type {
  PaginationOptions,
  PaginationResponse,
} from 'src/common/@types/pagination.types';
import { UserRole } from './user-role.enum';
import { buildPaginationResponse } from 'src/common/utils/pagination.util';
import { UserDto } from './dto/user.dto';
import type {
  ImageStorage,
  InputOptions,
} from '../storage/image-storage.interface';
import { IMAGE_STORAGE } from '../storage/storage.token';
import { ImageStoragePath } from '../storage/storage-path.enum';
import { extension } from 'mime-types';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    @Inject(IMAGE_STORAGE)
    private readonly imageStorage: ImageStorage,
  ) {}

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findByEmail(email);
  }

  async searchUsers(
    paginationOptions: PaginationOptions,
    search?: string,
  ): Promise<PaginationResponse<UserDto>> {
    const [users, total] = await this.usersRepository.searchUsers(
      paginationOptions,
      search,
    );

    return buildPaginationResponse(users, total, paginationOptions);
  }

  existsById(userId: string): Promise<boolean> {
    return this.usersRepository.existsById(userId);
  }

  createUser(data: Partial<UserEntity>): Promise<UserEntity> {
    return this.usersRepository.createUser(data);
  }

  async updateAvatar(userId: string, avatar: InputOptions): Promise<void> {
    const userAvatar = await this.usersRepository.getAvatarPath(userId);

    const { storageKey } = await this.imageStorage.upload(avatar, {
      path: ImageStoragePath.USER_AVATARS,
      extension: extension(avatar.contentType) || 'bin',
      isPublic: false,
    });

    try {
      await this.usersRepository.update(userId, { avatarPath: storageKey });

      if (userAvatar) {
        await this.imageStorage.delete(userAvatar, false);
      }
    } catch (error) {
      await this.imageStorage.delete(storageKey, false);
      throw error;
    }
  }

  async resolveAuthUser(userId: string): Promise<AuthUser> {
    const user = await this.usersRepository.resolveAuthUser(userId);

    if (!user) throw new UnauthorizedException('User not found');

    return user;
  }

  async promoteToAdmin(userId: string): Promise<void> {
    const user = await this.usersRepository.findByUserId(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.ADMIN) {
      throw new ConflictException('User is already an admin');
    }

    await this.usersRepository.promoteToAdmin(userId);
  }

  async demoteFromAdmin(userId: string): Promise<void> {
    const user = await this.usersRepository.findByUserId(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ConflictException('User is not an admin');
    }

    await this.usersRepository.demoteFromAdmin(userId);
  }
}
