import { IsString, Matches } from 'class-validator';

export class ConfirmAvatarDto {
  @IsString()
  @Matches(/^users\/avatars\/\d+-[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i, {
    message: 'Invalid storage key format',
  })
  storageKey: string;
}
