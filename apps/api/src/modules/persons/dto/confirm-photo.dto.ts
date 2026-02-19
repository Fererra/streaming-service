import { IsString, Matches } from 'class-validator';

export class ConfirmPhotoDto {
  @IsString()
  @Matches(/^persons\/photos\/\d+-[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i, {
    message: 'Invalid storage key format',
  })
  storageKey: string;
}
