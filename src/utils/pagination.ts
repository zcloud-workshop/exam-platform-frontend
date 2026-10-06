import type { ApiResponse, PaginatedResult, PaginationParams } from '@/types/api';

export async function getAllPages<T>(fetchPage: (params: PaginationParams) => Promise<ApiResponse<PaginatedResult<T>>>) {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const { data } = await fetchPage({ page, pageSize: 100 });
    items.push(...data.data);
    if (items.length >= data.total || data.data.length === 0) return items;
  }
}
