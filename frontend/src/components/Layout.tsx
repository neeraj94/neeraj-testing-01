import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logout } from '../features/auth/authSlice';
import { selectApplicationName } from '../features/settings/selectors';
import { TAB_RULES, hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';
import api from '../services/http';

type SidebarItem = {
  key: string;
  label: string;
  to?: string;
  icon?: string;
  children?: SidebarItem[];
};

const Layout = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, permissions, refreshToken } = useAppSelector((state) => state.auth);
  const applicationName = useAppSelector(selectApplicationName);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const brandName = applicationName?.trim() || 'RBAC Portal';
  const brandInitials = useMemo(() => {
    const words = brandName.split(/\s+/).filter(Boolean);
    if (!words.length) {
      return 'AP';
    }
    if (words.length === 1) {
      const sanitized = words[0].replace(/[^A-Za-z0-9]/g, '');
      if (sanitized.length >= 2) {
        return sanitized.slice(0, 2).toUpperCase();
      }
      if (sanitized.length === 1) {
        return (sanitized + sanitized).slice(0, 2).toUpperCase();
      }
      return 'AP';
    }
    return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
  }, [brandName]);

  const tabs = useMemo(() => {
    const keys = Object.keys(TAB_RULES);
    return keys.filter((tab) => hasAnyPermission(permissions as PermissionKey[], TAB_RULES[tab]));
  }, [permissions]);

  const navigation = useMemo<SidebarItem[]>(() => {
    const items: SidebarItem[] = [
      {
        key: 'dashboard',
        label: 'Dashboard',
        to: '/dashboard',
        icon: '🏠'
      }
    ];

    const salesChildren: SidebarItem[] = [];
    if (tabs.includes('Invoices')) {
      salesChildren.push({ key: 'invoices', label: 'Invoices', to: '/invoices' });
    }
    if (salesChildren.length) {
      items.push({
        key: 'sales',
        label: 'Sales',
        icon: '⚡',
        children: salesChildren
      });
    }

    const accessChildren: SidebarItem[] = [];
    if (tabs.includes('Users')) {
      accessChildren.push({ key: 'users', label: 'Users', to: '/users' });
    }
    if (tabs.includes('Roles')) {
      accessChildren.push({ key: 'roles', label: 'Roles', to: '/roles' });
    }
    if (tabs.includes('Permissions')) {
      accessChildren.push({ key: 'permissions', label: 'Permissions', to: '/permissions' });
    }
    if (accessChildren.length) {
      items.push({
        key: 'access',
        label: 'Access Control',
        icon: '🔐',
        children: accessChildren
      });
    }

    if (tabs.includes('Activity')) {
      items.push({
        key: 'activity',
        label: 'Activity',
        to: '/activity',
        icon: '📝'
      });
    }

    if (tabs.includes('Settings')) {
      items.push({
        key: 'settings',
        label: 'Settings',
        to: '/settings',
        icon: '⚙️'
      });
    }

    items.push({
      key: 'profile',
      label: 'Profile',
      to: '/profile',
      icon: '👤'
    });

    return items;
  }, [tabs]);

  useEffect(() => {
    setExpandedSections((prev) => {
      let changed = false;
      const next = { ...prev };
      navigation.forEach((item) => {
        if (!item.children) {
          return;
        }
        const hasActiveChild = item.children.some((child) => child.to && location.pathname.startsWith(child.to));
        if (hasActiveChild && !next[item.key]) {
          next[item.key] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [location.pathname, navigation]);

  useEffect(() => {
    const handleClickAway = (event: MouseEvent) => {
      if (!profileMenuRef.current) {
        return;
      }
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickAway);
    return () => document.removeEventListener('mousedown', handleClickAway);
  }, []);

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [location.pathname]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };

  const getInitials = () => {
    if (!user?.fullName) {
      return 'U';
    }
    const parts = user.fullName.trim().split(' ').filter(Boolean);
    if (!parts.length) {
      return 'U';
    }
    const initials = parts.map((part) => part.charAt(0).toUpperCase());
    return (initials[0] ?? 'U') + (initials[1] ?? '');
  };

  const handleLogout = async () => {
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch (error) {
        // ignore logout errors
      }
    }
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  const handleProfileNavigate = () => {
    setProfileMenuOpen(false);
    navigate('/profile');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside
        className={`border-r border-slate-200 bg-white transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-base font-semibold text-white">
              {brandInitials}
            </div>
            {!sidebarCollapsed && (
              <span className="text-lg font-semibold text-slate-800" title={brandName}>
                {brandName}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className={`h-5 w-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          </button>
        </div>
        <div className="px-3">
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className={`mt-6 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition-all ${
                sidebarCollapsed ? 'flex flex-col items-center gap-3 px-0 py-4' : 'flex items-center gap-3'
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {getInitials()}
              </div>
              {!sidebarCollapsed && user && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{user.fullName}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
              )}
              {!sidebarCollapsed && !user && (
                <p className="text-sm font-medium text-slate-600">Welcome</p>
              )}
            </button>
            {profileMenuOpen && !sidebarCollapsed && (
              <div className="absolute left-0 right-0 z-20 mt-2 rounded-xl border border-slate-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={handleProfileNavigate}
                  className="flex w-full items-center gap-3 rounded-t-xl px-4 py-3 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-base text-primary">👤</span>
                  <span>Edit profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-3 rounded-b-xl px-4 py-3 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-base text-rose-500">⏻</span>
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <nav className="mt-6 space-y-1 px-2">
          {navigation.map((item) => {
            if (item.children?.length) {
              const isExpanded = expandedSections[item.key] ?? true;
              const isActive = item.children.some((child) => child.to && location.pathname.startsWith(child.to));

              return (
                <div key={item.key}>
                  <button
                    type="button"
                    onClick={() => toggleSection(item.key)}
                    className={`flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      sidebarCollapsed ? 'justify-center px-0' : 'gap-3'
                    } ${
                      isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-base">
                      {item.icon ?? item.label.charAt(0)}
                    </span>
                    {!sidebarCollapsed && <span className="flex-1 text-left">{item.label}</span>}
                    {!sidebarCollapsed && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className={`h-4 w-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    )}
                  </button>
                  {isExpanded && !sidebarCollapsed && (
                    <div className="mt-1 space-y-1 pl-12">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.key}
                          to={child.to ?? '#'}
                          className={({ isActive }) =>
                            `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                              isActive
                                ? 'bg-primary/10 font-medium text-primary'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`
                          }
                        >
                          <span className="text-xs text-slate-400">•</span>
                          <span>{child.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.key}
                to={item.to ?? '#'}
                end={item.to === '/dashboard'}
                title={sidebarCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    sidebarCollapsed ? 'justify-center px-0' : 'gap-3'
                  } ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-base">
                  {item.icon ?? item.label.charAt(0)}
                </span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <h1 className="text-lg font-semibold text-slate-800" title={brandName}>
            {brandName}
          </h1>
          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden text-right text-sm text-slate-600 md:block">
                <p className="font-medium text-slate-800">{user.fullName}</p>
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
        </header>
        <main className="flex-1 px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
