import request from './request';
import type { ApiResponse } from '@/types/api';
import type { CreateCategoryRequest, UpdateCategoryRequest, CategoryResponse } from '@/types/category';

export function createCategory(data: CreateCategoryRequest) {
  return request.post<any, ApiResponse<CategoryResponse>>('/categories', data);
}

export function getCategories(bankId: string) {
  return request.get<any, ApiResponse<CategoryResponse[]>>('/categories', { params: { bankId } });
}

export function getCategoryTree(bankId: string) {
  return request.get<any, ApiResponse<CategoryResponse[]>>('/categories/tree', { params: { bankId } });
}

export function updateCategory(id: string, data: UpdateCategoryRequest) {
  return request.patch<any, ApiResponse<CategoryResponse>>(`/categories/${id}`, data);
}

export function deleteCategory(id: string) {
  return request.delete<any, ApiResponse<void>>(`/categories/${id}`);
}
