import type { PaginationParams } from './api';

export interface QueryLogParams extends PaginationParams {
  userId?: string;
  username?: string;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
}

export interface LogResponse {
  id: string;
  userId: string | null;
  username: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  method: string;
  path: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}
