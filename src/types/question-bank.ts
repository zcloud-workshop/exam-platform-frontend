import type { PaginationParams, PaginatedResult } from './api';
import type { BankShareRole } from './enums';

export interface CreateQuestionBankRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface UpdateQuestionBankRequest {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

export interface QueryQuestionBankParams extends PaginationParams {
  keyword?: string;
  isPublic?: boolean;
}

export interface BankShareResponse {
  id: string;
  bankId: string;
  userId: string;
  role: BankShareRole;
  createdAt: string;
  user?: { id: string; username: string };
}

export type BankPermission = 'owner' | 'viewer' | 'editor' | 'exam_manager';

export interface QuestionBankResponse {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  createdBy: string;
  creator?: { id: string; username: string };
  shares?: BankShareResponse[];
  permission?: BankPermission;
  _count?: {
    questions: number;
    categories: number;
    papers: number;
  };
}

export type PaginatedQuestionBanks = PaginatedResult<QuestionBankResponse>;

/** 题库归档冲突处理策略 */
export type ArchiveImportMode = 'skip' | 'overwrite' | 'merge';

/** 归档元信息 */
export interface ArchiveMeta {
  id: string;
  name: string;
  description?: string;
  exportedAt: string;
  version: number;
}

/** 归档分类条目 */
export interface ArchiveCategory {
  id: string;
  name: string;
  parentId?: string | null;
}

/** 归档题目条目 (options/translations 保持 JSON 字符串) */
export interface ArchiveQuestion {
  id: string;
  title: string;
  type: string;
  options?: string | null;
  answer: string;
  analysis?: string | null;
  difficulty: number;
  score: number;
  categoryId?: string | null;
  locale: string;
  translations?: string | null;
}

/** GET /question-banks/:id/export 响应体 */
export interface BankArchive {
  meta: ArchiveMeta;
  categories: ArchiveCategory[];
  questions: ArchiveQuestion[];
}

/** POST /question-banks/:id/import 结果摘要 */
export interface BankImportSummary {
  categoriesImported: number;
  questionsImported: number;
  skipped: number;
  errors: { message: string }[];
}
