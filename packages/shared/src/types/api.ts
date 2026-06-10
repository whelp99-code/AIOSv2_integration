// API-related types

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: unknown;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
  error?: string;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
