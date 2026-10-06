import type { RecordStatus, Role } from './enums';
import type { ExamResponse } from './exam';

export interface SubmitAnswerRequest {
  answers: Record<string, string>;
}

export interface SaveDraftRequest {
  answers: Record<string, string>;
}

export interface DraftResponse {
  answers: Record<string, string>;
}

export interface GradeDetail {
  answer: string;
  correct: string;
  score: number;
  earned: number;
}

export interface RecordResponse {
  id: string;
  examId: string;
  userId: string;
  status: RecordStatus;
  score: number | null;
  answers: Record<string, string> | Record<string, GradeDetail>;
  submittedAt: string | null;
  createdAt: string;
  user?: { id: string; username: string; role: Role };
  exam?: ExamResponse;
}

export interface StatsResponse {
  count: number;
  max: number;
  min: number;
  avg: number;
}
