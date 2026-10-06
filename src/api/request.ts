import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';
import i18n from '@/locales';
import { useAuthStore } from '@/stores/authStore';

export interface RequestConfig extends InternalAxiosRequestConfig {
  skipErrorMessage?: boolean;
}

const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
});

request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  return config;
});

request.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const skipErrorMessage = (error.config as RequestConfig | undefined)?.skipErrorMessage;

    if (status === 401) {
      const msg = Array.isArray(data?.message)
        ? data.message.join('; ')
        : data?.message || i18n.t('auth.unauthorized');

      if (!skipErrorMessage) message.error(msg);

      const isHomePage = window.location.hash === '#/' || window.location.hash === '';
      if (!isHomePage && !skipErrorMessage) {
        useAuthStore.getState().clearAuth();
        window.location.hash = '#/';
      }
      return Promise.reject(error);
    }

    const msg = Array.isArray(data?.message)
      ? data.message.join('; ')
      : data?.message || i18n.t('auth.requestFailed');

    if (!skipErrorMessage) message.error(msg);
    return Promise.reject(error);
  },
);

export default request;
