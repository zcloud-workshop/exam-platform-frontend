import request from './request';
import type { ApiResponse, PaginatedResult } from '@/types/api';
import type { QueryLogParams, LogResponse } from '@/types/log';

export function getLogs(params?: QueryLogParams) {
  return request.get<any, ApiResponse<PaginatedResult<LogResponse>>>('/logs', { params });
}
