import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/http';
import type { Pagination, Role, User, Permission } from '../types/models';
import { useToast } from '../components/ToastProvider';
import { extractErrorMessage } from '../utils/errors';

const PAGE_SIZE = 10;

type PanelMode = 'list' | 'create' | 'detail';

type UserFormState = {
  fullName: string;
  email: string;
  password: string;
  active: boolean;
  roleIds: number[];
  directPermissions: string[];
};

const emptyForm: UserFormState = {
  fullName: '',
  email: '',
  password: '',
  active: true,
  roleIds: [],
  directPermissions: []
};

const UsersPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const [page, setPage] = useState(0);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [mode, setMode] = useState<PanelMode>('list');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

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

  const roleByKey = useMemo(() => {
    const map = new Map<string, Role>();
    roles.forEach((role) => map.set(role.key, role));
    return map;
  }, [roles]);

  const usersQuery = useQuery<Pagination<User>>({
    queryKey: ['users', 'list', { page, searchTerm }],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size: PAGE_SIZE };
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      const { data } = await api.get<Pagination<User>>('/users', { params });
      return data;
    },
    keepPreviousData: true
  });

  const selectedUserQuery = useQuery<User>({
    queryKey: ['users', 'detail', selectedUserId],
    queryFn: async () => {
      const { data } = await api.get<User>(`/users/${selectedUserId}`);
      return data;
    },
    enabled: mode === 'detail' && selectedUserId !== null
  });

  useEffect(() => {
    if (mode === 'detail' && selectedUserQuery.data) {
      const detail = selectedUserQuery.data;
      setForm({
        fullName: detail.fullName,
        email: detail.email,
        password: '',
        active: detail.active,
        roleIds: detail.roles
          .map((roleKey) => roleByKey.get(roleKey)?.id)
          .filter((value): value is number => typeof value === 'number'),
        directPermissions: detail.directPermissions ?? []
      });
      setFormError(null);
    }
  }, [mode, selectedUserQuery.data, roleByKey]);

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSearchTerm(searchDraft);
    setPage(0);
  };

  const resetToList = () => {
    setMode('list');
    setSelectedUserId(null);
    setForm(emptyForm);
    setFormError(null);
  };

  const closeModal = () => {
    resetToList();
    navigate('/dashboard');
  };

  const beginCreate = () => {
    setForm(emptyForm);
    setFormError(null);
    setMode('create');
  };

  const beginDetail = (id: number) => {
    setSelectedUserId(id);
    setMode('detail');
  };

  const createUser = useMutation({
    mutationFn: async () => {
      if (form.password.length < 8) {
        throw new Error('Password must be at least 8 characters long.');
      }
      await api.post('/users', {
        email: form.email,
        fullName: form.fullName,
        password: form.password,
        active: form.active,
        roleIds: form.roleIds,
        permissionKeys: form.directPermissions
      });
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'User created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
      resetToList();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : extractErrorMessage(error, 'Unable to create user.');
      setFormError(message);
      notify({ type: 'error', message });
    }
  });

  const updateUser = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) return;
      if (form.password && form.password.length < 8) {
        throw new Error('Password must be at least 8 characters long.');
      }
      await api.put(`/users/${selectedUserId}`, {
        email: form.email,
        fullName: form.fullName,
        active: form.active,
        password: form.password || undefined,
        roleIds: form.roleIds,
        permissionKeys: form.directPermissions
      });
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'User updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
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

  const deleteUser = useMutation({
    mutationFn: async (userId: number) => {
      await api.delete(`/users/${userId}`);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'User removed.' });
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
      if (mode === 'detail') {
        resetToList();
      }
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to delete user.') });
    }
  });

  const users = usersQuery.data?.content ?? [];
  const totalPages = usersQuery.data?.totalPages ?? 0;

  const permissionOptions = useMemo(
    () =>
      permissionsCatalog
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((permission) => ({ key: permission.key, label: permission.name })),
    [permissionsCatalog]
  );

  const handleFormChange = <K extends keyof UserFormState>(key: K, value: UserFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const renderListView = () => (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Team directory</h2>
          <p className="mt-1 text-sm text-slate-500">Search and pick a teammate to manage their access.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={beginCreate}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
          >
            Create user
          </button>
          <button
            type="button"
            onClick={closeModal}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close user management"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </header>
      <form onSubmit={handleSearchSubmit} className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Search users</label>
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Name or email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="mt-6 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Apply
          </button>
        </div>
      </form>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {usersQuery.isLoading ? (
          <p className="text-sm text-slate-500">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-slate-500">No users found for this search.</p>
        ) : (
          <ul className="space-y-3">
            {users.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => beginDetail(user.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-primary/60 hover:shadow-md"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{user.fullName}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <span key={role} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase text-slate-600">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        user.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5 text-slate-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <footer className="flex items-center justify-between border-t border-slate-200 px-6 py-3 text-sm text-slate-500">
        <span>
          Page {page + 1} of {Math.max(totalPages, 1)}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
            disabled={page === 0}
            className="rounded-lg border border-slate-200 px-3 py-1.5 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(prev + 1, Math.max(totalPages - 1, 0)))}
            disabled={page >= totalPages - 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </footer>
    </div>
  );

  const renderFormFields = (isCreate: boolean) => (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-600">Full name</label>
          <input
            type="text"
            value={form.fullName}
            onChange={(event) => handleFormChange('fullName', event.target.value)}
            required
            minLength={2}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(event) => handleFormChange('email', event.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(event) => handleFormChange('password', event.target.value)}
            placeholder={isCreate ? 'Minimum 8 characters' : 'Leave blank to keep current password'}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            required={isCreate}
            minLength={isCreate ? 8 : 0}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600">Status</label>
          <select
            value={form.active ? 'true' : 'false'}
            onChange={(event) => handleFormChange('active', event.target.value === 'true')}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-600">Roles</label>
        <p className="mt-1 text-xs text-slate-500">Select one or more roles to inherit baseline permissions.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {roles.map((role) => {
            const checked = form.roleIds.includes(role.id);
            return (
              <label
                key={role.id}
                className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                  checked ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600'
                }`}
              >
                <span>
                  <span className="font-medium">{role.name}</span>
                  <span className="ml-2 text-[11px] uppercase tracking-wider text-slate-400">{role.key}</span>
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    handleFormChange(
                      'roleIds',
                      checked
                        ? form.roleIds.filter((id) => id !== role.id)
                        : [...form.roleIds, role.id]
                    );
                  }}
                  className="h-4 w-4"
                />
              </label>
            );
          })}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-600">Additional permissions</label>
        <p className="mt-1 text-xs text-slate-500">Assign extra capabilities that apply only to this user.</p>
        <div className="mt-3 max-h-60 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
          {permissionOptions.map((permission) => {
            const checked = form.directPermissions.includes(permission.key);
            return (
              <label key={permission.key} className="flex items-center justify-between text-sm text-slate-600">
                <div>
                  <span className="font-medium text-slate-700">{permission.label}</span>
                  <span className="ml-2 text-xs uppercase tracking-widest text-slate-400">{permission.key}</span>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={checked}
                  onChange={() => {
                    handleFormChange(
                      'directPermissions',
                      checked
                        ? form.directPermissions.filter((key) => key !== permission.key)
                        : [...form.directPermissions, permission.key]
                    );
                  }}
                />
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderCreateView = () => (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Create user</h2>
          <p className="mt-1 text-sm text-slate-500">Provision a new teammate, roles, and optional direct permissions.</p>
        </div>
        <button
          type="button"
          onClick={resetToList}
          className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
          aria-label="Back to user list"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <form
          className="mx-auto max-w-3xl space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            setFormError(null);
            createUser.mutate();
          }}
        >
          {renderFormFields(true)}
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={resetToList}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
              disabled={createUser.isPending}
            >
              {createUser.isPending ? 'Saving…' : 'Save user'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderDetailView = () => {
    const user = selectedUserQuery.data;
    return (
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Manage access</h2>
            <p className="mt-1 text-sm text-slate-500">Update profile info, roles, and direct permissions for this teammate.</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedUserId && (
              <button
                type="button"
                onClick={() => deleteUser.mutate(selectedUserId)}
                className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
              >
                Remove user
              </button>
            )}
            <button
              type="button"
              onClick={resetToList}
              className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
              aria-label="Back to user list"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {selectedUserQuery.isLoading || !user ? (
            <p className="text-sm text-slate-500">Loading user details…</p>
          ) : (
            <form
              className="mx-auto max-w-3xl space-y-6"
              onSubmit={(event) => {
                event.preventDefault();
                setFormError(null);
                updateUser.mutate();
              }}
            >
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">{user.fullName}</h3>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      form.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {form.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {renderFormFields(false)}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-semibold text-slate-700">Effective permissions</h4>
                <p className="mt-1 text-xs text-slate-500">
                  Includes permissions inherited from roles and any additional overrides applied directly to this user.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[...new Set([...(user.permissions ?? []), ...form.directPermissions])].map((permission) => (
                    <span key={permission} className="rounded-full bg-white px-2 py-1 text-xs font-medium uppercase text-slate-600">
                      {permission}
                    </span>
                  ))}
                </div>
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => selectedUserQuery.data && setForm({
                    fullName: selectedUserQuery.data.fullName,
                    email: selectedUserQuery.data.email,
                    password: '',
                    active: selectedUserQuery.data.active,
                    roleIds: selectedUserQuery.data.roles
                      .map((roleKey) => roleByKey.get(roleKey)?.id)
                      .filter((value): value is number => typeof value === 'number'),
                    directPermissions: selectedUserQuery.data.directPermissions ?? []
                  })}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  Reset changes
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
                  disabled={updateUser.isPending}
                >
                  {updateUser.isPending ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-stretch justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {mode === 'list' && renderListView()}
        {mode === 'create' && renderCreateView()}
        {mode === 'detail' && renderDetailView()}
      </div>
    </div>
  );
};

export default UsersPage;
