import request from './request';
import type { ApiResponse, PaginatedResult } from '@/types/api';
import type { CreateExamRequest, UpdateExamRequest, QueryExamParams, ExamResponse } from '@/types/exam';

export function createExam(data: CreateExamRequest) {
  return request.post<any, ApiResponse<ExamResponse>>('/exams', data);
}

export function getExams(params?: QueryExamParams) {
  return request.get<any, ApiResponse<PaginatedResult<ExamResponse>>>('/exams', { params });
}

export function getExam(id: string) {
  return request.get<any, ApiResponse<ExamResponse>>(`/exams/${id}`);
}

export function updateExam(id: string, data: UpdateExamRequest) {
  return request.patch<any, ApiResponse<ExamResponse>>(`/exams/${id}`, data);
}

export function deleteExam(id: string) {
  return request.delete<any, ApiResponse<void>>(`/exams/${id}`);
}
