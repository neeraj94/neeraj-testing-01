import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import RolesPage from './pages/RolesPage';
import PermissionsPage from './pages/PermissionsPage';
import CustomersPage from './pages/CustomersPage';
import InvoicesPage from './pages/InvoicesPage';
import ProfilePage from './pages/ProfilePage';
import ForbiddenPage from './pages/ForbiddenPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './routes/ProtectedRoute';
import PermissionRoute from './routes/PermissionRoute';
import { useAppDispatch, useAppSelector } from './app/hooks';
import { loadCurrentUser, tokensRefreshed } from './features/auth/authSlice';
import api from './services/http';

const App = () => {
  const dispatch = useAppDispatch();
  const { accessToken, refreshToken } = useAppSelector((state) => state.auth);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      if (!accessToken && refreshToken) {
        try {
          const { data } = await api.post('/auth/refresh', { refreshToken });
          dispatch(tokensRefreshed(data));
        } catch (error) {
          // ignore - user must sign in again
        }
      }
      if (accessToken) {
        dispatch(loadCurrentUser());
      }
      setBootstrapped(true);
    };
    bootstrap();
  }, [accessToken, refreshToken, dispatch]);

  if (!bootstrapped && refreshToken) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route element={<PermissionRoute required={['USER_VIEW', 'USER_VIEW_GLOBAL', 'USER_VIEW_OWN']} />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
          <Route element={<PermissionRoute required={['ROLE_VIEW', 'ROLE_VIEW_GLOBAL', 'ROLE_VIEW_OWN']} />}>
            <Route path="/roles" element={<RolesPage />} />
          </Route>
          <Route element={<PermissionRoute required={['PERMISSION_VIEW']} />}>
            <Route path="/permissions" element={<PermissionsPage />} />
          </Route>
          <Route
            element={
              <PermissionRoute
                required={[
                  'CUSTOMER_VIEW',
                  'CUSTOMER_VIEW_GLOBAL',
                  'CUSTOMER_VIEW_OWN',
                  'CUSTOMER_CREATE',
                  'CUSTOMER_UPDATE',
                  'CUSTOMER_DELETE'
                ]}
              />
            }
          >
            <Route path="/customers" element={<CustomersPage />} />
          </Route>
          <Route
            element={
              <PermissionRoute
                required={[
                  'INVOICE_VIEW',
                  'INVOICE_VIEW_GLOBAL',
                  'INVOICE_VIEW_OWN',
                  'INVOICE_CREATE',
                  'INVOICE_UPDATE',
                  'INVOICE_DELETE'
                ]}
              />
            }
          >
            <Route path="/invoices" element={<InvoicesPage />} />
          </Route>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
