import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import RolesPage from './pages/RolesPage';
import PermissionsPage from './pages/PermissionsPage';
import InvoicesPage from './pages/InvoicesPage';
import ProfilePage from './pages/ProfilePage';
import ForbiddenPage from './pages/ForbiddenPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './routes/ProtectedRoute';
import PermissionRoute from './routes/PermissionRoute';
import { useAppDispatch, useAppSelector } from './app/hooks';
import { loadCurrentUser, logout as logoutAction, tokensRefreshed } from './features/auth/authSlice';
import api from './services/http';
import SettingsPage from './pages/SettingsPage';
import { fetchTheme } from './features/settings/settingsSlice';
import { selectApplicationName, selectPrimaryColor } from './features/settings/selectors';
import { applyPrimaryColor } from './utils/colors';
import ActivityPage from './pages/ActivityPage';
import ActivityDetailPage from './pages/ActivityDetailPage';
import SetupPage from './pages/SetupPage';
import GalleryPage from './pages/GalleryPage';
import BlogCategoriesPage from './pages/BlogCategoriesPage';
import BlogPostsPage from './pages/BlogPostsPage';
import PublicBlogListPage from './pages/PublicBlogListPage';
import PublicBlogPostPage from './pages/PublicBlogPostPage';

const App = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { accessToken, refreshToken } = useAppSelector((state) => state.auth);
  const primaryColor = useAppSelector(selectPrimaryColor);
  const applicationName = useAppSelector(selectApplicationName);
  const [initializing, setInitializing] = useState<'idle' | 'checking'>(() =>
    refreshToken ? 'checking' : 'idle'
  );

  useEffect(() => {
    dispatch(fetchTheme());
  }, [dispatch]);

  useEffect(() => {
    applyPrimaryColor(primaryColor);
  }, [primaryColor]);

  useEffect(() => {
    document.title = applicationName || 'RBAC Portal';
  }, [applicationName]);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      if (!accessToken && refreshToken) {
        setInitializing('checking');
        try {
          const { data } = await api.post('/auth/refresh', { refreshToken });
          if (!active) {
            return;
          }
          dispatch(tokensRefreshed(data));
        } catch (error) {
          if (!active) {
            return;
          }
          dispatch(logoutAction());
          setInitializing('idle');
        }
        return;
      }

      if (accessToken) {
        setInitializing('checking');
        try {
          await dispatch(loadCurrentUser()).unwrap();
        } catch (error) {
          if (!active) {
            return;
          }
          dispatch(logoutAction());
        } finally {
          if (active) {
            setInitializing('idle');
          }
        }
        return;
      }

      if (active) {
        setInitializing('idle');
      }
    };

    restoreSession();

    return () => {
      active = false;
    };
  }, [accessToken, refreshToken, dispatch]);

  const isPublicRoute = location.pathname.startsWith('/login') || location.pathname.startsWith('/signup');

  if (initializing === 'checking' && !isPublicRoute) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Preparing your workspace…
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/blog" element={<PublicBlogListPage />} />
      <Route path="/blog/:slug" element={<PublicBlogPostPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<Layout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route
            element={
              <PermissionRoute
                required={[
                  'USER_VIEW',
                  'USER_VIEW_GLOBAL',
                  'USER_VIEW_OWN',
                  'USER_CREATE',
                  'USER_UPDATE',
                  'USER_DELETE'
                ]}
              />
            }
          >
            <Route path="users" element={<UsersPage />} />
          </Route>
          <Route element={<PermissionRoute required={['ROLE_VIEW', 'ROLE_VIEW_GLOBAL', 'ROLE_VIEW_OWN']} />}>
            <Route path="roles" element={<RolesPage />} />
          </Route>
          <Route element={<PermissionRoute required={['PERMISSION_VIEW']} />}>
            <Route path="permissions" element={<PermissionsPage />} />
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
            <Route path="invoices" element={<InvoicesPage />} />
          </Route>
          <Route element={<PermissionRoute required={['BLOG_CATEGORY_VIEW']} />}>
            <Route path="blog/categories" element={<BlogCategoriesPage />} />
          </Route>
          <Route element={<PermissionRoute required={['BLOG_POST_VIEW']} />}>
            <Route path="blog/posts" element={<BlogPostsPage />} />
          </Route>
          <Route element={<PermissionRoute required={['ACTIVITY_VIEW']} />}>
            <Route path="activity" element={<ActivityPage />} />
            <Route path="activity/:id" element={<ActivityDetailPage />} />
          </Route>
          <Route element={<PermissionRoute required={['SETTINGS_VIEW']} />}>
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route
            element={
              <PermissionRoute required={['GALLERY_VIEW_ALL', 'GALLERY_VIEW_OWN', 'GALLERY_CREATE']} />
            }
          >
            <Route path="gallery" element={<GalleryPage />} />
          </Route>
          <Route element={<PermissionRoute required={['SETUP_MANAGE']} />}>
            <Route path="setup" element={<SetupPage />} />
          </Route>
          <Route path="profile" element={<ProfilePage />} />
          <Route path="403" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
