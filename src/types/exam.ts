import type { PaginationParams } from './api';
import type { PaperResponse } from './paper';
import type { UserResponse } from './user';

export interface CreateExamRequest {
  name: string;
  paperId: string;
  startTime: string;
  endTime: string;
  showScore?: boolean;
  studentIds?: string[];
}

export interface UpdateExamRequest {
  name?: string;
  startTime?: string;
  endTime?: string;
  showScore?: boolean;
  studentIds?: string[];
}

export interface QueryExamParams extends PaginationParams {
  keyword?: string;
  bankId?: string;
}

export interface ExamResponse {
  id: string;
  name: string;
  paperId: string;
  startTime: string;
  endTime: string;
  showScore: boolean;
  createdAt: string;
  paper: PaperResponse;
  participants?: { userId: string; user: Pick<UserResponse, 'id' | 'username' | 'role'> }[];
  _count?: { records: number; participants?: number };
}
