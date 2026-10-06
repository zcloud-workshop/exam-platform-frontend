import request from './request';
import type { ApiResponse, PaginatedResult } from '@/types/api';
import type { CreatePaperRequest, UpdatePaperRequest, QueryPaperParams, PaperResponse } from '@/types/paper';

export function createPaper(data: CreatePaperRequest) {
  return request.post<any, ApiResponse<PaperResponse>>('/papers', data);
}

export function getPapers(params?: QueryPaperParams) {
  return request.get<any, ApiResponse<PaginatedResult<PaperResponse>>>('/papers', { params });
}

export function getPaper(id: string) {
  return request.get<any, ApiResponse<PaperResponse>>(`/papers/${id}`);
}

export function updatePaper(id: string, data: UpdatePaperRequest) {
  return request.patch<any, ApiResponse<PaperResponse>>(`/papers/${id}`, data);
}

export function deletePaper(id: string) {
  return request.delete<any, ApiResponse<void>>(`/papers/${id}`);
}
