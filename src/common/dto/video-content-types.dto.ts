import { IsIn, IsMimeType } from 'class-validator';

export class AllowedVideoContentTypesDto {
  @IsMimeType()
  @IsIn(['video/mp4'], {
    message: 'Only MP4 videos are supported',
  })
  contentType: string;
}
