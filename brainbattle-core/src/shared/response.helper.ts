/**
 * Response wrapper utilities for /community endpoints
 * Matches Flutter frontend expectations: {data, meta} for success
 */

export interface ApiResponse<T> {
  data: T;
  meta: Record<string, any>;
}

export interface ApiListResponse<T> {
  data: {
    items: T[];
  };
  meta: {
    nextCursor: string | null;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Wrap successful response with data
 */
export function wrapSuccess<T>(data: T, meta: Record<string, any> = {}): ApiResponse<T> {
  return { data, meta };
}

/**
 * Wrap list response with pagination
 * Returns { data: { items }, meta: { nextCursor } }
 */
export function wrapList<T>(items: T[], nextCursor: string | null = null): ApiListResponse<T> {
  return {
    data: { items },
    meta: { nextCursor },
  };
}

/**
 * Wrap error response
 */
export function wrapError(code: string, message: string, details?: any): ApiError {
  return {
    error: { code, message, details },
  };
}
