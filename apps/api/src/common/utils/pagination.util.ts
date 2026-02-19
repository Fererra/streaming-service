import {
  PaginationOptions,
  PaginationResponse,
} from '../@types/pagination.types';

export const buildPaginationResponse = <T>(
  data: T[],
  total: number,
  paginationOptions: PaginationOptions,
): PaginationResponse<T> => {
  return {
    data,
    meta: {
      total,
      page: paginationOptions.page,
      limit: paginationOptions.limit,
      lastPage: Math.max(1, Math.ceil(total / paginationOptions.limit)),
    },
  };
};
