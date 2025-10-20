import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';

const ProtectedRoute = () => {
  const { accessToken, refreshToken } = useAppSelector((state) => state.auth);
  if (accessToken) {
    return <Outlet />;
  }
  if (refreshToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Restoring your session…
      </div>
    );
  }
  return <Navigate to="/admin/login" replace />;
};

export default ProtectedRoute;
