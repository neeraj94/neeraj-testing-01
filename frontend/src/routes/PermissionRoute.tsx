import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';
import type { PermissionKey } from '../types/auth';
import { hasAnyPermission } from '../utils/permissions';

interface PermissionRouteProps {
  required: PermissionKey[];
}

const PermissionRoute = ({ required }: PermissionRouteProps) => {
  const { permissions } = useAppSelector((state) => state.auth);
  const allowed = hasAnyPermission(permissions as PermissionKey[], required);
  if (!allowed) {
    return <Navigate to="/403" replace />;
  }
  return <Outlet />;
};

export default PermissionRoute;
