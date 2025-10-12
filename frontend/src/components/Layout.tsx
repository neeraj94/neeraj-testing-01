import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logout } from '../features/auth/authSlice';
import { selectApplicationName } from '../features/settings/selectors';
import { hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';
import api from '../services/http';
import { DEFAULT_NAVIGATION_MENU } from '../constants/navigation';
import type { NavigationNode, NavigationResponse } from '../types/navigation';

type SidebarItem = {
  key: string;
  label: string;
  to?: string;
  icon?: string;
  children?: SidebarItem[];
};

const mergeMenuNodes = (
  stored: NavigationNode[] = [],
  defaults: NavigationNode[] = []
): NavigationNode[] => {
  if (!defaults.length) {
    return stored.map((node) => ({
      ...node,
      children: mergeMenuNodes(node.children ?? [], [])
    }));
  }

  const defaultMap = new Map(defaults.map((definition) => [definition.key, definition] as const));
  const usedKeys = new Set<string>();
  const result: NavigationNode[] = [];

  for (const node of stored ?? []) {
    const definition = defaultMap.get(node.key);
    if (definition) {
      const mergedChildren = mergeMenuNodes(node.children ?? [], definition.children ?? []);
      result.push({
        ...definition,
        ...node,
        children: mergedChildren
      });
      usedKeys.add(definition.key);
    } else {
      result.push({
        ...node,
        children: mergeMenuNodes(node.children ?? [], [])
      });
      usedKeys.add(node.key);
    }
  }

  for (const definition of defaults) {
    if (usedKeys.has(definition.key)) {
      continue;
    }
    result.push({
      ...definition,
      children: mergeMenuNodes([], definition.children ?? [])
    });
  }

  return result;
};

const Layout = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, permissions, refreshToken } = useAppSelector((state) => state.auth);
  const applicationName = useAppSelector(selectApplicationName);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  );
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [navItems, setNavItems] = useState<NavigationNode[]>(DEFAULT_NAVIGATION_MENU);

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

  useEffect(() => {
    let active = true;
    const loadNavigation = async () => {
      try {
        const { data } = await api.get<NavigationResponse>('/navigation/menu');
        if (!active) {
          return;
        }
        const merged = mergeMenuNodes(data?.menu ?? [], data?.defaults ?? DEFAULT_NAVIGATION_MENU);
        setNavItems(merged.length ? merged : DEFAULT_NAVIGATION_MENU);
      } catch (error) {
        if (!active) {
          return;
        }
        setNavItems(DEFAULT_NAVIGATION_MENU);
      }
    };

    loadNavigation();

    return () => {
      active = false;
    };
  }, []);

  const accessibleNavigation = useMemo<NavigationNode[]>(() => {
    const granted = (permissions as PermissionKey[]) ?? [];

    const filterNodes = (nodes: NavigationNode[]): NavigationNode[] =>
      nodes
        .map((node) => {
          const filteredChildren = node.children?.length ? filterNodes(node.children) : [];
          const nodeHasPermission =
            !node.permissions?.length || hasAnyPermission(granted, node.permissions);
          const hasChildren = filteredChildren.length > 0;

          if (node.group) {
            if (!nodeHasPermission) {
              return null;
            }

            if (!hasChildren) {
              return null;
            }

            return { ...node, children: filteredChildren };
          }

          if (!nodeHasPermission) {
            return null;
          }

          return { ...node, children: hasChildren ? filteredChildren : [] };
        })
        .filter((node): node is NavigationNode => node !== null);

    return filterNodes(navItems);
  }, [navItems, permissions]);

  const navigation = useMemo<SidebarItem[]>(() => {
    const buildSidebar = (nodes: NavigationNode[]): SidebarItem[] =>
      nodes.map((node) => ({
        key: node.key,
        label: node.label,
        to: node.path ?? undefined,
        icon: node.icon ?? undefined,
        children: node.children?.length ? buildSidebar(node.children) : undefined
      }));

    return buildSidebar(accessibleNavigation);
  }, [accessibleNavigation]);

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

    const handleResize = () => {
      const largeScreen = window.innerWidth >= 1024;
      setIsDesktop(largeScreen);
      if (!largeScreen) {
        setSidebarCollapsed(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickAway);
    window.addEventListener('resize', handleResize);
    document.addEventListener('keydown', handleKeyDown);

    handleResize();

    return () => {
      document.removeEventListener('mousedown', handleClickAway);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setProfileMenuOpen(false);
    setMobileSidebarOpen(false);
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
    navigate('/admin/profile');
  };

  const isSidebarCondensed = sidebarCollapsed && isDesktop;
  const desktopWidthClass = isSidebarCondensed ? 'lg:w-20' : 'lg:w-72';

  return (
    <div className="flex min-h-screen bg-slate-50">
      {mobileSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm transition lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] transform flex-col border-r border-slate-200 bg-white shadow-lg transition-transform duration-300 ease-in-out lg:static lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${desktopWidthClass}`}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-base font-semibold text-white">
              {brandInitials}
            </div>
            {!isSidebarCondensed && (
              <span className="text-lg font-semibold text-slate-800" title={brandName}>
                {brandName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 lg:hidden"
              aria-label="Close navigation"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-5 w-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6m0 12L6 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 lg:inline-flex"
              title={isSidebarCondensed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className={`h-5 w-5 transition-transform ${isSidebarCondensed ? 'rotate-180' : ''}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
              </svg>
            </button>
          </div>
        </div>
        <div className="px-3">
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className={`mt-6 flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition-all ${
                isSidebarCondensed ? 'lg:flex-col lg:items-center lg:gap-3 lg:px-0 lg:py-4' : ''
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {getInitials()}
              </div>
              {!isSidebarCondensed && user && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{user.fullName}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
              )}
              {!isSidebarCondensed && !user && (
                <p className="text-sm font-medium text-slate-600">Welcome</p>
              )}
            </button>
            {profileMenuOpen && !isSidebarCondensed && (
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
        <nav className="mt-6 space-y-1 px-2 pb-8">
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
                      isSidebarCondensed ? 'lg:justify-center lg:px-0' : 'gap-3'
                    } ${
                      isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title={isSidebarCondensed ? item.label : undefined}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-base">
                      {item.icon ?? item.label.charAt(0)}
                    </span>
                    {!isSidebarCondensed && <span className="flex-1 text-left">{item.label}</span>}
                    {!isSidebarCondensed && (
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
                  {isExpanded && !isSidebarCondensed && (
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
                end={item.to === '/admin/dashboard'}
                title={isSidebarCondensed ? item.label : undefined}
                className={({ isActive }) =>
                  `group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isSidebarCondensed ? 'lg:justify-center lg:px-0' : 'gap-3'
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
                {!isSidebarCondensed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col lg:pl-0">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-5 w-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-slate-800" title={brandName}>
              {brandName}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden text-right text-sm text-slate-600 md:block">
                <p className="font-medium text-slate-800">{user.fullName}</p>
                <p className="text-xs">{user.email}</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-600"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
