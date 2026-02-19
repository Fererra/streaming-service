import { buildPaginationResponse } from '../../src/common/utils/pagination.util';
import { UserDto } from '../../src/modules/users/dto/user.dto';

describe('buildPaginationResponse', () => {
  it('should build pagination response with data', () => {
    const data = [{ id: 1 }, { id: 2 }];
    const result = buildPaginationResponse(data, 10, { page: 1, limit: 5 });

    expect(result).toEqual({
      data,
      meta: {
        total: 10,
        page: 1,
        limit: 5,
        lastPage: 2,
      },
    });
  });

  it('should calculate correct lastPage when total is exactly divisible by limit', () => {
    const data = [1, 2, 3];
    const result = buildPaginationResponse(data, 15, { page: 2, limit: 5 });

    expect(result.meta.lastPage).toBe(3);
  });

  it('should calculate correct lastPage when total is not divisible by limit', () => {
    const data = [1, 2, 3];
    const result = buildPaginationResponse(data, 16, { page: 1, limit: 5 });

    expect(result.meta.lastPage).toBe(4);
  });

  it('should return lastPage as 1 when total is 0', () => {
    const data: never[] = [];
    const result = buildPaginationResponse(data, 0, { page: 1, limit: 10 });

    expect(result.meta.lastPage).toBe(1);
  });

  it('should return lastPage as 1 when total equals limit', () => {
    const data = [1, 2, 3, 4, 5];
    const result = buildPaginationResponse(data, 5, { page: 1, limit: 5 });

    expect(result.meta.lastPage).toBe(1);
  });

  it('should preserve data array as is', () => {
    const data = [{ id: 'uuid-1' }, { id: 'uuid-2' }];
    const result = buildPaginationResponse(data, 2, { page: 1, limit: 10 });

    expect(result.data).toEqual(data);
  });

  it('should handle large pagination numbers', () => {
    const data = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    const result = buildPaginationResponse(data, 1000000, {
      page: 5000,
      limit: 100,
    });

    expect(result.meta).toEqual({
      total: 1000000,
      page: 5000,
      limit: 100,
      lastPage: 10000,
    });
  });

  it('should handle limit of 1', () => {
    const data = [1];
    const result = buildPaginationResponse(data, 5, { page: 2, limit: 1 });

    expect(result.meta.lastPage).toBe(5);
  });

  it('should work with generic types', () => {
    const users: UserDto[] = [
      { id: 'uuid-1', firstName: 'Joe', lastName: 'Doe' },
      { id: 'uuid-2', firstName: 'Jane', lastName: 'Smith' },
    ];

    const result = buildPaginationResponse<UserDto>(users, 50, {
      page: 1,
      limit: 10,
    });

    expect(result.data[0].firstName).toBe('Joe');
    expect(result.meta.lastPage).toBe(5);
  });

  it('should handle empty data array', () => {
    const data: string[] = [];
    const result = buildPaginationResponse(data, 0, { page: 1, limit: 20 });

    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
    expect(result.meta.lastPage).toBe(1);
  });

  it('should maintain meta properties independently', () => {
    const result = buildPaginationResponse([1], 100, { page: 3, limit: 25 });

    expect(result.meta).toEqual({
      page: 3,
      limit: 25,
      total: 100,
      lastPage: 4,
    });
  });
});
