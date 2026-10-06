import request from './request';
import type { ApiResponse } from '@/types/api';
import type {
  GenerateQuestionsRequest,
  GenerateQuestionsResponse,
  RulePaperRequest,
  AiPaperRequest,
  TranslateQuestionRequest,
  TranslateQuestionResponse,
} from '@/types/ai';
import type { QuestionResponse } from '@/types/question';
import type { PaperResponse } from '@/types/paper';

export function generateQuestions(data: GenerateQuestionsRequest) {
  return request.post<any, ApiResponse<GenerateQuestionsResponse>>('/ai/questions', data);
}

export function generateAnalysis(id: string) {
  return request.post<any, ApiResponse<QuestionResponse>>(`/ai/analysis/${id}`);
}

export function rulePaperCompose(data: RulePaperRequest) {
  return request.post<any, ApiResponse<PaperResponse>>('/ai/smart-paper/rule', data);
}

export function aiPaperCompose(data: AiPaperRequest) {
  return request.post<any, ApiResponse<PaperResponse>>('/ai/smart-paper/ai', data);
}

/** AI 翻译题目 (返回草稿, 不写库) */
export function translateQuestion(id: string, data: TranslateQuestionRequest) {
  return request.post<any, ApiResponse<TranslateQuestionResponse>>(`/ai/translate/${id}`, data);
}
