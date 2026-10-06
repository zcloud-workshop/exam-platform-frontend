import request from './request';

export async function downloadFile(url: string, filename: string, params?: Record<string, string | undefined>, timeout = 30000) {
  const response = await request.get(url, { responseType: 'blob', params, timeout });
  const blob = new Blob([response as unknown as BlobPart]);
  saveBlob(blob, filename);
}

export function saveBlob(blob: Blob, filename: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
