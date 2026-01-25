import {
  applyDecorators,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

export function ApiImageFile(
  fieldName: string = 'photo',
  maxSize: number = 5 * 1024 * 1024,
) {
  return applyDecorators(
    UseInterceptors(
      FileInterceptor(fieldName, {
        limits: { fileSize: maxSize },
        fileFilter: (_req, file, callback) => {
          if (!file.mimetype.match(/^image\/(jpeg|png)$/)) {
            return callback(
              new BadRequestException('Only JPG and PNG are allowed'),
              false,
            );
          }
          callback(null, true);
        },
      }),
    ),
  );
}
