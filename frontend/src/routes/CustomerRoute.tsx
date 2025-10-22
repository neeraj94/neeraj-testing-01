import { Navigate, Outlet, createSearchParams, useLocation } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';

const CustomerRoute = () => {
  const location = useLocation();
  const { accessToken, refreshToken, portal } = useAppSelector((state) => state.auth);

  if (accessToken && portal === 'client') {
    return <Outlet />;
  }

  if (accessToken && portal === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (refreshToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Restoring your account…
      </div>
    );
  }

  const redirectTarget = `${location.pathname}${location.search}` || '/';
  const search = createSearchParams({ redirect: redirectTarget, fallback: '/' }).toString();

  return (
    <Navigate
      to={{ pathname: '/login', search }}
      state={{ from: redirectTarget, fallback: '/' }}
      replace
    />
  );
};

export default CustomerRoute;
