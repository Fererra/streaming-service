export interface PaginationOptions {
  page: number;
  limit: number;
}

export type RepositoryPaginatedResult<T> = [data: T[], total: number];

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  lastPage: number;
}

export interface PaginationResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
