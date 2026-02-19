import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { UsersMediaService } from './services/users-media.service';
import { AllowedImageContentTypesDto } from '../../common/dto/image-content-types.dto';
import { ConfirmAvatarDto } from './dto/confirm-avatar.dto';

@Controller('users')
@UseGuards(JwtGuard)
export class UsersController {
  constructor(private readonly usersMediaService: UsersMediaService) {}

  @Patch('me/avatar/upload-intent')
  updateAvatar(
    @CurrentUserId() userId: string,
    @Body() { contentType }: AllowedImageContentTypesDto,
  ) {
    return this.usersMediaService.updateAvatar(userId, contentType);
  }

  @Post('me/avatar/confirm')
  async confirmAvatar(
    @CurrentUserId() userId: string,
    @Body() { storageKey }: ConfirmAvatarDto,
  ) {
    await this.usersMediaService.confirmAvatar(userId, storageKey);

    return { message: 'Avatar updated successfully' };
  }
}
