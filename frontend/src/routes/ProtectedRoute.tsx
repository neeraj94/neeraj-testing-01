import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';

const ProtectedRoute = () => {
  const { accessToken } = useAppSelector((state) => state.auth);
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
