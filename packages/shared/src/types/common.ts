// Common types used across the platform

export type ID = string;

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface BaseEntity extends Timestamps {
  id: ID;
}

export interface PaginatedRequest {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };
