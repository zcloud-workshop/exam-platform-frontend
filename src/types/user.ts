import type { Role } from './enums';

export interface CreateUserRequest {
  username: string;
  password: string;
  role?: Role;
}

export interface UpdateUserRequest {
  username?: string;
  password?: string;
  role?: Role;
}

export interface UserResponse {
  id: string;
  username: string;
  role: Role;
  createdAt: string;
}

export interface RegistrationInviteResponse {
  id: string;
  code: string;
  role: Role;
  createdAt: string;
  usedAt: string | null;
}
