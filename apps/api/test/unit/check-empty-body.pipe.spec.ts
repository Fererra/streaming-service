import { BadRequestException } from '@nestjs/common';
import { CheckEmptyBodyPipe } from '../../src/common/pipes/check-empty-body.pipe';

describe('CheckEmptyBodyPipe', () => {
  let pipe: CheckEmptyBodyPipe;

  beforeEach(() => {
    pipe = new CheckEmptyBodyPipe();
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should throw BadRequestException when value is an empty object', () => {
    const emptyValue = {};

    expect(() => pipe.transform(emptyValue)).toThrow(BadRequestException);
    expect(() => pipe.transform(emptyValue)).toThrow('Payload cannot be empty');
  });

  it('should return the value when value is not empty', () => {
    const nonEmptyValue = { name: 'John', age: 30 };

    const result = pipe.transform(nonEmptyValue);

    expect(result).toEqual(nonEmptyValue);
  });

  it('should return the value when value has at least one property', () => {
    const singlePropertyValue = { id: 1 };

    const result = pipe.transform(singlePropertyValue);

    expect(result).toEqual(singlePropertyValue);
  });
});
