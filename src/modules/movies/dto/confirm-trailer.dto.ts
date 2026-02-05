import { IsString, Matches } from 'class-validator';

export class ConfirmTrailerDto {
  @IsString()
  @Matches(/^movies\/[a-f0-9-]{36}\/trailer\.mp4$/i, {
    message: 'Invalid storage key format',
  })
  storageKey: string;
}
