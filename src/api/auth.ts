import request from './request';
import type { LoginRequest, LoginResponse, JwtPayload, RegisterRequest } from '@/types/auth';
import type { UserResponse } from '@/types/user';
import type { ApiResponse } from '@/types/api';

export function login(data: LoginRequest) {
  return request.post<any, ApiResponse<LoginResponse>>('/auth/login', data);
}

export function register(data: RegisterRequest) {
  return request.post<any, ApiResponse<UserResponse>>('/auth/register', data);
}

export function getMe() {
  return request.get<any, ApiResponse<JwtPayload>>('/auth/me', {
    skipErrorMessage: true,
  } as any);
}

export function logout() {
  return request.post<any, ApiResponse<{ success: boolean }>>('/auth/logout');
}
