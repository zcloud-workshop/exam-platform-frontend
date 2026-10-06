import request from './request';
import type { ApiResponse, PaginationParams, PaginatedResult } from '@/types/api';
import type { QuestionImageResponse } from '@/types/question';

export interface PublicBankResponse {
  id: string;
  name: string;
  description?: string;
  _count?: { questions: number };
}

export interface PracticeQuestionTranslation {
  title?: string;
  options?: Record<string, string>;
}

export interface PracticeQuestionResponse {
  id: string;
  title: string;
  type: string;
  options: Record<string, string>;
  difficulty: number;
  score: number;
  locale: string;
  translations: Record<string, PracticeQuestionTranslation> | null;
  images?: QuestionImageResponse[];
  isFavorite: boolean;
  isWrong: boolean;
}

export interface CheckAnswerResponse {
  correct: boolean;
  graded: boolean;
  answer: string;
  analysis: string | null;
}

export interface PracticePageQuestion extends PracticeQuestionResponse {
  index: number;
}

export interface PracticeQuestionPageResponse extends PaginatedResult<PracticePageQuestion> {
  questionTotal: number;
  practiceTotal: number;
  seed: string;
  matchingIndexes?: number[];
  initialIndex: number;
}

export type PracticeCollection = 'wrong' | 'favorites';

export interface PracticeSummaryResponse {
  wrongCount: number;
  favoriteCount: number;
  attemptCount: number;
  correctCount: number;
  gradedCount: number;
}

export interface MyPracticeQuestionResponse {
  question: PracticeQuestionResponse;
  bank: { id: string; name: string };
  attemptCount: number;
  wrongCount: number;
  lastAttemptAt: string | null;
}

export interface PracticeRecordResponse {
  id: string;
  userAnswer: string;
  correct: boolean | null;
  answer: string;
  analysis: string | null;
  createdAt: string;
  question: PracticeQuestionResponse;
  bank: { id: string; name: string };
}

export function getPublicBanks() {
  return request.get<any, ApiResponse<PublicBankResponse[]>>('/practice/banks');
}

export function getPracticeQuestionPage(
  bankId: string,
  params: PaginationParams & {
    mode: 'random' | 'sequential'; keyword?: string; seed?: string;
    collection?: PracticeCollection; questionId?: string;
  },
) {
  return request.get<any, ApiResponse<PracticeQuestionPageResponse>>(
    `/practice/banks/${bankId}/question-pages`,
    { params },
  );
}

export function getPracticeQuestion(bankId: string, questionId: string) {
  return request.get<any, ApiResponse<PracticeQuestionResponse>>(
    `/practice/banks/${bankId}/questions/${questionId}`,
  );
}

export function checkPracticeAnswer(bankId: string, questionId: string, userAnswer: string) {
  return request.post<any, ApiResponse<CheckAnswerResponse>>(
    `/practice/banks/${bankId}/questions/${questionId}/check`,
    { userAnswer },
  );
}

export function getMyPracticeSummary() {
  return request.get<any, ApiResponse<PracticeSummaryResponse>>('/practice/mine/summary');
}

export function getMyPracticeQuestions(params: PaginationParams & { collection: PracticeCollection; bankId?: string }) {
  return request.get<any, ApiResponse<PaginatedResult<MyPracticeQuestionResponse>>>('/practice/mine/questions', { params });
}

export function getMyPracticeRecords(params: PaginationParams & { bankId?: string }) {
  return request.get<any, ApiResponse<PaginatedResult<PracticeRecordResponse>>>('/practice/mine/records', { params });
}

export function favoritePracticeQuestion(bankId: string, questionId: string) {
  return request.put<any, ApiResponse<{ isFavorite: boolean }>>(`/practice/banks/${bankId}/questions/${questionId}/favorite`);
}

export function unfavoritePracticeQuestion(bankId: string, questionId: string) {
  return request.delete<any, ApiResponse<{ isFavorite: boolean }>>(`/practice/banks/${bankId}/questions/${questionId}/favorite`);
}

export function removeWrongPracticeQuestion(questionId: string) {
  return request.delete<any, ApiResponse<{ success: boolean }>>(`/practice/mine/wrong-questions/${questionId}`);
}
