import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import CustomerLoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import VerifyAccountPage from './pages/VerifyAccountPage';
import DashboardPage from './pages/admin/DashboardPage';
import UsersPage from './pages/admin/UsersPage';
import RolesPage from './pages/admin/RolesPage';
import PermissionsPage from './pages/admin/PermissionsPage';
import ProfilePage from './pages/admin/ProfilePage';
import ForbiddenPage from './pages/admin/ForbiddenPage';
import NotFoundPage from './pages/admin/NotFoundPage';
import BrandsPage from './pages/admin/BrandsPage';
import ProductsPage from './pages/admin/ProductsPage';
import ReviewsPage from './pages/admin/ReviewsPage';
import TaxRatesPage from './pages/admin/TaxRatesPage';
import AttributesPage from './pages/admin/AttributesPage';
import CategoriesPage from './pages/admin/CategoriesPage';
import CouponsPage from './pages/admin/CouponsPage';
import BadgesPage from './pages/admin/BadgesPage';
import BadgeCategoriesPage from './pages/admin/BadgeCategoriesPage';
import ShippingPage from './pages/admin/ShippingPage';
import EcommerceHomePage from './pages/EcommerceHomePage';
import ProtectedRoute from './routes/ProtectedRoute';
import PermissionRoute from './routes/PermissionRoute';
import { useAppDispatch, useAppSelector } from './app/hooks';
import {
  loadCurrentUser,
  logout as logoutAction,
  tokensRefreshed,
  type Portal
} from './features/auth/authSlice';
import { syncGuestCart } from './features/cart/cartSlice';
import { adminApi, api } from './services/http';
import SettingsPage from './pages/admin/SettingsPage';
import { fetchTheme } from './features/settings/settingsSlice';
import { selectApplicationName, selectPrimaryColor } from './features/settings/selectors';
import { applyPrimaryColor } from './utils/colors';
import ActivityPage from './pages/admin/ActivityPage';
import ActivityDetailPage from './pages/admin/ActivityDetailPage';
import SetupPage from './pages/admin/SetupPage';
import GalleryPage from './pages/admin/GalleryPage';
import BlogCategoriesPage from './pages/admin/BlogCategoriesPage';
import BlogPostsPage from './pages/admin/BlogPostsPage';
import PublicBlogListPage from './pages/PublicBlogListPage';
import PublicBlogPostPage from './pages/PublicBlogPostPage';
import UploadedFilesPage from './pages/admin/UploadedFilesPage';
import PublicCategoriesPage from './pages/PublicCategoriesPage';
import PublicProductPage from './pages/PublicProductPage';
import PublicBrandsPage from './pages/PublicBrandsPage';
import PublicCouponsPage from './pages/PublicCouponsPage';
import PublicProductsPage from './pages/PublicProductsPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import AdminPaymentPage from './pages/admin/AdminPaymentPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminCartsPage from './pages/admin/AdminCartsPage';

const App = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { accessToken, refreshToken, user, portal } = useAppSelector((state) => state.auth);
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
    if (user?.id && portal === 'client') {
      dispatch(syncGuestCart());
    }
  }, [user?.id, portal, dispatch]);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      if (!accessToken && refreshToken) {
        const resolvedPortal: Portal =
          portal === 'admin' || portal === 'client'
            ? portal
            : location.pathname.startsWith('/admin')
            ? 'admin'
            : 'client';
        setInitializing('checking');
        try {
          const client = resolvedPortal === 'client' ? api : adminApi;
          const { data } = await client.post('/auth/refresh', { refreshToken });
          if (!active) {
            return;
          }
          dispatch(tokensRefreshed({ auth: data, portal: resolvedPortal }));
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
  }, [accessToken, refreshToken, portal, location.pathname, dispatch]);

  const publicExact = [
    '/',
    '/admin/login',
    '/login',
    '/signup',
    '/verify-account',
    '/categories',
    '/brands',
    '/products',
    '/products/showcase',
    '/coupons'
  ];
  const publicPrefixes = ['/blog', '/product', '/products'];
  const isPublicRoute =
    publicExact.includes(location.pathname) ||
    publicPrefixes.some((prefix) =>
      location.pathname === prefix || location.pathname.startsWith(`${prefix}/`)
    );

  if (initializing === 'checking' && !isPublicRoute) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Preparing your workspace…
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<EcommerceHomePage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/login" element={<CustomerLoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/verify-account" element={<VerifyAccountPage />} />
      <Route path="/blog" element={<PublicBlogListPage />} />
      <Route path="/blog/:slug" element={<PublicBlogPostPage />} />
      <Route path="/categories" element={<PublicCategoriesPage />} />
      <Route path="/brands" element={<PublicBrandsPage />} />
      <Route path="/products" element={<PublicProductsPage />} />
      <Route path="/coupons" element={<PublicCouponsPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
      <Route path="/products/showcase" element={<Navigate to="/product/demo-product" replace />} />
      <Route path="/product/:slug" element={<PublicProductPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<Layout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route
            element={
              <PermissionRoute
                required={['USER_VIEW_GLOBAL', 'USER_VIEW', 'USER_VIEW_OWN']}
              />
            }
          >
            <Route
              path="staff"
              element={
                <UsersPage
                  lockedAudience="internal"
                  titleOverride="Staff members"
                  descriptionOverride="Audit and manage administrators, managers, and support staff across the platform."
                />
              }
            />
            <Route
              path="customers"
              element={
                <UsersPage
                  lockedAudience="customer"
                  titleOverride="Customers"
                  descriptionOverride="Review shopper accounts, carts, and orders to deliver tailored support."
                />
              }
            />
            <Route path="users" element={<Navigate to="/admin/staff" replace />} />
          </Route>
          <Route element={<PermissionRoute required={['ROLE_VIEW', 'ROLE_VIEW_GLOBAL', 'ROLE_VIEW_OWN']} />}>
            <Route path="roles" element={<RolesPage />} />
          </Route>
          <Route element={<PermissionRoute required={['PERMISSION_VIEW']} />}>
            <Route path="permissions" element={<PermissionsPage />} />
          </Route>
          <Route element={<PermissionRoute required={['BLOG_CATEGORY_VIEW']} />}>
            <Route path="blog/categories" element={<BlogCategoriesPage />} />
          </Route>
          <Route element={<PermissionRoute required={['BLOG_POST_VIEW']} />}>
            <Route path="blog/posts" element={<BlogPostsPage />} />
          </Route>
          <Route element={<PermissionRoute required={['ATTRIBUTE_VIEW']} />}>
            <Route path="attributes" element={<AttributesPage />} />
          </Route>
          <Route element={<PermissionRoute required={['CATEGORY_VIEW']} />}>
            <Route path="categories" element={<CategoriesPage />} />
          </Route>
          <Route element={<PermissionRoute required={['BADGE_CATEGORY_VIEW']} />}>
            <Route path="badge-categories" element={<BadgeCategoriesPage />} />
          </Route>
          <Route element={<PermissionRoute required={['BADGE_VIEW']} />}>
            <Route path="badges" element={<BadgesPage />} />
          </Route>
          <Route element={<PermissionRoute required={['UPLOADED_FILE_VIEW']} />}>
            <Route path="assets/uploaded-files" element={<UploadedFilesPage />} />
          </Route>
          <Route element={<PermissionRoute required={['TAX_RATE_VIEW']} />}>
            <Route path="finance/tax-rates" element={<TaxRatesPage />} />
          </Route>
          <Route element={<PermissionRoute required={['BRAND_VIEW']} />}>
            <Route path="brands" element={<BrandsPage />} />
          </Route>
          <Route
            element={
              <PermissionRoute required={['PRODUCT_VIEW', 'PRODUCT_CREATE', 'PRODUCT_UPDATE']} />
            }
          >
            <Route path="products" element={<ProductsPage />} />
          </Route>
          <Route element={<PermissionRoute required={['COUPON_VIEW_GLOBAL']} />}>
            <Route path="catalog/coupons" element={<CouponsPage />} />
          </Route>
          <Route element={<PermissionRoute required={['PAYMENT_VIEW']} />}>
            <Route path="payments" element={<AdminPaymentPage />} />
          </Route>
          <Route element={<PermissionRoute required={['USER_VIEW_GLOBAL']} />}>
            <Route path="orders" element={<AdminOrdersPage />} />
          </Route>
          <Route element={<PermissionRoute required={['USER_VIEW_GLOBAL']} />}>
            <Route path="carts" element={<AdminCartsPage />} />
          </Route>
          <Route
            element={
              <PermissionRoute
                required={[
                  'PRODUCT_REVIEW_VIEW',
                  'PRODUCT_REVIEW_CREATE',
                  'PRODUCT_REVIEW_UPDATE',
                  'PRODUCT_REVIEW_DELETE'
                ]}
              />
            }
          >
            <Route path="reviews" element={<ReviewsPage />} />
          </Route>
          <Route element={<PermissionRoute required={['SHIPPING_VIEW']} />}>
            <Route path="shipping" element={<ShippingPage />} />
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
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
};

export default App;
