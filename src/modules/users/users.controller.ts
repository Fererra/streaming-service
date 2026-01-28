import {
  Controller,
  ParseFilePipe,
  Patch,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiImageFile } from 'src/common/decorators/image-upload.decorator';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('users')
@UseGuards(JwtGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me/avatar')
  @ApiImageFile('avatar')
  async updateAvatar(
    @CurrentUserId() userId: string,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true }))
    avatar: Express.Multer.File,
  ) {
    await this.usersService.updateAvatar(userId, {
      buffer: avatar.buffer,
      contentType: avatar.mimetype,
    });

    return {
      message: 'User avatar updated successfully',
    };
  }
}
