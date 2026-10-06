import { Navigate } from 'react-router';
import { useAuthStore } from '@/stores/authStore';
import { Role } from '@/types/enums';

export function RoleGuard({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user || !roles.includes(user.role as Role)) {
    return <Navigate to="/403" replace />;
  }
  return <>{children}</>;
}
