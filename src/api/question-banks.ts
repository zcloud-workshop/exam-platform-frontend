import request from './request';
import type { ApiResponse, PaginatedResult } from '@/types/api';
import type {
  CreateQuestionBankRequest,
  UpdateQuestionBankRequest,
  QueryQuestionBankParams,
  QuestionBankResponse,
  BankShareResponse,
  BankArchive,
  BankImportSummary,
  ArchiveImportMode,
} from '@/types/question-bank';
import type { BankShareRole } from '@/types/enums';

export function createQuestionBank(data: CreateQuestionBankRequest) {
  return request.post<any, ApiResponse<QuestionBankResponse>>('/question-banks', data);
}

export function getQuestionBanks(params?: QueryQuestionBankParams) {
  return request.get<any, ApiResponse<PaginatedResult<QuestionBankResponse>>>('/question-banks', { params });
}

export function updateQuestionBank(id: string, data: UpdateQuestionBankRequest) {
  return request.patch<any, ApiResponse<QuestionBankResponse>>(`/question-banks/${id}`, data);
}

export function deleteQuestionBank(id: string) {
  return request.delete<any, ApiResponse<void>>(`/question-banks/${id}`);
}

export function getBankShares(bankId: string) {
  return request.get<any, ApiResponse<BankShareResponse[]>>(`/question-banks/${bankId}/shares`);
}

export function addBankShare(bankId: string, data: { userId: string; role: BankShareRole }) {
  return request.post<any, ApiResponse<BankShareResponse>>(`/question-banks/${bankId}/shares`, data);
}

export function removeBankShare(bankId: string, shareId: string) {
  return request.delete<any, ApiResponse<void>>(`/question-banks/${bankId}/shares/${shareId}`);
}

/** 导出题库为 JSON 归档 (分类树 + 完整题目) */
export function exportBankArchive(bankId: string) {
  return request.get<any, ApiResponse<BankArchive>>(`/question-banks/${bankId}/export`, { timeout: 180000 });
}

/** 将归档导入到指定题库, mode: skip(默认) | overwrite | merge */
export function importBankArchive(bankId: string, archive: BankArchive, mode?: ArchiveImportMode) {
  return request.post<any, ApiResponse<BankImportSummary>>(`/question-banks/${bankId}/import`, {
    archive,
    mode,
  }, { timeout: 180000 });
}

export function createBankFromArchive(archive: BankArchive, name: string) {
  return request.post<any, ApiResponse<{ bankId: string; summary: BankImportSummary }>>('/question-banks/import', {
    archive,
    name,
  }, { timeout: 180000 });
}
