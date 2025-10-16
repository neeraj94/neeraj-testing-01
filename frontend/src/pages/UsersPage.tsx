import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/http';
import type { Pagination, Permission, Role, User, UserSummaryMetrics } from '../types/models';
import type { Cart } from '../types/cart';
import { useToast } from '../components/ToastProvider';
import { useConfirm } from '../components/ConfirmDialogProvider';
import SortableColumnHeader from '../components/SortableColumnHeader';
import ExportMenu from '../components/ExportMenu';
import { exportDataset, type ExportFormat } from '../utils/exporters';
import { extractErrorMessage } from '../utils/errors';
import { buildPermissionGroups, CAPABILITY_COLUMNS, type PermissionGroup } from '../utils/permissionGroups';
import { useAppSelector } from '../app/hooks';
import type { PermissionKey } from '../types/auth';
import { hasAnyPermission } from '../utils/permissions';
import PageHeader from '../components/PageHeader';
import PageSection from '../components/PageSection';
import PaginationControls from '../components/PaginationControls';
import { formatCurrency } from '../utils/currency';

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;
const CUSTOMER_ROLE_KEY = 'CUSTOMER';

const SLOT_LABELS = CAPABILITY_COLUMNS.reduce<Record<string, string>>((map, column) => {
  map[column.slot] = column.label;
  return map;
}, {});

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
    <path d="M15.414 2.586a2 2 0 0 0-2.828 0L3 12.172V17h4.828l9.586-9.586a2 2 0 0 0 0-2.828l-2-2Zm-2.121 1.415 2 2L13 8.293l-2-2 2.293-2.292ZM5 13.414 11.293 7.12l1.586 1.586L6.586 15H5v-1.586Z" />
  </svg>
);

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    className="h-4 w-4"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 11v6" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 7V4h6v3m2 0v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7h12Z"
    />
  </svg>
);

type PanelMode = 'empty' | 'create' | 'detail';
type DetailTab = 'profile' | 'access' | 'cart';
type UserSortField = 'name' | 'email' | 'status' | 'audience' | 'groups';

type UserFormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  active: boolean;
  phoneNumber: string;
  whatsappNumber: string;
  facebookUrl: string;
  linkedinUrl: string;
  skypeId: string;
  emailSignature: string;
  roleIds: number[];
  directPermissions: string[];
  revokedPermissions: string[];
};

const emptyForm: UserFormState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  active: true,
  phoneNumber: '',
  whatsappNumber: '',
  facebookUrl: '',
  linkedinUrl: '',
  skypeId: '',
  emailSignature: '',
  roleIds: [],
  directPermissions: [],
  revokedPermissions: []
};

const normalizePermissionKey = (value: string) => value.toUpperCase();

const compareText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

const isCustomerAccount = (user: User) =>
  user.roles.some((role) => role.toUpperCase() === CUSTOMER_ROLE_KEY);

const UsersPage = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const confirm = useConfirm();
  const { permissions: grantedPermissions, user: currentUser, roles: currentRoles } = useAppSelector((state) => state.auth);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'internal' | 'customer'>('all');
  const [panelMode, setPanelMode] = useState<PanelMode>('empty');
  const [activeTab, setActiveTab] = useState<DetailTab>('profile');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusUpdateId, setStatusUpdateId] = useState<number | null>(null);
  const [sort, setSort] = useState<{ field: UserSortField; direction: 'asc' | 'desc' }>({ field: 'name', direction: 'asc' });
  const [isExporting, setIsExporting] = useState(false);

  const openUserDetail = useCallback(
    (userId: number) => {
      setSelectedUserId(userId);
      setPanelMode('detail');
      setActiveTab('profile');
    },
    [setActiveTab, setPanelMode, setSelectedUserId]
  );
  const currentUserId = currentUser?.id ?? null;
  const isSuperAdmin = useMemo(
    () => (currentRoles ?? []).some((role) => role.toUpperCase() === 'SUPER_ADMIN'),
    [currentRoles]
  );

  const canCreateUser = useMemo(
    () => hasAnyPermission(grantedPermissions as PermissionKey[], ['USER_CREATE']),
    [grantedPermissions]
  );
  const canManageUsers = useMemo(
    () => hasAnyPermission(grantedPermissions as PermissionKey[], ['USER_UPDATE']),
    [grantedPermissions]
  );
  const canDeleteUsers = useMemo(
    () => hasAnyPermission(grantedPermissions as PermissionKey[], ['USER_DELETE']),
    [grantedPermissions]
  );
  const canExportUsers = useMemo(
    () => hasAnyPermission(grantedPermissions as PermissionKey[], ['USERS_EXPORT']),
    [grantedPermissions]
  );

  useEffect(() => {
    setPage(0);
  }, [pageSize, statusFilter, audienceFilter, sort.field, sort.direction]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchTerm(searchDraft.trim());
      setPage(0);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    if (panelMode === 'create') {
      setForm(emptyForm);
      setFormError(null);
      setActiveTab('profile');
      setSelectedUserId(null);
    }
  }, [panelMode]);

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles', 'options'],
    queryFn: async () => {
      const { data } = await api.get<Pagination<Role>>('/roles', { params: { size: 200 } });
      return data.content;
    }
  });

  const { data: permissionsCatalog = [] } = useQuery<Permission[]>({
    queryKey: ['permissions', 'catalogue'],
    queryFn: async () => {
      const { data } = await api.get<Pagination<Permission>>('/permissions', { params: { size: 500 } });
      return data.content;
    }
  });

  const permissionGroups = useMemo<PermissionGroup[]>(
    () => buildPermissionGroups(permissionsCatalog),
    [permissionsCatalog]
  );

  const permissionLookup = useMemo(() => {
    const map = new Map<string, Permission>();
    permissionsCatalog.forEach((permission) => map.set(permission.key.toUpperCase(), permission));
    return map;
  }, [permissionsCatalog]);

  const roleIdByKey = useMemo(() => {
    const map = new Map<string, number>();
    roles.forEach((role) => map.set(role.key.toUpperCase(), role.id));
    return map;
  }, [roles]);

  const summaryQuery = useQuery<UserSummaryMetrics>({
    queryKey: ['users', 'summary'],
    queryFn: async () => {
      const { data } = await api.get<UserSummaryMetrics>('/users/summary');
      return data;
    }
  });

  const usersQuery = useQuery<Pagination<User>>({
    queryKey: ['users', 'list', { page, pageSize, searchTerm, sortField: sort.field, sortDirection: sort.direction }],
    queryFn: async () => {
      const serverSortable: UserSortField[] = ['name', 'email', 'status'];
      const serverSortField = serverSortable.includes(sort.field) ? sort.field : 'name';
      const params: Record<string, unknown> = {
        page,
        size: pageSize,
        sort: serverSortField,
        direction: serverSortField === sort.field ? sort.direction : 'asc'
      };
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      const { data } = await api.get<Pagination<User>>('/users', { params });
      return data;
    },
    placeholderData: (previousData) => previousData
  });

  const selectedUserQuery = useQuery<User>({
    queryKey: ['users', 'detail', selectedUserId],
    queryFn: async () => {
      const { data } = await api.get<User>(`/users/${selectedUserId}`);
      return data;
    },
    enabled: panelMode === 'detail' && selectedUserId !== null
  });

  const detailUser = selectedUserQuery.data;

  useEffect(() => {
    if (panelMode === 'detail' && selectedUserQuery.data) {
      const detail = selectedUserQuery.data;
      const assignedRoleIds = detail.roles
        .map((roleKey) => roleIdByKey.get(roleKey.toUpperCase()))
        .filter((value): value is number => typeof value === 'number');
      const roleDerivedPermissions = new Set<string>();
      roles.forEach((role) => {
        if (assignedRoleIds.includes(role.id)) {
          role.permissions?.forEach((permission) => {
            roleDerivedPermissions.add(normalizePermissionKey(permission));
          });
        }
      });
      const sanitizedDirect = (detail.directPermissions ?? [])
        .map(normalizePermissionKey)
        .filter((permissionKey) => !roleDerivedPermissions.has(permissionKey));
      const sanitizedRevoked = (detail.revokedPermissions ?? [])
        .map(normalizePermissionKey)
        .filter((permissionKey) => roleDerivedPermissions.has(permissionKey));
      setForm({
        firstName: detail.firstName ?? '',
        lastName: detail.lastName ?? '',
        email: detail.email,
        password: '',
        active: detail.active,
        phoneNumber: detail.phoneNumber ?? '',
        whatsappNumber: detail.whatsappNumber ?? '',
        facebookUrl: detail.facebookUrl ?? '',
        linkedinUrl: detail.linkedinUrl ?? '',
        skypeId: detail.skypeId ?? '',
        emailSignature: detail.emailSignature ?? '',
        roleIds: assignedRoleIds,
        directPermissions: sanitizedDirect,
        revokedPermissions: sanitizedRevoked
      });
      setFormError(null);
      setActiveTab('profile');
    }
  }, [panelMode, selectedUserQuery.data, roleIdByKey, roles]);

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
    queryClient.invalidateQueries({ queryKey: ['users', 'summary'] });
  };

  const createUser = useMutation({
    mutationFn: async () => {
      const trimmedPassword = form.password.trim();
      if (trimmedPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long.');
      }
      const { data } = await api.post<User>('/users', {
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        password: trimmedPassword,
        active: form.active,
        phoneNumber: form.phoneNumber.trim() || undefined,
        whatsappNumber: form.whatsappNumber.trim() || undefined,
        facebookUrl: form.facebookUrl.trim() || undefined,
        linkedinUrl: form.linkedinUrl.trim() || undefined,
        skypeId: form.skypeId.trim() || undefined,
        emailSignature: form.emailSignature.trim() || undefined,
        roleIds: form.roleIds,
        permissionKeys: form.directPermissions,
        revokedPermissionKeys: form.revokedPermissions
      });
      return data;
    },
    onSuccess: (data) => {
      notify({ type: 'success', message: 'User created successfully.' });
      invalidateUsers();
      setSelectedUserId(data.id);
      setPanelMode('detail');
      setActiveTab('profile');
      setForm({
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        email: data.email,
        password: '',
        active: data.active,
        phoneNumber: data.phoneNumber ?? '',
        whatsappNumber: data.whatsappNumber ?? '',
        facebookUrl: data.facebookUrl ?? '',
        linkedinUrl: data.linkedinUrl ?? '',
        skypeId: data.skypeId ?? '',
        emailSignature: data.emailSignature ?? '',
        roleIds: data.roles
          .map((roleKey) => roleIdByKey.get(roleKey.toUpperCase()))
          .filter((value): value is number => typeof value === 'number'),
        directPermissions: (data.directPermissions ?? []).map(normalizePermissionKey),
        revokedPermissions: (data.revokedPermissions ?? []).map(normalizePermissionKey)
      });
      queryClient.invalidateQueries({ queryKey: ['users', 'detail', data.id] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : extractErrorMessage(error, 'Unable to create user.');
      setFormError(message);
      notify({ type: 'error', message });
    }
  });

  const cartQuery = useQuery<Cart>({
    queryKey: ['users', selectedUserId, 'cart'],
    queryFn: async () => {
      const { data } = await api.get<Cart>(`/users/${selectedUserId}/cart`);
      return data;
    },
    enabled: panelMode === 'detail' && activeTab === 'cart' && selectedUserId != null
  });

  const updateUser = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) {
        return null;
      }
      const trimmedPassword = form.password.trim();
      if (trimmedPassword && trimmedPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long.');
      }
      const { data } = await api.put<User>(`/users/${selectedUserId}`, {
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        active: form.active,
        phoneNumber: form.phoneNumber.trim() || undefined,
        whatsappNumber: form.whatsappNumber.trim() || undefined,
        facebookUrl: form.facebookUrl.trim() || undefined,
        linkedinUrl: form.linkedinUrl.trim() || undefined,
        skypeId: form.skypeId.trim() || undefined,
        emailSignature: form.emailSignature.trim() || undefined,
        password: trimmedPassword || undefined,
        roleIds: form.roleIds,
        permissionKeys: form.directPermissions,
        revokedPermissionKeys: form.revokedPermissions
      });
      return data;
    },
    onSuccess: (data) => {
      if (!data) {
        return;
      }
      notify({ type: 'success', message: 'User updated successfully.' });
      invalidateUsers();
      setFormError(null);
      setForm({
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        email: data.email,
        password: '',
        active: data.active,
        phoneNumber: data.phoneNumber ?? '',
        whatsappNumber: data.whatsappNumber ?? '',
        facebookUrl: data.facebookUrl ?? '',
        linkedinUrl: data.linkedinUrl ?? '',
        skypeId: data.skypeId ?? '',
        emailSignature: data.emailSignature ?? '',
        roleIds: data.roles
          .map((roleKey) => roleIdByKey.get(roleKey.toUpperCase()))
          .filter((value): value is number => typeof value === 'number'),
        directPermissions: (data.directPermissions ?? []).map(normalizePermissionKey),
        revokedPermissions: (data.revokedPermissions ?? []).map(normalizePermissionKey)
      });
      if (selectedUserId) {
        queryClient.invalidateQueries({ queryKey: ['users', 'detail', selectedUserId] });
      }
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : extractErrorMessage(error, 'Unable to update user.');
      setFormError(message);
      notify({ type: 'error', message });
    }
  });

  const updatePermissions = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) {
        return null;
      }
      if (form.roleIds.length === 0) {
        throw new Error('Assign at least one role before saving access.');
      }
      await api.post<User>(`/users/${selectedUserId}/roles`, {
        roleIds: form.roleIds
      });
      const { data } = await api.put<User>(`/users/${selectedUserId}/permissions`, {
        grantedPermissionKeys: form.directPermissions,
        revokedPermissionKeys: form.revokedPermissions
      });
      return data;
    },
    onSuccess: (data) => {
      if (!data) {
        return;
      }
      notify({ type: 'success', message: 'Permissions updated successfully.' });
      invalidateUsers();
      setFormError(null);
      setForm({
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        email: data.email,
        password: '',
        active: data.active,
        phoneNumber: data.phoneNumber ?? '',
        whatsappNumber: data.whatsappNumber ?? '',
        facebookUrl: data.facebookUrl ?? '',
        linkedinUrl: data.linkedinUrl ?? '',
        skypeId: data.skypeId ?? '',
        emailSignature: data.emailSignature ?? '',
        roleIds: data.roles
          .map((roleKey) => roleIdByKey.get(roleKey.toUpperCase()))
          .filter((value): value is number => typeof value === 'number'),
        directPermissions: (data.directPermissions ?? []).map(normalizePermissionKey),
        revokedPermissions: (data.revokedPermissions ?? []).map(normalizePermissionKey)
      });
      if (selectedUserId) {
        queryClient.invalidateQueries({ queryKey: ['users', 'detail', selectedUserId] });
      }
    },
    onError: (error) => {
      const message = extractErrorMessage(error, 'Unable to update permissions.');
      setFormError(message);
      notify({ type: 'error', message });
    }
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: number) => {
      await api.delete(`/users/${userId}`);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'User removed.' });
      invalidateUsers();
      setPanelMode('empty');
      setSelectedUserId(null);
      setForm(emptyForm);
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to delete user.') });
    }
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ userId, nextActive }: { userId: number; nextActive: boolean }) => {
      setStatusUpdateId(userId);
      const { data } = await api.patch<User>(`/users/${userId}/status`, { active: nextActive });
      return data;
    },
    onSuccess: (data) => {
      notify({
        type: 'success',
        message: data.active ? 'User activated.' : 'User deactivated.'
      });
      invalidateUsers();
      if (panelMode === 'detail' && selectedUserId === data.id) {
        setForm((prev) => ({ ...prev, active: data.active }));
        queryClient.invalidateQueries({ queryKey: ['users', 'detail', data.id] });
      }
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to update status.') });
    },
    onSettled: () => {
      setStatusUpdateId(null);
    }
  });

  const verifyUser = useMutation({
    mutationFn: async (userId: number) => {
      const { data } = await api.post<User>(`/users/${userId}/verify`);
      return data;
    },
    onSuccess: (data) => {
      notify({ type: 'success', message: 'Verification status updated.' });
      queryClient.setQueryData<User>(['users', 'detail', data.id], (existing) =>
        existing ? { ...existing, ...data } : data
      );
      queryClient.setQueriesData<Pagination<User>>({ queryKey: ['users', 'list'] }, (existing) => {
        if (!existing) {
          return existing;
        }
        return {
          ...existing,
          content: existing.content.map((entry) => (entry.id === data.id ? { ...entry, ...data } : entry))
        };
      });
      invalidateUsers();
      queryClient.invalidateQueries({ queryKey: ['users', 'detail', data.id] });
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to verify user.') });
    }
  });

  const unlockUser = useMutation({
    mutationFn: async (userId: number) => {
      const { data } = await api.post<User>(`/users/${userId}/unlock`);
      return data;
    },
    onSuccess: (data) => {
      notify({ type: 'success', message: 'User account unlocked.' });
      queryClient.setQueryData<User>(['users', 'detail', data.id], (existing) =>
        existing ? { ...existing, ...data } : data
      );
      queryClient.setQueriesData<Pagination<User>>({ queryKey: ['users', 'list'] }, (existing) => {
        if (!existing) {
          return existing;
        }
        return {
          ...existing,
          content: existing.content.map((entry) => (entry.id === data.id ? { ...entry, ...data } : entry))
        };
      });
      invalidateUsers();
      queryClient.invalidateQueries({ queryKey: ['users', 'detail', data.id] });
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to unlock user account.') });
    }
  });

  const handleFieldChange = <K extends keyof UserFormState>(key: K, value: UserFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleRoleSelection = (roleId: number) => {
    setForm((prev) => {
      const exists = prev.roleIds.includes(roleId);
      const nextRoleIds = exists ? prev.roleIds.filter((id) => id !== roleId) : [...prev.roleIds, roleId];
      const normalizedRolePermissions = new Set<string>();
      roles.forEach((role) => {
        if (nextRoleIds.includes(role.id)) {
          role.permissions?.forEach((permission) => {
            normalizedRolePermissions.add(normalizePermissionKey(permission));
          });
        }
      });
      const filteredDirect = prev.directPermissions
        .map(normalizePermissionKey)
        .filter((permissionKey) => !normalizedRolePermissions.has(permissionKey));
      const filteredRevoked = prev.revokedPermissions
        .map(normalizePermissionKey)
        .filter((permissionKey) => normalizedRolePermissions.has(permissionKey));
      return {
        ...prev,
        roleIds: nextRoleIds,
        directPermissions: Array.from(new Set(filteredDirect)),
        revokedPermissions: Array.from(new Set(filteredRevoked))
      };
    });
  };

  const toggleDirectPermission = (permissionKey: string, checked: boolean) => {
    const normalized = normalizePermissionKey(permissionKey);
    setForm((prev) => {
      const next = new Set(prev.directPermissions.map(normalizePermissionKey));
      const nextRevoked = new Set(prev.revokedPermissions.map(normalizePermissionKey));
      if (rolePermissionSet.has(normalized)) {
        return prev;
      }
      if (checked) {
        next.add(normalized);
        if (/_VIEW_GLOBAL$/i.test(normalized)) {
          next.delete(normalized.replace(/_GLOBAL$/i, '_OWN'));
        }
        nextRevoked.delete(normalized);
      } else {
        next.delete(normalized);
      }
      return { ...prev, directPermissions: Array.from(next), revokedPermissions: Array.from(nextRevoked) };
    });
  };

  const toggleRevokedPermission = (permissionKey: string, checked: boolean) => {
    const normalized = normalizePermissionKey(permissionKey);
    setForm((prev) => {
      const nextRevoked = new Set(prev.revokedPermissions.map(normalizePermissionKey));
      const nextDirect = new Set(prev.directPermissions.map(normalizePermissionKey));
      if (checked) {
        nextDirect.delete(normalized);
        nextRevoked.add(normalized);
      } else {
        nextRevoked.delete(normalized);
      }
      return {
        ...prev,
        revokedPermissions: Array.from(nextRevoked),
        directPermissions: Array.from(nextDirect)
      };
    });
  };

  const clearPanel = () => {
    setPanelMode('empty');
    setSelectedUserId(null);
    setForm(emptyForm);
    setFormError(null);
    setActiveTab('profile');
  };

  const handleSortChange = (field: UserSortField) => {
    setSort((prev) => {
      if (prev.field === field) {
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { field, direction: 'asc' };
    });
  };

  const applyFilters = (list: User[]) =>
    list.filter((user) => {
      if (statusFilter === 'active' && !user.active) {
        return false;
      }
      if (statusFilter === 'inactive' && user.active) {
        return false;
      }
      if (audienceFilter === 'customer' && !isCustomerAccount(user)) {
        return false;
      }
      if (audienceFilter === 'internal' && isCustomerAccount(user)) {
        return false;
      }
      return true;
    });

  const sortUsersList = (list: User[]) => {
    const copy = [...list];
    const directionFactor = sort.direction === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      switch (sort.field) {
        case 'email': {
          const comparison = compareText(a.email, b.email);
          return comparison !== 0 ? comparison * directionFactor : compareText(a.fullName, b.fullName) * directionFactor;
        }
        case 'status': {
          if (a.active === b.active) {
            return compareText(a.fullName, b.fullName) * directionFactor;
          }
          return ((a.active ? 1 : 0) - (b.active ? 1 : 0)) * directionFactor;
        }
        case 'audience': {
          const aAudience = isCustomerAccount(a) ? 1 : 0;
          const bAudience = isCustomerAccount(b) ? 1 : 0;
          if (aAudience === bAudience) {
            return compareText(a.fullName, b.fullName) * directionFactor;
          }
          return (aAudience - bAudience) * directionFactor;
        }
        case 'groups': {
          const difference = (a.roles?.length ?? 0) - (b.roles?.length ?? 0);
          if (difference === 0) {
            return compareText(a.fullName, b.fullName) * directionFactor;
          }
          return difference * directionFactor;
        }
        case 'name':
        default:
          return compareText(a.fullName, b.fullName) * directionFactor;
      }
    });
    return copy;
  };

  const users: User[] = usersQuery.data?.content ?? [];
  const filteredUsers = useMemo(() => applyFilters(users), [users, statusFilter, audienceFilter]);
  const sortedUsers = useMemo(() => sortUsersList(filteredUsers), [filteredUsers, sort]);

  const fetchAllUsers = async (): Promise<User[]> => {
    const serverSortable: UserSortField[] = ['name', 'email', 'status'];
    const serverSortField = serverSortable.includes(sort.field) ? sort.field : 'name';
    const direction = serverSortField === sort.field ? sort.direction : 'asc';
    const size = 250;
    const baseParams: Record<string, unknown> = {
      size,
      sort: serverSortField,
      direction
    };
    if (searchTerm.trim()) {
      baseParams.search = searchTerm.trim();
    }

    const aggregated: User[] = [];
    let pageIndex = 0;
    let totalPagesCount = 1;

    do {
      const params = { ...baseParams, page: pageIndex };
      const { data } = await api.get<Pagination<User>>('/users', { params });
      aggregated.push(...(data.content ?? []));
      totalPagesCount = data.totalPages ?? 1;
      pageIndex += 1;
      if (pageIndex >= totalPagesCount) {
        break;
      }
    } while (pageIndex < totalPagesCount && pageIndex < 50);

    return aggregated;
  };

  const handleExportUsers = async (format: ExportFormat) => {
    if (!canExportUsers || isExporting) {
      return;
    }
    setIsExporting(true);
    try {
      const allUsers = await fetchAllUsers();
      const filtered = applyFilters(allUsers);
      const sorted = sortUsersList(filtered);
      if (!sorted.length) {
        notify({ type: 'error', message: 'There are no users to export for the current filters.' });
        return;
      }
      const columns = [
        { key: 'name', header: 'Name' },
        { key: 'email', header: 'Email' },
        { key: 'status', header: 'Status' },
        { key: 'groups', header: 'Groups' },
        { key: 'audience', header: 'Audience' }
      ];
      const rows = sorted.map((user) => ({
        name: user.fullName,
        email: user.email,
        status: user.active ? 'Active' : 'Inactive',
        groups: user.roles.length ? user.roles.join(', ') : '—',
        audience: isCustomerAccount(user) ? 'Customer' : 'Internal'
      }));
      exportDataset({
        format,
        columns,
        rows,
        fileName: 'users-and-customers',
        title: 'Users & customers'
      });
    } catch (error) {
      notify({ type: 'error', message: 'Unable to export users. Please try again.' });
    } finally {
      setIsExporting(false);
    }
  };

  const metrics = summaryQuery.data;
  const directPermissionSet = useMemo(() => {
    const next = new Set(form.directPermissions.map(normalizePermissionKey));
    return next;
  }, [form.directPermissions]);

  const revokedPermissionSet = useMemo(() => {
    const next = new Set(form.revokedPermissions.map(normalizePermissionKey));
    return next;
  }, [form.revokedPermissions]);

  const rolePermissionSet = useMemo(() => {
    const assignedRoles = new Set(form.roleIds);
    const collected = new Set<string>();
    roles.forEach((role) => {
      if (assignedRoles.has(role.id)) {
        role.permissions?.forEach((permission) => {
          collected.add(normalizePermissionKey(permission));
        });
      }
    });
    return collected;
  }, [form.roleIds, roles]);

  const effectivePermissionKeys = useMemo(() => {
    const combined = new Set<string>();
    rolePermissionSet.forEach((key) => {
      if (!revokedPermissionSet.has(key)) {
        combined.add(key);
      }
    });
    directPermissionSet.forEach((key) => {
      if (!revokedPermissionSet.has(key)) {
        combined.add(key);
      }
    });
    return Array.from(combined).sort();
  }, [rolePermissionSet, directPermissionSet, revokedPermissionSet]);

  const revokedPermissionKeys = useMemo(() => {
    return Array.from(revokedPermissionSet).sort();
  }, [revokedPermissionSet]);

  const renderSummaryCards = () => (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total users</p>
        <p className="mt-2 text-3xl font-semibold text-slate-800">{metrics?.totalUsers ?? 0}</p>
        <p className="mt-1 text-xs text-slate-500">Across internal teams and customer accounts.</p>
      </div>
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Active</p>
        <p className="mt-2 text-3xl font-semibold text-emerald-700">{metrics?.activeUsers ?? 0}</p>
        <p className="mt-1 text-xs text-emerald-600">Users currently able to sign in.</p>
      </div>
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Internal team</p>
        <p className="mt-2 text-3xl font-semibold text-indigo-700">{metrics?.internalUsers ?? 0}</p>
        <p className="mt-1 text-xs text-indigo-600">Members without the customer role.</p>
      </div>
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Customer accounts</p>
        <p className="mt-2 text-3xl font-semibold text-blue-700">{metrics?.customerUsers ?? 0}</p>
        <p className="mt-1 text-xs text-blue-600">Users holding the customer role.</p>
      </div>
    </div>
  );

  const renderFilters = () => (
    <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 lg:flex-row lg:items-end">
      <div className="flex-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
        <input
          type="search"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search by name or email"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      <div className="grid w-full gap-4 sm:grid-cols-2 lg:w-auto lg:flex lg:items-end lg:gap-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Audience</label>
          <select
            value={audienceFilter}
            onChange={(event) => setAudienceFilter(event.target.value as typeof audienceFilter)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="all">All users</option>
            <option value="internal">Internal</option>
            <option value="customer">Customers</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderTable = () => {
    const totalElements = usersQuery.data?.totalElements ?? 0;
    return (
      <PageSection padded={false} bodyClassName="flex flex-col">
        {renderFilters()}
        <div className="flex-1 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
              <SortableColumnHeader
                label="Name"
                field="name"
                currentField={sort.field}
                direction={sort.direction}
                onSort={handleSortChange}
              />
              <SortableColumnHeader
                label="Email"
                field="email"
                currentField={sort.field}
                direction={sort.direction}
                onSort={handleSortChange}
              />
              <SortableColumnHeader
                label="Status"
                field="status"
                currentField={sort.field}
                direction={sort.direction}
                onSort={handleSortChange}
              />
              <SortableColumnHeader
                label="Groups"
                field="groups"
                currentField={sort.field}
                direction={sort.direction}
                onSort={handleSortChange}
              />
              <SortableColumnHeader
                label="Audience"
                field="audience"
                currentField={sort.field}
                direction={sort.direction}
                onSort={handleSortChange}
              />
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {usersQuery.isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  Loading users…
                </td>
              </tr>
            ) : sortedUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  No users match the current filters.
                </td>
              </tr>
            ) : (
              sortedUsers.map((user) => {
                const isSelected = panelMode === 'detail' && selectedUserId === user.id;
                const isSelfSuperAdmin = isSuperAdmin && currentUserId === user.id;
                const disableStatusToggle =
                  isSelfSuperAdmin || (toggleStatus.isPending && statusUpdateId === user.id);
                return (
                  <tr
                    key={user.id}
                    onClick={() => openUserDetail(user.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openUserDetail(user.id);
                      }
                    }}
                    tabIndex={0}
                    aria-selected={isSelected}
                    className={`cursor-pointer transition hover:bg-blue-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 ${
                      isSelected ? 'bg-blue-50/60' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">
                      <div>{user.fullName}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-2 py-1 uppercase tracking-wide ${
                            user.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {user.active ? 'Active' : 'Inactive'}
                        </span>
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-2 py-1 uppercase tracking-wide ${
                            user.emailVerifiedAt ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          {user.emailVerifiedAt ? 'Verified' : 'Unverified'}
                        </span>
                        {user.lockedAt && (
                          <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-2 py-1 uppercase tracking-wide text-rose-600">
                            Locked
                          </span>
                        )}
                        {!user.lockedAt && user.loginAttempts > 0 && (
                          <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-2 py-1 uppercase tracking-wide text-amber-600">
                            {user.loginAttempts} failed
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (isSelfSuperAdmin) {
                              return;
                            }
                            toggleStatus.mutate({ userId: user.id, nextActive: !user.active });
                          }}
                          disabled={disableStatusToggle}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 ${
                            user.active ? 'border-emerald-200 bg-emerald-500/90' : 'border-slate-300 bg-slate-200'
                          }`}
                          aria-label={user.active ? `Deactivate ${user.fullName}` : `Activate ${user.fullName}`}
                          title={
                            isSelfSuperAdmin
                              ? 'Super Admins cannot change their own status.'
                              : user.active
                              ? `Deactivate ${user.fullName}`
                              : `Activate ${user.fullName}`
                          }
                        >
                          <span
                            className={`absolute left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                              user.active ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                        {user.roles.map((role) => (
                          <span key={role} className="rounded-full bg-slate-100 px-2 py-1 font-semibold uppercase tracking-wide">
                            {role}
                          </span>
                        ))}
                        {user.roles.length === 0 && <span className="text-slate-400">No roles</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {isCustomerAccount(user) ? 'Customer' : 'Internal'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (isSelfSuperAdmin) {
                              return;
                            }
                            openUserDetail(user.id);
                          }}
                          className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Edit ${user.fullName}`}
                          disabled={isSelfSuperAdmin}
                          title={isSelfSuperAdmin ? 'Super Admins cannot edit their own record from this list.' : `Edit ${user.fullName}`}
                        >
                          <PencilIcon />
                        </button>
                        {canDeleteUsers && (
                          <button
                            type="button"
                            onClick={async (event) => {
                              event.stopPropagation();
                              if (isSelfSuperAdmin) {
                                return;
                              }
                              const confirmed = await confirm({
                                title: 'Delete user?',
                                description: `Delete ${user.fullName}?`,
                                confirmLabel: 'Delete',
                                tone: 'danger'
                              });
                              if (!confirmed) {
                                return;
                              }
                              await deleteUser.mutateAsync(user.id);
                            }}
                            className="rounded-full border border-rose-200 p-2 text-rose-500 transition hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Delete ${user.fullName}`}
                            disabled={deleteUser.isPending || isSelfSuperAdmin}
                            title={
                              isSelfSuperAdmin
                                ? 'Super Admins cannot delete their own account from this list.'
                                : `Delete ${user.fullName}`
                            }
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
        <PaginationControls
          page={page}
          pageSize={pageSize}
          totalElements={totalElements}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(0);
          }}
          isLoading={usersQuery.isLoading}
        />
      </PageSection>
    );
  };

  const renderProfileTab = (isEditable: boolean, isCreate: boolean) => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-600">First name</label>
          <input
            type="text"
            value={form.firstName}
            onChange={(event) => handleFieldChange('firstName', event.target.value)}
            required
            disabled={!isEditable}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600">Last name</label>
          <input
            type="text"
            value={form.lastName}
            onChange={(event) => handleFieldChange('lastName', event.target.value)}
            required
            disabled={!isEditable}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(event) => handleFieldChange('email', event.target.value)}
            required
            disabled={!isEditable}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600">Status</label>
          <select
            value={form.active ? 'true' : 'false'}
            onChange={(event) => handleFieldChange('active', event.target.value === 'true')}
            disabled={!isEditable}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600">Phone number</label>
          <input
            type="tel"
            value={form.phoneNumber}
            onChange={(event) => handleFieldChange('phoneNumber', event.target.value)}
            placeholder="Optional"
            disabled={!isEditable}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600">WhatsApp number</label>
          <input
            type="tel"
            value={form.whatsappNumber}
            onChange={(event) => handleFieldChange('whatsappNumber', event.target.value)}
            placeholder="Optional"
            disabled={!isEditable}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600">Skype</label>
          <input
            type="text"
            value={form.skypeId}
            onChange={(event) => handleFieldChange('skypeId', event.target.value)}
            placeholder="Optional"
            disabled={!isEditable}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600">LinkedIn</label>
          <input
            type="url"
            value={form.linkedinUrl}
            onChange={(event) => handleFieldChange('linkedinUrl', event.target.value)}
            placeholder="https://linkedin.com/in/username"
            disabled={!isEditable}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600">Facebook</label>
          <input
            type="url"
            value={form.facebookUrl}
            onChange={(event) => handleFieldChange('facebookUrl', event.target.value)}
            placeholder="https://facebook.com/username"
            disabled={!isEditable}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-600">Email signature</label>
        <textarea
          value={form.emailSignature}
          onChange={(event) => handleFieldChange('emailSignature', event.target.value)}
          placeholder="Optional signature shown on outbound email"
          disabled={!isEditable}
          rows={4}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-600">Password</label>
        <input
          type="password"
          value={form.password}
          onChange={(event) => handleFieldChange('password', event.target.value)}
          required={isCreate}
          minLength={isCreate ? 8 : 0}
          placeholder={isCreate ? 'At least 8 characters' : 'Leave blank to keep the current password'}
          disabled={!isEditable}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
        />
        <p className="mt-1 text-xs text-slate-500">Passwords must contain at least 8 characters.</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Customer accounts are represented as users holding the <span className="font-semibold">CUSTOMER</span> role. Assign or
        revoke that role here to control access.
      </div>
      {!isCreate && detailUser && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Account security</h3>
          <p className="mt-1 text-xs text-slate-500">
            Track verification and lock status for this user. Accounts lock automatically after five failed sign-in attempts.
          </p>
          <dl className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-500">Verification status</dt>
              <dd
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  detailUser.emailVerifiedAt ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                }`}
              >
                {detailUser.emailVerifiedAt ? 'Verified' : 'Pending verification'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-500">Failed login attempts</dt>
              <dd className="font-semibold text-slate-700">{detailUser.loginAttempts}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-500">Account lock</dt>
              <dd className="font-semibold text-slate-700">
                {detailUser.lockedAt
                  ? new Date(detailUser.lockedAt).toLocaleString()
                  : 'Not locked'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-500">Verified on</dt>
              <dd className="font-semibold text-slate-700">
                {detailUser.emailVerifiedAt
                  ? new Date(detailUser.emailVerifiedAt).toLocaleString()
                  : 'Awaiting verification'}
              </dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  );

  const renderAccessTab = (isEditable: boolean) => (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">Roles</h3>
        <p className="mt-1 text-xs text-slate-500">
          Roles supply the baseline permissions for each user. Grant the customer role to expose customer-only experiences.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {roles.map((role) => {
            const checked = form.roleIds.includes(role.id);
            return (
              <label
                key={role.id}
                className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                  checked ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-600'
                } ${isEditable ? 'hover:border-primary/60' : 'opacity-70'}`}
              >
                <span>
                  <span className="font-semibold text-slate-800">{role.name}</span>
                  <span className="ml-2 text-[11px] uppercase tracking-wider text-slate-400">{role.key}</span>
                </span>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={checked}
                  onChange={() => toggleRoleSelection(role.id)}
                  disabled={!isEditable}
                />
              </label>
            );
          })}
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">Direct permission overrides</h3>
        <p className="mt-1 text-xs text-slate-500">
          Apply additional permissions to this user without altering the underlying role. Selecting “View (Global)” will
          automatically disable “View (Own)” for the same feature.
        </p>
        <div className="mt-4 space-y-4">
          {permissionGroups.map((group) => {
            const slotEntries = Object.entries(group.slots);
            const extras = group.extras;
            return (
              <div key={group.feature} className="rounded-lg border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h4 className="text-sm font-semibold text-slate-800">{group.feature}</h4>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  {slotEntries.map(([slot, option]) => {
                    if (!option) {
                      return null;
                    }
                    const normalized = normalizePermissionKey(option.key);
                    const checked = directPermissionSet.has(normalized);
                    const disableOwn = /_VIEW_OWN$/i.test(normalized) &&
                      directPermissionSet.has(normalized.replace(/_OWN$/i, '_GLOBAL'));
                    const inherited = rolePermissionSet.has(normalized);
                    const isRevoked = revokedPermissionSet.has(normalized);
                    const isDisabled = !isEditable || disableOwn || inherited;
                    const borderClasses = isRevoked
                      ? 'border-rose-300 bg-rose-50 text-rose-600'
                      : checked
                      ? 'border-primary bg-primary/5 text-primary'
                      : inherited
                      ? 'border-slate-200 bg-slate-50 text-slate-500'
                      : 'border-slate-200 text-slate-600';
                    return (
                      <label
                        key={option.id}
                        className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm transition ${borderClasses} ${
                          isEditable && !inherited ? 'hover:border-primary/60' : 'opacity-80'
                        }`}
                        >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4"
                          checked={checked}
                          disabled={isDisabled}
                          onChange={(event) => toggleDirectPermission(option.key, event.target.checked)}
                          title={
                            inherited
                              ? 'Granted through assigned roles'
                              : disableOwn
                              ? 'View (Global) already selected for this feature.'
                              : undefined
                          }
                        />
                        <span>
                          <span className="block font-semibold text-slate-800">{SLOT_LABELS[slot] ?? option.label}</span>
                          <span className="text-xs uppercase tracking-wide text-slate-400">{option.key}</span>
                          {inherited && (
                            <span className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Inherited from role
                            </span>
                          )}
                          {isRevoked && (
                            <span className="mt-1 inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600">
                              Revoked for this user
                            </span>
                          )}
                          {inherited && (
                            <label className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-rose-600">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5"
                                checked={isRevoked}
                                onChange={(event) => toggleRevokedPermission(option.key, event.target.checked)}
                                disabled={!isEditable}
                              />
                              Revoke for this user
                            </label>
                          )}
                        </span>
                      </label>
                    );
                  })}
                  {extras.map((option) => {
                    const normalized = normalizePermissionKey(option.key);
                    const checked = directPermissionSet.has(normalized);
                    const inherited = rolePermissionSet.has(normalized);
                    const isRevoked = revokedPermissionSet.has(normalized);
                    return (
                      <label
                        key={option.id}
                        className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                          isRevoked
                            ? 'border-rose-300 bg-rose-50 text-rose-600'
                            : checked
                            ? 'border-primary bg-primary/5 text-primary'
                            : inherited
                            ? 'border-slate-200 bg-slate-50 text-slate-500'
                            : 'border-slate-200 text-slate-600'
                        } ${isEditable && !inherited ? 'hover:border-primary/60' : 'opacity-80'}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4"
                          checked={checked}
                          disabled={!isEditable || inherited}
                          onChange={(event) => toggleDirectPermission(option.key, event.target.checked)}
                          title={inherited ? 'Granted through assigned roles' : undefined}
                        />
                        <span>
                          <span className="block font-semibold text-slate-800">{option.label}</span>
                          <span className="text-xs uppercase tracking-wide text-slate-400">{option.key}</span>
                          {inherited && (
                            <span className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Inherited from role
                            </span>
                          )}
                          {isRevoked && (
                            <span className="mt-1 inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600">
                              Revoked for this user
                            </span>
                          )}
                          {inherited && (
                            <label className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-rose-600">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5"
                                checked={isRevoked}
                                onChange={(event) => toggleRevokedPermission(option.key, event.target.checked)}
                                disabled={!isEditable}
                              />
                              Revoke for this user
                            </label>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h4 className="text-sm font-semibold text-slate-700">Effective permissions</h4>
        <p className="mt-1 text-xs text-slate-500">
          Includes role-derived permissions plus any direct overrides applied above.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {effectivePermissionKeys.length === 0 ? (
            <span className="text-xs text-slate-400">No permissions selected yet.</span>
          ) : (
            effectivePermissionKeys.map((permissionKey) => {
              const permission = permissionLookup.get(permissionKey);
              const isDirect = directPermissionSet.has(permissionKey);
              const badgeClasses = isDirect
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-blue-100 text-blue-700';
              return (
                <span
                  key={permissionKey}
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeClasses}`}
                >
                  {permission?.name ?? permissionKey}
                </span>
              );
            })
          )}
        </div>
        {revokedPermissionKeys.length > 0 && (
          <div className="mt-4">
            <h5 className="text-xs font-semibold uppercase tracking-wide text-rose-500">Revoked for this user</h5>
            <div className="mt-2 flex flex-wrap gap-2">
              {revokedPermissionKeys.map((permissionKey) => {
                const permission = permissionLookup.get(permissionKey);
                return (
                  <span
                    key={`revoked-${permissionKey}`}
                    className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600"
                  >
                    {permission?.name ?? permissionKey}
                  </span>
                );
              })}
            </div>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-4 text-[11px] uppercase tracking-wide text-slate-400">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Role permissions
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Direct overrides
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Revoked overrides
          </span>
        </div>
      </section>
    </div>
  );

  const renderCartTab = () => {
    if (panelMode !== 'detail' || !selectedUserId) {
      return (
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Select a user from the list to review their cart activity.
        </section>
      );
    }

    if (cartQuery.isLoading || cartQuery.isFetching) {
      return (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Loading cart details…</p>
        </section>
      );
    }

    if (cartQuery.isError) {
      const errorMessage = extractErrorMessage(cartQuery.error, 'Unable to load cart details.');
      return (
        <section className="space-y-4 rounded-xl border border-rose-200 bg-rose-50/80 p-6 shadow-sm">
          <div className="text-sm font-semibold text-rose-700">{errorMessage}</div>
          <button
            type="button"
            onClick={() => cartQuery.refetch()}
            className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
          >
            Try again
          </button>
        </section>
      );
    }

    if (!cartQuery.data || cartQuery.data.items.length === 0) {
      return (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">No cart items</h3>
          <p className="mt-2 text-sm text-slate-500">
            This customer has not added any products to their cart yet. Items will appear here as soon as they engage with the storefront.
          </p>
        </section>
      );
    }

    const cart = cartQuery.data;
    const formatMoney = (value: number) => formatCurrency(value, undefined);

    return (
      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Cart snapshot</h3>
              <p className="mt-1 text-xs text-slate-500">
                Last updated {cart.updatedAt ? formatDateTime(cart.updatedAt) : 'recently'}
              </p>
            </div>
            <div className="grid gap-3 text-sm text-slate-700 sm:grid-flow-col sm:items-center sm:justify-end">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-center shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Items</div>
                <div className="text-lg font-semibold text-slate-800">{cart.totalQuantity}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-center shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Subtotal</div>
                <div className="text-lg font-semibold text-slate-800">{formatMoney(cart.subtotal)}</div>
              </div>
            </div>
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Product
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Quantity
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Unit price
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-sm">
                {cart.items.map((item) => {
                  const limitedAvailability =
                    typeof item.availableQuantity === 'number' && item.availableQuantity >= 0 &&
                    item.quantity > item.availableQuantity;
                  return (
                    <tr key={`${item.productId}-${item.variantId ?? 'base'}`} className="align-top">
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                            {item.thumbnailUrl ? (
                              <img
                                src={item.thumbnailUrl}
                                alt={item.productName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase text-slate-400">
                                {item.productName.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-800">{item.productName}</p>
                            {item.variantLabel && (
                              <p className="text-xs text-slate-500">Variant: {item.variantLabel}</p>
                            )}
                            {item.sku && (
                              <p className="text-xs uppercase tracking-wide text-slate-400">SKU: {item.sku}</p>
                            )}
                            {!item.inStock && (
                              <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-rose-600">
                                Out of stock
                              </span>
                            )}
                            {limitedAvailability && (
                              <span className="block text-xs font-medium text-amber-600">
                                Only {item.availableQuantity} available
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        <div className="font-semibold text-slate-800">{item.quantity}</div>
                        {typeof item.availableQuantity === 'number' && (
                          <div className="text-xs text-slate-400">In stock: {item.availableQuantity}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-700">
                        {formatMoney(item.unitPrice)}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                        {formatMoney(item.lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  };

  const renderPanel = () => {
    const isCreate = panelMode === 'create';
    const isEditable = isCreate ? canCreateUser : canManageUsers;
    const isSaving = isCreate
      ? createUser.isPending
      : activeTab === 'access'
      ? updatePermissions.isPending
      : updateUser.isPending;
    const isLoadingDetail = panelMode === 'detail' && selectedUserQuery.isLoading;
    const headerTitle = isCreate
      ? 'Create user or customer'
      : detailUser?.fullName ?? 'Loading user…';
    const headerSubtitle = isCreate
      ? 'Provision access for an internal teammate or customer contact.'
      : detailUser?.email ?? '';

    return (
      <form
        className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isEditable) {
            return;
          }
          setFormError(null);
          if (isCreate) {
            createUser.mutate();
          } else if (activeTab === 'access') {
            updatePermissions.mutate();
          } else if (activeTab === 'cart') {
            return;
          } else {
            updateUser.mutate();
          }
        }}
      >
        <header className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={clearPanel}
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-primary/40 hover:text-primary"
              aria-label="Back to user directory"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15 19-7-7 7-7" />
              </svg>
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{isCreate ? 'New profile' : `#${selectedUserId ?? ''} Profile`}</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">{headerTitle}</h2>
              {headerSubtitle && <p className="text-sm text-slate-500">{headerSubtitle}</p>}
            </div>
          </div>
          {!isCreate && detailUser && (
            <div className="flex flex-col items-end gap-3">
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 uppercase tracking-wide">
                  <span className={`h-2 w-2 rounded-full ${detailUser.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {detailUser.active ? 'Active' : 'Inactive'}
                </span>
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 uppercase tracking-wide ${
                    detailUser.emailVerifiedAt ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}
                >
                  {detailUser.emailVerifiedAt ? 'Verified' : 'Unverified'}
                </span>
                {detailUser.lockedAt && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 uppercase tracking-wide text-rose-600">
                    Locked
                  </span>
                )}
                {!detailUser.lockedAt && detailUser.loginAttempts > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 uppercase tracking-wide text-amber-600">
                    {detailUser.loginAttempts} failed
                  </span>
                )}
              </div>
              {(detailUser.roles?.length ?? 0) > 0 && (
                <div className="flex flex-wrap justify-end gap-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {detailUser.roles?.map((role) => (
                    <span key={role} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1">
                      {role}
                    </span>
                  ))}
                </div>
              )}
              {canManageUsers && (
                <div className="flex flex-wrap justify-end gap-2">
                  {!detailUser.emailVerifiedAt && (
                    <button
                      type="button"
                      onClick={() => verifyUser.mutate(detailUser.id)}
                      disabled={verifyUser.isPending}
                      className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {verifyUser.isPending ? 'Verifying…' : 'Mark as verified'}
                    </button>
                  )}
                  {detailUser.lockedAt && (
                    <button
                      type="button"
                      onClick={() => unlockUser.mutate(detailUser.id)}
                      disabled={unlockUser.isPending}
                      className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {unlockUser.isPending ? 'Unlocking…' : 'Unlock account'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </header>
        <div className="grid gap-0 border-b border-slate-200 lg:grid-cols-[240px,1fr]">
          <nav className="flex shrink-0 flex-row gap-2 border-b border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 lg:flex-col lg:border-b-0 lg:border-r">
            {(
              [
                { key: 'profile', label: 'Profile details' },
                { key: 'access', label: 'Roles & permissions' },
                { key: 'cart', label: 'Cart' }
              ] as Array<{ key: DetailTab; label: string }>
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-lg px-3 py-2 text-left transition ${
                  activeTab === tab.key
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="flex-1 px-6 py-6">
            {isLoadingDetail ? (
              <p className="text-sm text-slate-500">Loading user details…</p>
            ) : activeTab === 'profile' ? (
              renderProfileTab(isEditable, isCreate)
            ) : activeTab === 'access' ? (
              renderAccessTab(isEditable)
            ) : (
              renderCartTab()
            )}
          </div>
        </div>
        <footer className="flex flex-col gap-3 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          {formError ? (
            <p className="text-sm text-rose-600">{formError}</p>
          ) : (
            <span className="text-xs text-slate-500">
              Changes apply immediately after saving and will not modify the underlying role definitions.
            </span>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {panelMode === 'detail' && canDeleteUsers && selectedUserId && (
              <button
                type="button"
                onClick={() => deleteUser.mutate(selectedUserId)}
                disabled={deleteUser.isPending}
                className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteUser.isPending ? 'Removing…' : 'Remove user'}
              </button>
            )}
            {panelMode === 'detail' && selectedUserQuery.data && isEditable && (
              <button
                type="button"
                onClick={() => {
                  const detail = selectedUserQuery.data;
                  setForm({
                    firstName: detail.firstName ?? '',
                    lastName: detail.lastName ?? '',
                    email: detail.email,
                    password: '',
                    active: detail.active,
                    phoneNumber: detail.phoneNumber ?? '',
                    whatsappNumber: detail.whatsappNumber ?? '',
                    facebookUrl: detail.facebookUrl ?? '',
                    linkedinUrl: detail.linkedinUrl ?? '',
                    skypeId: detail.skypeId ?? '',
                    emailSignature: detail.emailSignature ?? '',
                    roleIds: detail.roles
                      .map((roleKey) => roleIdByKey.get(roleKey.toUpperCase()))
                      .filter((value): value is number => typeof value === 'number'),
                    directPermissions: (detail.directPermissions ?? []).map(normalizePermissionKey),
                    revokedPermissions: (detail.revokedPermissions ?? []).map(normalizePermissionKey)
                  });
                  setFormError(null);
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Reset changes
              </button>
            )}
            <button
              type="submit"
              disabled={!isEditable || isSaving}
              title={!isEditable ? 'You do not have permission to update this user.' : undefined}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreate ? (isSaving ? 'Creating…' : 'Create user') : isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </footer>
      </form>
    );
  };

  const isDirectoryView = panelMode === 'empty';

  return (
    <div className="space-y-6 px-6 py-6">
      <PageHeader
        title="Users & customers"
        description="Manage internal teammates and customer contacts from a single, permission-aware workspace."
        actions={
          isDirectoryView ? (
            <>
              {canExportUsers && (
                <ExportMenu onSelect={handleExportUsers} disabled={usersQuery.isLoading} isBusy={isExporting} />
              )}
              {canCreateUser && (
                <button
                  type="button"
                  onClick={() => setPanelMode('create')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    className="h-4 w-4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                  </svg>
                  New user
                </button>
              )}
            </>
          ) : undefined
        }
      />
      {isDirectoryView ? (
        <>
          {renderSummaryCards()}
          {renderTable()}
        </>
      ) : (
        renderPanel()
      )}
    </div>
  );
};

export default UsersPage;
