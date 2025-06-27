// src/app/types/api.ts - API response and request types

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
  }
  
  export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }
  
  export interface ApiError extends Error {
    code?: string;
    statusCode?: number;
  }
  
  export interface PaginationQuery {
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  }
  
  export interface SearchQuery {
    q?: string;
    filters?: Record<string, any>;
  }
  
  export interface ApiRequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    body?: any;
    credentials?: RequestCredentials;
  }