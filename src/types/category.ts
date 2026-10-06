export interface CreateCategoryRequest {
  name: string;
  bankId: string;
  parentId?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  parentId?: string;
}

export interface CategoryResponse {
  id: string;
  name: string;
  parentId: string | null;
  bankId: string;
  children?: CategoryResponse[];
  questions?: import('./question').QuestionResponse[];
  _count?: { questions: number };
  parent?: CategoryResponse | null;
}
