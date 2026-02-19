import { IsString, Matches } from 'class-validator';

export class ConfirmVideoDto {
  @IsString()
  @Matches(/^movies\/[a-f0-9-]{36}\/video\.mp4$/i, {
    message: 'Invalid storage key format',
  })
  storageKey: string;
}
