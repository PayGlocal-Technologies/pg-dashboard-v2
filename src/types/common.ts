/** Standard API envelope returned by the backend (and the dev mock route handlers). */
export interface BaseResponse<T> {
  message?: string;
  errors?: unknown;
  data: T;
}

/** Paginated list payload carried inside `BaseResponse.data`. */
export interface Paginated<T> {
  data: T[];
  totalCount: number;
}
