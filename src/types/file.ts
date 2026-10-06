import type { PaginationParams } from './api';

export interface FileResponse {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  s3Key: string;
  url: string | null;
  uploadedBy: string | null;
  createdAt: string;
}

export type QueryFileParams = PaginationParams;
