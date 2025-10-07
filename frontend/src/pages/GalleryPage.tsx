import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/http';
import { useToast } from '../components/ToastProvider';
import { useAppSelector } from '../app/hooks';
import { hasAnyPermission } from '../utils/permissions';
import { formatFileSize } from '../utils/files';
import type { GalleryFile, GalleryFilePage, GalleryFolder } from '../types/gallery';
import type { PermissionKey } from '../types/auth';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first', sort: 'createdAt', direction: 'desc' },
  { value: 'oldest', label: 'Oldest first', sort: 'createdAt', direction: 'asc' },
  { value: 'smallest', label: 'Smallest file size', sort: 'size', direction: 'asc' },
  { value: 'largest', label: 'Largest file size', sort: 'size', direction: 'desc' },
  { value: 'type', label: 'File type', sort: 'extension', direction: 'asc' },
  { value: 'uploader', label: 'Uploader', sort: 'uploader', direction: 'asc' }
] as const;

type SortOptionValue = (typeof SORT_OPTIONS)[number]['value'];

type EditModalState = {
  file: GalleryFile;
  name: string;
  folderId: number | null;
};

type FolderModalState = {
  name: string;
  parentId: number | null;
};

type FolderTreeNode = {
  key: string;
  label: string;
  folderId: number | null;
  ownerId: number | null;
  depth: number;
  children: FolderTreeNode[];
  description?: string;
  isSynthetic: boolean;
};

const formatDateTime = (value: string) => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const resolveFileUrl = (id: number) => {
  const baseUrl = api.defaults.baseURL ?? '';
  return `${baseUrl.replace(/\/$/, '')}/gallery/files/${id}/content`;
};

const buildFolderTree = (
  folders: GalleryFolder[],
  currentUserId: number | null,
  canViewAll: boolean
): FolderTreeNode[] => {
  const concreteFolders = folders.filter((folder): folder is GalleryFolder & { id: number } => folder.id !== null);
  const grouped = new Map<number | null, (GalleryFolder & { id: number })[]>();

  concreteFolders.forEach((folder) => {
    const ownerId = folder.ownerId ?? null;
    const existing = grouped.get(ownerId);
    if (existing) {
      existing.push(folder);
    } else {
      grouped.set(ownerId, [folder]);
    }
  });

  if (!canViewAll && currentUserId !== null && !grouped.has(currentUserId)) {
    grouped.set(currentUserId, []);
  }

  const buildHierarchy = (
    items: (GalleryFolder & { id: number })[],
    parentId: number | null,
    depth: number
  ): FolderTreeNode[] => {
    const children = items.filter((item) => (item.parentId ?? null) === parentId);
    children.sort((a, b) => a.name.localeCompare(b.name));
    return children.map((child) => ({
      key: `folder-${child.id}`,
      label: child.name,
      folderId: child.id,
      ownerId: child.ownerId ?? null,
      depth,
      description: undefined,
      isSynthetic: false,
      children: buildHierarchy(items, child.id, depth + 1)
    }));
  };

  const nodes: FolderTreeNode[] = [];
  grouped.forEach((items, ownerId) => {
    const sample = items[0];
    const hasOwner = ownerId !== null;
    const ownerLabel = (() => {
      if (!hasOwner) {
        return canViewAll ? 'Unassigned' : 'My Library';
      }
      if (!canViewAll && currentUserId !== null && ownerId === currentUserId) {
        return 'My Library';
      }
      return sample?.ownerKey ?? sample?.ownerEmail ?? sample?.ownerName ?? `User ${ownerId}`;
    })();
    const ownerDescription = (() => {
      if (!sample) {
        return undefined;
      }
      if (!canViewAll && currentUserId !== null && ownerId === currentUserId) {
        return sample.ownerEmail ?? undefined;
      }
      return sample.ownerEmail ?? sample.ownerName ?? undefined;
    })();
    nodes.push({
      key: hasOwner ? `owner-${ownerId}` : 'owner-unknown',
      label: ownerLabel,
      folderId: null,
      ownerId,
      depth: 0,
      description: ownerDescription,
      isSynthetic: true,
      children: buildHierarchy(items, null, 1)
    });
  });

  nodes.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  return nodes;
};

const GalleryPage = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const { permissions: grantedPermissions, user } = useAppSelector((state) => state.auth);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [sortValue, setSortValue] = useState<SortOptionValue>('newest');
  const [folderFilter, setFolderFilter] = useState<number | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<number | null>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploaderFilter, setUploaderFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editModal, setEditModal] = useState<EditModalState | null>(null);
  const [folderModal, setFolderModal] = useState<FolderModalState | null>(null);

  const granted = (grantedPermissions as PermissionKey[]) ?? [];
  const currentUserId = user?.id ?? null;

  const canUpload = useMemo(() => hasAnyPermission(granted, ['GALLERY_CREATE']), [granted]);
  const canEdit = useMemo(() => hasAnyPermission(granted, ['GALLERY_EDIT_ALL']), [granted]);
  const canDeleteAll = useMemo(() => hasAnyPermission(granted, ['GALLERY_DELETE_ALL']), [granted]);
  const canDeleteOwn = useMemo(() => hasAnyPermission(granted, ['GALLERY_DELETE_OWN']), [granted]);
  const canViewAll = useMemo(() => hasAnyPermission(granted, ['GALLERY_VIEW_ALL']), [granted]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchTerm(searchDraft.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    setPage(0);
  }, [pageSize, sortValue, folderFilter, ownerFilter, uploaderFilter]);

  const foldersQuery = useQuery<GalleryFolder[]>({
    queryKey: ['gallery', 'folders'],
    queryFn: async () => {
      const { data } = await api.get<GalleryFolder[]>('/gallery/folders');
      return data;
    }
  });

  const filesQuery = useQuery<GalleryFilePage>({
    queryKey: [
      'gallery',
      'files',
      {
        page,
        pageSize,
        sortValue,
        folderFilter,
        ownerFilter: canViewAll ? ownerFilter : currentUserId,
        uploaderFilter: canViewAll ? uploaderFilter : '',
        searchTerm
      }
    ],
    queryFn: async () => {
      const sortOption = SORT_OPTIONS.find((option) => option.value === sortValue) ?? SORT_OPTIONS[0];
      const params: Record<string, unknown> = {
        page,
        size: pageSize,
        sort: sortOption.sort,
        direction: sortOption.direction
      };
      if (folderFilter !== null) {
        params.folderId = folderFilter;
      } else if (canViewAll && ownerFilter !== null) {
        params.uploaderId = ownerFilter;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      if (canViewAll && uploaderFilter.trim()) {
        params.uploader = uploaderFilter.trim();
      }
      const { data } = await api.get<GalleryFilePage>('/gallery/files', { params });
      return data;
    },
    placeholderData: (previousData) => previousData
  });

  const invalidateGallery = () => {
    queryClient.invalidateQueries({ queryKey: ['gallery', 'files'] });
  };

  const uploadFiles = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      if (folderFilter !== null) {
        formData.append('folderId', folderFilter.toString());
      }
      const { data } = await api.post<GalleryFile[]>('/gallery/files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return data;
    },
    onSuccess: (uploaded) => {
      notify({ type: 'success', message: uploaded.length === 1 ? 'File uploaded successfully.' : 'Files uploaded successfully.' });
      invalidateGallery();
      setSelectedIds([]);
    },
    onError: () => {
      notify({ type: 'error', message: 'Unable to upload files. Please check the allowed file types.' });
    }
  });

  const deleteFiles = useMutation({
    mutationFn: async (ids: number[]) => {
      if (ids.length === 1) {
        await api.delete(`/gallery/files/${ids[0]}`);
      } else {
        await api.post('/gallery/files/bulk-delete', { ids });
      }
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'File(s) deleted successfully.' });
      invalidateGallery();
      setSelectedIds([]);
    },
    onError: () => {
      notify({ type: 'error', message: 'Unable to delete the selected files.' });
    }
  });

  const updateFile = useMutation({
    mutationFn: async (payload: { id: number; displayName: string; folderId: number | null }) => {
      const { data } = await api.patch<GalleryFile>(`/gallery/files/${payload.id}`, {
        displayName: payload.displayName,
        targetFolderId: payload.folderId
      });
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'File updated successfully.' });
      invalidateGallery();
      setEditModal(null);
    },
    onError: () => {
      notify({ type: 'error', message: 'Unable to update the file.' });
    }
  });

  const createFolder = useMutation({
    mutationFn: async (payload: { name: string; parentId: number | null }) => {
      const { data } = await api.post<GalleryFolder>('/gallery/folders', payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Folder created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['gallery', 'folders'] });
      setFolderModal(null);
    },
    onError: () => {
      notify({ type: 'error', message: 'Unable to create folder. Ensure the name is unique.' });
    }
  });

  const files = filesQuery.data?.content ?? [];
  const totalPages = filesQuery.data?.totalPages ?? 0;

  const allSelected = files.length > 0 && selectedIds.length === files.length;
  const partiallySelected = selectedIds.length > 0 && selectedIds.length < files.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(files.map((file) => file.id));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((previous) => (previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id]));
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const inputFiles = Array.from(event.target.files ?? []);
    if (!inputFiles.length) {
      return;
    }
    uploadFiles.mutate(inputFiles);
    event.target.value = '';
  };

  const handleDeleteSelected = () => {
    if (!selectedIds.length) {
      return;
    }
    deleteFiles.mutate(selectedIds);
  };

  const handleDeleteSingle = (id: number) => {
    deleteFiles.mutate([id]);
  };

  const openEditModal = (file: GalleryFile) => {
    setEditModal({ file, name: file.displayName, folderId: file.folderId ?? null });
  };

  const openFolderModal = () => {
    setFolderModal({ name: '', parentId: folderFilter });
  };

  const foldersData = foldersQuery.data ?? [];
  const folderMap = useMemo(() => {
    const map = new Map<number, GalleryFolder & { id: number }>();
    foldersData.forEach((folder) => {
      if (folder.id !== null) {
        map.set(folder.id, folder as GalleryFolder & { id: number });
      }
    });
    return map;
  }, [foldersData]);

  const resolveFolderName = useCallback((folderId?: number | null) => {
    if (folderId === null || folderId === undefined) {
      return 'All Files';
    }
    const stack: string[] = [];
    let current = folderId !== null ? folderMap.get(folderId) : undefined;
    while (current) {
      stack.unshift(current.name);
      if (current.parentId === null) {
        if (canViewAll) {
          const ownerLabel = current.ownerKey ?? current.ownerEmail ?? current.ownerName ?? `User ${current.ownerId ?? ''}`;
          stack.unshift(ownerLabel);
        }
        break;
      }
      const parentId = current.parentId;
      current = parentId !== null ? folderMap.get(parentId) : undefined;
    }
    return stack.length > 0 ? stack.join(' / ') : 'All Files';
  }, [folderMap, canViewAll]);

  const folderSelectOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [
      { id: '', label: 'All Files' }
    ];
    const concrete = Array.from(folderMap.values());
    concrete
      .sort((a, b) => resolveFolderName(a.id).localeCompare(resolveFolderName(b.id)))
      .forEach((folder) => {
        options.push({ id: String(folder.id), label: resolveFolderName(folder.id) });
      });
    return options;
  }, [folderMap, resolveFolderName]);

  const renderFolderOptions = () =>
    folderSelectOptions.map((option) => (
      <option key={`folder-${option.id || 'root'}`} value={option.id}>
        {option.label}
      </option>
    ));

  const folderTree = useMemo(() => buildFolderTree(foldersData, currentUserId, canViewAll), [foldersData, currentUserId, canViewAll]);

  const breadcrumbs = useMemo(() => {
    const crumbs: { label: string; folderId: number | null; ownerId: number | null }[] = [
      { label: 'All Files', folderId: null, ownerId: null }
    ];

    if (folderFilter !== null) {
      const stack: (GalleryFolder & { id: number })[] = [];
      let current = folderMap.get(folderFilter);
      const ownerId = current?.ownerId ?? null;
      while (current) {
        stack.unshift(current);
        if (current.parentId === null) {
          break;
        }
        const parentId = current.parentId;
        current = parentId !== null ? folderMap.get(parentId) : undefined;
      }
      if (canViewAll && ownerId !== null) {
        const ownerLabel = stack[0]?.ownerKey ?? stack[0]?.ownerEmail ?? stack[0]?.ownerName ?? `User ${ownerId}`;
        crumbs.push({ label: ownerLabel, folderId: null, ownerId });
      }
      stack.forEach((folder) => {
        crumbs.push({ label: folder.name, folderId: folder.id, ownerId: folder.ownerId ?? null });
      });
      return crumbs;
    }

    if (canViewAll && ownerFilter !== null) {
      const ownerSample = foldersData.find(
        (folder): folder is GalleryFolder & { id: number } => folder.id !== null && folder.ownerId === ownerFilter
      );
      const ownerLabel = ownerSample?.ownerKey ?? ownerSample?.ownerEmail ?? ownerSample?.ownerName ?? `User ${ownerFilter}`;
      crumbs.push({ label: ownerLabel, folderId: null, ownerId: ownerFilter });
    }

    return crumbs;
  }, [folderFilter, ownerFilter, folderMap, foldersData, canViewAll]);

  const handleNodeSelection = (node: FolderTreeNode) => {
    if (node.folderId !== null) {
      setFolderFilter(node.folderId);
      setOwnerFilter(null);
    } else {
      setOwnerFilter(canViewAll ? node.ownerId ?? null : null);
      setFolderFilter(null);
    }
    setSelectedIds([]);
  };

  const renderTreeNodes = (nodes: FolderTreeNode[]) =>
    nodes.map((node) => {
      const isFolder = node.folderId !== null;
      const isSelected = isFolder
        ? folderFilter === node.folderId
        : folderFilter === null && (canViewAll ? ownerFilter === (node.ownerId ?? null) : isAllScopeSelected);
      const hasChildren = node.children.length > 0;
      return (
        <div key={node.key} className="flex flex-col">
          <button
            type="button"
            onClick={() => handleNodeSelection(node)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
              isSelected ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'
            }`}
            style={{ paddingLeft: `${node.depth * 12 + 8}px` }}
          >
            <span className="flex flex-col">
              <span className="inline-flex items-center gap-2">
                <span className="text-lg">{isFolder ? '📁' : '👤'}</span>
                <span className="font-medium">{node.label}</span>
              </span>
              {node.description && <span className="ml-6 text-xs text-slate-400">{node.description}</span>}
            </span>
            {hasChildren && <span className="text-xs text-slate-400">{node.children.length}</span>}
          </button>
          {hasChildren && <div className="mt-1 flex flex-col gap-1">{renderTreeNodes(node.children)}</div>}
        </div>
      );
    });

  const handleBreadcrumbClick = (folderId: number | null, ownerId: number | null, isLast: boolean) => {
    if (isLast) {
      return;
    }
    if (folderId !== null) {
      setFolderFilter(folderId);
      setOwnerFilter(null);
    } else if (ownerId !== null) {
      setOwnerFilter(ownerId);
      setFolderFilter(null);
    } else {
      setOwnerFilter(null);
      setFolderFilter(null);
    }
    setSelectedIds([]);
  };

  const handleResetSelection = () => {
    setOwnerFilter(null);
    setFolderFilter(null);
    setSelectedIds([]);
  };

  const isAllScopeSelected = folderFilter === null && ownerFilter === null;

  const canDelete = canDeleteAll || canDeleteOwn;

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
        disabled={!canUpload || uploadFiles.isPending}
      />

      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Gallery</h1>
            <p className="text-sm text-slate-500">Upload, organize, and manage files across your workspace.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canUpload && (
              <button
                type="button"
                onClick={handleUploadButtonClick}
                disabled={uploadFiles.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
              >
                <span className="text-lg">⬆️</span>
                Upload
              </button>
            )}
            {canUpload && (
              <button
                type="button"
                onClick={openFolderModal}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary hover:text-primary"
              >
                <span className="text-lg">📁</span>
                New Folder
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={!selectedIds.length || deleteFiles.isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <span className="text-lg">🗑️</span>
                Delete Selected
              </button>
            )}
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <div key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBreadcrumbClick(crumb.folderId, crumb.ownerId, isLast)}
                  className={`rounded-lg px-2 py-1 transition ${
                    isLast ? 'bg-slate-100 font-semibold text-slate-800' : 'hover:bg-slate-100'
                  }`}
                  disabled={isLast}
                >
                  {crumb.label}
                </button>
                {!isLast && <span className="text-slate-400">/</span>}
              </div>
            );
          })}
        </nav>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search by name or extension"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sort by</label>
            <select
              value={sortValue}
              onChange={(event) => setSortValue(event.target.value as SortOptionValue)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {canViewAll && (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filter by uploader</label>
            <input
              type="text"
              value={uploaderFilter}
              onChange={(event) => setUploaderFilter(event.target.value)}
              placeholder="Enter email or name"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        <aside className="flex h-full flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Folders</h2>
            {canUpload && (
              <button
                type="button"
                onClick={openFolderModal}
                className="inline-flex items-center rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
              >
                + New
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleResetSelection}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
              isAllScopeSelected ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="text-lg">🗂️</span>
            <span className="font-medium">All files</span>
          </button>
          <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {folderTree.length ? (
              renderTreeNodes(folderTree)
            ) : (
              <p className="px-3 py-6 text-sm text-slate-400">No folders yet. Create one to get started.</p>
            )}
          </div>
        </aside>
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-12 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(element) => {
                      if (element) {
                        element.indeterminate = partiallySelected;
                      }
                    }}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">File</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Size</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Folder</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Uploaded</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {files.map((file) => {
                const isOwner = currentUserId !== null && currentUserId === (file.uploadedById ?? null);
                const canDeleteFile = canDeleteAll || (canDeleteOwn && isOwner);
                return (
                  <tr key={file.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(file.id)}
                        onChange={() => toggleSelect(file.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                          {file.extension.slice(0, 4)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{file.displayName}</div>
                          <div className="text-xs text-slate-500">{file.originalFilename}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{file.extension.toUpperCase()}</td>
                    <td className="px-4 py-3 text-slate-600">{formatFileSize(file.sizeBytes)}</td>
                    <td className="px-4 py-3 text-slate-600">{resolveFolderName(file.folderId)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex flex-col">
                        <span>{file.uploadedByName ?? file.uploadedByEmail ?? '—'}</span>
                        <span className="text-xs text-slate-400">{formatDateTime(file.uploadedAt)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <a
                          href={resolveFileUrl(file.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-primary hover:text-primary/80"
                        >
                          View
                        </a>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openEditModal(file)}
                            className="text-sm font-semibold text-slate-600 hover:text-primary"
                          >
                            Edit
                          </button>
                        )}
                        {canDeleteFile && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSingle(file.id)}
                            className="text-sm font-semibold text-rose-600 hover:text-rose-500"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!files.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-sm text-slate-500">
                    {filesQuery.isFetching ? 'Loading files…' : 'No files found for the selected filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-4 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <button
              type="button"
              onClick={() => setPage((previous) => Math.max(previous - 1, 0))}
              disabled={page === 0}
              className="rounded-lg border border-slate-300 px-3 py-1 font-semibold text-slate-700 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            >
              Previous
            </button>
            <span>
              Page {Math.min(page + 1, totalPages || 1)} of {totalPages || 1}
            </span>
            <button
              type="button"
              onClick={() => setPage((previous) => (previous + 1 < totalPages ? previous + 1 : previous))}
              disabled={page + 1 >= totalPages}
              className="rounded-lg border border-slate-300 px-3 py-1 font-semibold text-slate-700 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      </div>

      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Edit file</h2>
            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">File name</label>
              <input
                type="text"
                value={editModal.name}
                onChange={(event) => setEditModal({ ...editModal, name: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Folder</label>
              <select
                value={editModal.folderId ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setEditModal({ ...editModal, folderId: value === '' ? null : Number(value) });
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {renderFolderOptions()}
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditModal(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  updateFile.mutate({
                    id: editModal.file.id,
                    displayName: editModal.name.trim() || editModal.file.displayName,
                    folderId: editModal.folderId
                  })
                }
                disabled={updateFile.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {folderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Create folder</h2>
            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Folder name</label>
              <input
                type="text"
                value={folderModal.name}
                onChange={(event) => setFolderModal({ ...folderModal, name: event.target.value })}
                placeholder="e.g. Design assets"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Parent folder</label>
              <select
                value={folderModal.parentId ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setFolderModal({ ...folderModal, parentId: value === '' ? null : Number(value) });
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {renderFolderOptions()}
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFolderModal(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const trimmed = folderModal.name.trim();
                  if (!trimmed) {
                    notify({ type: 'error', message: 'Folder name cannot be empty.' });
                    return;
                  }
                  createFolder.mutate({ name: trimmed, parentId: folderModal.parentId });
                }}
                disabled={createFolder.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
              >
                Create folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryPage;
