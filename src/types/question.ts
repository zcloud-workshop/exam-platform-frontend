import type { PaginationParams } from './api';
import type { QuestionType } from './enums';
import type { CategoryResponse } from './category';

export interface QuestionImageResponse {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  optionKey: string | null;
  url: string;
  expiresAt: string;
}

export interface QuestionTranslation {
  title: string;
  options?: Record<string, string>;
  answer?: string;
  analysis?: string;
}

export interface CreateQuestionRequest {
  title: string;
  type: QuestionType;
  bankId: string;
  options?: Record<string, string>;
  answer: string;
  analysis?: string;
  difficulty?: number;
  score?: number;
  categoryId?: string;
  /** 主语言 (zh 中文 / en 英语), 二选一 */
  locale?: 'zh' | 'en';
  translations?: Record<string, QuestionTranslation>;
}

export type UpdateQuestionRequest = Partial<Omit<CreateQuestionRequest, 'bankId'>>;

export interface QueryQuestionParams extends PaginationParams {
  bankId?: string;
  type?: QuestionType;
  categoryId?: string;
  difficulty?: number;
  keyword?: string;
  locale?: string;
}

export interface QuestionResponse {
  id: string;
  title: string;
  type: QuestionType;
  options: Record<string, string>;
  answer: string;
  analysis: string | null;
  difficulty: number;
  score: number;
  categoryId: string | null;
  bankId: string;
  /** 主语言 (zh 中文 / en 英语) */
  locale: 'zh' | 'en';
  translations: Record<string, QuestionTranslation> | null;
  category: CategoryResponse | null;
  images?: QuestionImageResponse[];
}

export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}
