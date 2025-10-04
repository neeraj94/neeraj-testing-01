import { useMemo } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logout } from '../features/auth/authSlice';
import { TAB_RULES, hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';
import api from '../services/http';

const Layout = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, permissions, refreshToken } = useAppSelector((state) => state.auth);

  const tabs = useMemo(() => {
    const keys = Object.keys(TAB_RULES);
    return keys.filter((tab) => hasAnyPermission(permissions as PermissionKey[], TAB_RULES[tab]));
  }, [permissions]);

  const handleLogout = async () => {
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch (error) {
        // ignore logout errors
      }
    }
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-semibold text-slate-800">RBAC Dashboard</h1>
          <div className="flex items-center gap-4">
            {user && (
              <div className="text-sm text-slate-600">
                <p className="font-medium">{user.fullName}</p>
                <p className="text-xs">{user.email}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
            >
              Logout
            </button>
          </div>
        </div>
        <nav className="bg-slate-100">
          <div className="mx-auto flex max-w-7xl gap-6 px-6 py-2 text-sm font-medium text-slate-600">
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'text-primary' : '')} end>
              Overview
            </NavLink>
            {tabs.includes('Users') && (
              <NavLink to="/users" className={({ isActive }) => (isActive ? 'text-primary' : '')}>
                Users
              </NavLink>
            )}
            {tabs.includes('Roles') && (
              <NavLink to="/roles" className={({ isActive }) => (isActive ? 'text-primary' : '')}>
                Roles & Permissions
              </NavLink>
            )}
            {tabs.includes('Permissions') && (
              <NavLink to="/permissions" className={({ isActive }) => (isActive ? 'text-primary' : '')}>
                Permissions
              </NavLink>
            )}
            {tabs.includes('Customers') && (
              <NavLink to="/customers" className={({ isActive }) => (isActive ? 'text-primary' : '')}>
                Customers
              </NavLink>
            )}
            {tabs.includes('Invoices') && (
              <NavLink to="/invoices" className={({ isActive }) => (isActive ? 'text-primary' : '')}>
                Invoices
              </NavLink>
            )}
            <NavLink to="/profile" className={({ isActive }) => (isActive ? 'text-primary' : '')}>
              Profile
            </NavLink>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
