import type { PaginationParams } from './api';
import type { QuestionResponse } from './question';

export interface CreatePaperRequest {
  name: string;
  duration: number;
  totalScore: number;
  bankId: string;
  questionIds: string[];
}

export interface UpdatePaperRequest {
  name?: string;
  duration?: number;
  totalScore?: number;
  questionIds?: string[];
}

export interface QueryPaperParams extends PaginationParams {
  bankId?: string;
  keyword?: string;
}

export interface PaperQuestionItem {
  paperId: string;
  questionId: string;
  sortOrder: number;
  question: QuestionResponse;
}

export interface PaperResponse {
  id: string;
  name: string;
  duration: number;
  totalScore: number;
  createdAt: string;
  bankId: string;
  questions: PaperQuestionItem[];
  _count?: { exams: number };
}
