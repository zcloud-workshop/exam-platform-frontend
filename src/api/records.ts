import request from './request';
import type { ApiResponse, PaginatedResult } from '@/types/api';
import type {
  SubmitAnswerRequest,
  SaveDraftRequest,
  DraftResponse,
  RecordResponse,
  StatsResponse,
} from '@/types/record';

export function submitExam(examId: string, data: SubmitAnswerRequest) {
  return request.post<any, ApiResponse<RecordResponse>>(`/exams/${examId}/records`, data);
}

export function saveDraft(examId: string, data: SaveDraftRequest) {
  return request.put<any, ApiResponse<RecordResponse>>(`/exams/${examId}/records/draft`, data);
}

export function getDraft(examId: string) {
  return request.get<any, ApiResponse<DraftResponse>>(`/exams/${examId}/records/draft`);
}

export function getRecords(examId: string, params?: { page?: number; pageSize?: number }) {
  return request.get<any, ApiResponse<PaginatedResult<RecordResponse>>>(`/exams/${examId}/records`, { params });
}

export function getStats(examId: string) {
  return request.get<any, ApiResponse<StatsResponse>>(`/exams/${examId}/records/stats`);
}
