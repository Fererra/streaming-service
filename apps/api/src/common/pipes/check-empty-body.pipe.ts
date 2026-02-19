import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class CheckEmptyBodyPipe implements PipeTransform {
  transform(value: any) {
    if (Object.keys(value).length === 0) {
      throw new BadRequestException('Payload cannot be empty');
    }
    return value;
  }
}
