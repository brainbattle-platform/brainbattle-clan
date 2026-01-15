/**
 * Response wrapper for /community API endpoints
 * Matches Flutter frontend contract: { data, meta } | { error }
 */

export interface ApiResponse<T = any> {
  data: T;
  meta: Record<string, any>;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Wrap data in standard { data, meta } format
 */
export function wrapSuccess<T>(data: T, meta: Record<string, any> = {}): ApiResponse<T> {
  return { data, meta };
}

/**
 * Wrap list with cursor in standard format
 * Returns { data: { items }, meta: { nextCursor } }
 */
export function wrapList<T>(items: T[], nextCursor: string | null = null): ApiResponse<{ items: T[] }> {
  return {
    data: { items },
    meta: { nextCursor },
  };
}

/**
 * Create error response
 */
export function wrapError(code: string, message: string, details?: any): ApiErrorResponse {
  return {
    error: { code, message, details },
  };
}
