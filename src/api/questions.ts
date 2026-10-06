import request from './request';
import { downloadFile } from './helpers';
import type { ApiResponse, PaginatedResult } from '@/types/api';
import type {
  CreateQuestionRequest,
  UpdateQuestionRequest,
  QueryQuestionParams,
  QuestionResponse,
  ImportResult,
} from '@/types/question';

export function createQuestion(data: CreateQuestionRequest) {
  return request.post<any, ApiResponse<QuestionResponse>>('/questions', data);
}

export function getQuestions(params?: QueryQuestionParams) {
  return request.get<any, ApiResponse<PaginatedResult<QuestionResponse>>>('/questions', { params });
}

export function getQuestion(id: string, locale?: string) {
  return request.get<any, ApiResponse<QuestionResponse>>(`/questions/${id}`, { params: locale ? { locale } : undefined });
}

export function updateQuestion(id: string, data: UpdateQuestionRequest) {
  return request.patch<any, ApiResponse<QuestionResponse>>(`/questions/${id}`, data);
}

export function deleteQuestion(id: string) {
  return request.delete<any, ApiResponse<void>>(`/questions/${id}`);
}

export function exportQuestions(bankId: string, categoryId?: string, filename = 'questions.xlsx') {
  return downloadFile('/questions/export', filename, { bankId, categoryId });
}

export function importQuestions(bankId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<any, ApiResponse<ImportResult>>('/questions/import', formData, {
    params: { bankId },
  });
}

export function createBankFromExcel(file: File, name: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', name);
  return request.post<any, ApiResponse<{ bankId: string; summary: ImportResult }>>('/questions/import/new-bank', formData);
}
