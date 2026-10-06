export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  inviteCode: string;
}

export interface LoginResponse {
  access_token: string;
  user: JwtPayload;
}

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}
