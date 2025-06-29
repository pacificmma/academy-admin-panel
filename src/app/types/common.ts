// src/app/types/common.ts - Common utility types

export interface BaseEntity {
    id: string;
    createdAt: string;
    updatedAt?: string;
  }
  
  export interface TimestampedEntity extends BaseEntity {
    createdBy?: string;
    updatedBy?: string;
  }
  
  export interface SoftDeletableEntity extends TimestampedEntity {
    deletedAt?: string;
    deletedBy?: string;
    isDeleted?: boolean;
  }
  
  export interface ActivityLog {
    id: string;
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    timestamp: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }
  
  export interface FileUpload {
    id: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    uploadedBy: string;
    uploadedAt: string;
  }
  
  export interface AppError extends Error {
    code?: string;
    statusCode?: number;
    details?: Record<string, any>;
  }
  
  export interface AppConfig {
    appName: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    features: Record<string, boolean>;
    limits: {
      maxFileSize: number;
      maxFilesPerUpload: number;
      sessionTimeout: number;
    };
  }
  
  export interface NotificationConfig {
    email: {
      enabled: boolean;
      templates: Record<string, string>;
    };
    push: {
      enabled: boolean;
    };
    sms: {
      enabled: boolean;
    };
  }
  
  export type SortDirection = 'asc' | 'desc';
  
  export interface SortConfig {
    field: string;
    direction: SortDirection;
  }
  
  export interface FilterOption {
    label: string;
    value: string;
    count?: number;
  }
  
  export interface DateRange {
    start: Date | string;
    end: Date | string;
  }
  
  export interface Coordinates {
    latitude: number;
    longitude: number;
  }
  
  export interface Address {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: Coordinates;
  }