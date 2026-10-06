import type { QuestionType } from './enums';
import type { QuestionResponse } from './question';

export interface GenerateQuestionsRequest {
  topic: string;
  type: QuestionType;
  bankId: string;
  count?: number;
  difficulty?: number;
  categoryId?: string;
  locale?: string;
}

export interface GenerateQuestionsResponse {
  count: number;
  questions: QuestionResponse[];
}

export interface PaperRule {
  categoryId?: string;
  type?: QuestionType;
  difficulty?: number;
  count: number;
  scorePerQuestion: number;
}

export interface RulePaperRequest {
  name: string;
  duration: number;
  totalScore: number;
  bankId: string;
  rules: PaperRule[];
}

export interface AiPaperRequest {
  name: string;
  duration: number;
  totalScore: number;
  bankId: string;
  subject: string;
  difficultyPreference?: string;
  categoryId?: string;
}

/** AI 翻译草稿 (单个语言块) */
export interface AiTranslationDraft {
  title: string;
  options?: Record<string, string>;
  answer?: string;
  analysis?: string;
}

export interface TranslateQuestionRequest {
  targetLocale: 'zh' | 'en';
}

export interface TranslateQuestionResponse {
  sourceLocale: 'zh' | 'en';
  targetLocale: 'zh' | 'en';
  translation: AiTranslationDraft;
}
