import { create } from 'zustand';
import type { JwtPayload } from '@/types/auth';
import { Role } from '@/types/enums';

interface AuthState {
  user: JwtPayload | null;
  initialized: boolean;
  setUser: (user: JwtPayload | null) => void;
  setInitialized: (initialized: boolean) => void;
  clearAuth: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  initialized: false,

  setUser: (user: JwtPayload | null) => {
    set({ user, initialized: true });
  },

  setInitialized: (initialized: boolean) => {
    set({ initialized });
  },

  clearAuth: () => {
    set({ user: null, initialized: true });
  },

  hasRole: (...roles: Role[]) => {
    const { user } = get();
    if (!user) return false;
    return roles.includes(user.role as Role);
  },
}));
