import request from './request';

export async function downloadFile(url: string, filename: string, params?: Record<string, string | undefined>) {
  const response = await request.get(url, { responseType: 'blob', params });
  const blob = new Blob([response as unknown as BlobPart]);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
