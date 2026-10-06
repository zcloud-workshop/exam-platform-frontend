import request from './request';
import { downloadFile } from './helpers';
import type { ApiResponse, PaginatedResult } from '@/types/api';
import type { FileResponse, QueryFileParams } from '@/types/file';

export function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<any, ApiResponse<FileResponse>>('/files/upload', formData);
}

export function getFiles(params?: QueryFileParams) {
  return request.get<any, ApiResponse<PaginatedResult<FileResponse>>>('/files', { params });
}

export function downloadFileById(id: string, filename: string) {
  return downloadFile(`/files/${id}`, filename);
}

export function deleteFile(id: string) {
  return request.delete<any, ApiResponse<void>>(`/files/${id}`);
}
