import request from './request';
import type { ApiResponse } from '@/types/api';
import type { CreateUserRequest, UpdateUserRequest, UserResponse, RegistrationInviteResponse } from '@/types/user';
import type { Role } from '@/types/enums';

export function createRegistrationInvite(role: Role) {
  return request.post<any, ApiResponse<RegistrationInviteResponse>>('/users/registration-invites', { role });
}

export function getRegistrationInvites() {
  return request.get<any, ApiResponse<RegistrationInviteResponse[]>>('/users/registration-invites');
}

export function createUser(data: CreateUserRequest) {
  return request.post<any, ApiResponse<UserResponse>>('/users', data);
}

export function getUsers() {
  return request.get<any, ApiResponse<UserResponse[]>>('/users');
}

export function updateUser(id: string, data: UpdateUserRequest) {
  return request.patch<any, ApiResponse<UserResponse>>(`/users/${id}`, data);
}

export function deleteUser(id: string) {
  return request.delete<any, ApiResponse<void>>(`/users/${id}`);
}
