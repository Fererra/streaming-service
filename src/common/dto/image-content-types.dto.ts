import { IsIn, IsMimeType } from 'class-validator';

export class AllowedImageContentTypesDto {
  @IsMimeType()
  @IsIn(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
  contentType: string;
}
