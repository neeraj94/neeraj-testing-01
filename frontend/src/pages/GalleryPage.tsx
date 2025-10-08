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
  isSelectable: boolean;
};

type DetailsModalState = {
  file: GalleryFile;
};

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp', 'heic', 'heif', 'tiff']);

const EXTENSION_ICONS: Record<string, string> = {
  pdf: '📕',
  doc: '📄',
  docx: '📄',
  xls: '📊',
  xlsx: '📊',
  csv: '📈',
  txt: '📝',
  ppt: '📊',
  pptx: '📊',
  zip: '🗜️',
  rar: '🗜️',
  mp4: '🎞️',
  mov: '🎞️',
  avi: '🎞️',
  mp3: '🎵',
  wav: '🎵',
  json: '🧾'
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

const resolveFileUrl = (id: number, token?: string | null) => {
  const baseUrl = api.defaults.baseURL ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const url = new URL(`gallery/files/${id}/content`, normalizedBase);
  if (token) {
    url.searchParams.set('access_token', token);
  }
  return url.toString();
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

  if (currentUserId !== null && !grouped.has(currentUserId)) {
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
      isSelectable: true,
      children: buildHierarchy(items, child.id, depth + 1)
    }));
  };

  const resolveOwnerMeta = (ownerId: number | null) => {
    const items = grouped.get(ownerId) ?? [];
    const sample = items[0];
    if (ownerId === null) {
      return {
        label: canViewAll ? 'Shared Files' : 'My Files',
        description: canViewAll ? 'Files without a specific owner' : undefined
      };
    }
    if (currentUserId !== null && ownerId === currentUserId) {
      return {
        label: 'My Files',
        description: sample?.ownerEmail ?? sample?.ownerName ?? undefined
      };
    }
    return {
      label: sample?.ownerKey ?? sample?.ownerEmail ?? sample?.ownerName ?? `User ${ownerId}`,
      description: sample?.ownerEmail ?? sample?.ownerName ?? undefined
    };
  };

  const createOwnerNode = (ownerId: number | null, depth: number): FolderTreeNode => {
    const meta = resolveOwnerMeta(ownerId);
    const items = grouped.get(ownerId) ?? [];
    return {
      key: ownerId === null ? 'owner-unassigned' : `owner-${ownerId}`,
      label: meta.label,
      folderId: null,
      ownerId,
      depth,
      description: meta.description,
      isSynthetic: true,
      isSelectable: ownerId !== null,
      children: buildHierarchy(items, null, depth + 1)
    };
  };

  const rootNode: FolderTreeNode = {
    key: 'scope-all-files',
    label: 'All Files',
    folderId: null,
    ownerId: null,
    depth: 0,
    description: canViewAll ? 'Everything that has been uploaded' : 'Your personal workspace',
    isSynthetic: true,
    isSelectable: true,
    children: []
  };

  const rootChildren: FolderTreeNode[] = [];

  if (currentUserId !== null || !canViewAll) {
    const myItems = grouped.get(currentUserId ?? null) ?? [];
    rootChildren.push({
      key: 'scope-my-files',
      label: 'My Files',
      folderId: null,
      ownerId: currentUserId ?? null,
      depth: 1,
      description: canViewAll ? 'Files that belong to you' : undefined,
      isSynthetic: true,
      isSelectable: true,
      children: buildHierarchy(myItems, null, 2)
    });
  }

  if (canViewAll) {
    const otherOwnerIds = Array.from(grouped.keys()).filter((ownerId) => ownerId !== currentUserId);
    const otherNodes = otherOwnerIds.map((ownerId) => createOwnerNode(ownerId, 2));
    otherNodes.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    if (otherNodes.length > 0) {
      rootChildren.push({
        key: 'scope-all-users',
        label: 'All Users Files',
        folderId: null,
        ownerId: null,
        depth: 1,
        description: 'All other users',
        isSynthetic: true,
        isSelectable: false,
        children: otherNodes.map((node) => ({
          ...node,
          depth: 2
        }))
      });
    }
  }

  rootNode.children = rootChildren;
  return [rootNode];
};

const GalleryPage = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const { permissions: grantedPermissions, user, accessToken } = useAppSelector((state) => state.auth);
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [detailsModal, setDetailsModal] = useState<DetailsModalState | null>(null);

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
    if (typeof window === 'undefined') {
      return;
    }
    const handleDocumentClick = () => setActiveMenuId(null);
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

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
    setActiveMenuId(null);
  };

  const openFolderModal = () => {
    setFolderModal({ name: '', parentId: folderFilter });
  };

  const handleOpenDetails = (file: GalleryFile) => {
    setDetailsModal({ file });
  };

  const getFileUrl = useCallback((id: number) => resolveFileUrl(id, accessToken), [accessToken]);

  const renderFileMenu = (file: GalleryFile, canDeleteFile: boolean) => (
    <>
      <a
        href={getFileUrl(file.id)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setActiveMenuId(null)}
        className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-primary"
      >
        Open in new tab
        <span>↗</span>
      </a>
      <button
        type="button"
        onClick={() => {
          setActiveMenuId(null);
          handleOpenDetails(file);
        }}
        className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-primary"
      >
        View details
      </button>
      {canEdit && (
        <button
          type="button"
          onClick={() => {
            openEditModal(file);
          }}
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-primary"
        >
          Rename
        </button>
      )}
      {canDeleteFile && (
        <button
          type="button"
          onClick={() => {
            setActiveMenuId(null);
            handleDeleteSingle(file.id);
          }}
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
        >
          Delete
        </button>
      )}
    </>
  );

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

  const resolveOwnerLabel = useCallback(
    (ownerId: number | null) => {
      if (ownerId === null) {
        return canViewAll ? 'Shared Files' : 'My Files';
      }
      if (currentUserId !== null && ownerId === currentUserId) {
        return 'My Files';
      }
      const match = foldersData.find(
        (candidate): candidate is GalleryFolder & { id: number } => candidate.id !== null && candidate.ownerId === ownerId
      );
      return match?.ownerKey ?? match?.ownerEmail ?? match?.ownerName ?? `User ${ownerId}`;
    },
    [canViewAll, currentUserId, foldersData]
  );

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
          stack.unshift(resolveOwnerLabel(current.ownerId ?? null));
        }
        break;
      }
      const parentId = current.parentId;
      current = parentId !== null ? folderMap.get(parentId) : undefined;
    }
    return stack.length > 0 ? stack.join(' / ') : 'All Files';
  }, [folderMap, canViewAll, resolveOwnerLabel]);

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

  useEffect(() => {
    setExpandedNodes((previous) => {
      const next = new Set(previous);
      const expandInitial = (nodes: FolderTreeNode[]) => {
        nodes.forEach((node) => {
          if (node.children.length > 0 && node.depth <= 1) {
            next.add(node.key);
          }
          if (node.children.length > 0) {
            expandInitial(node.children);
          }
        });
      };
      expandInitial(folderTree);
      return next;
    });
  }, [folderTree]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [folderFilter, ownerFilter]);

  useEffect(() => {
    setActiveMenuId(null);
  }, [viewMode, files]);

  const activeOwnerId = useMemo(() => {
    if (folderFilter !== null) {
      const folder = folderMap.get(folderFilter);
      return folder?.ownerId ?? null;
    }
    if (canViewAll) {
      return ownerFilter ?? null;
    }
    return currentUserId;
  }, [folderFilter, folderMap, canViewAll, ownerFilter, currentUserId]);

  const shouldFilterByOwner = useMemo(() => {
    if (folderFilter !== null) {
      return true;
    }
    if (!canViewAll) {
      return true;
    }
    return ownerFilter !== null;
  }, [folderFilter, canViewAll, ownerFilter]);

  const visibleFolders = useMemo(() => {
    const targetParentId = folderFilter ?? null;
    return foldersData
      .filter(
        (folder): folder is GalleryFolder & { id: number } =>
          folder.id !== null &&
          (folder.parentId ?? null) === targetParentId &&
          (!shouldFilterByOwner || (folder.ownerId ?? null) === (activeOwnerId ?? null))
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [foldersData, folderFilter, shouldFilterByOwner, activeOwnerId]);

  const headerTitle = useMemo(() => {
    if (folderFilter !== null) {
      const folder = folderMap.get(folderFilter);
      return folder?.name ?? 'Folder';
    }
    if (canViewAll) {
      if (ownerFilter !== null) {
        if (currentUserId !== null && ownerFilter === currentUserId) {
          return 'My Files';
        }
        const ownerName = resolveOwnerLabel(ownerFilter);
        return `${ownerName}'s Files`;
      }
      return 'All Files';
    }
    return 'My Files';
  }, [folderFilter, folderMap, canViewAll, ownerFilter, resolveOwnerLabel, currentUserId]);

  const headerSubtitle = useMemo(() => {
    if (folderFilter !== null) {
      return resolveFolderName(folderFilter);
    }
    if (canViewAll) {
      if (ownerFilter !== null) {
        return currentUserId !== null && ownerFilter === currentUserId
          ? 'Your personal workspace'
          : 'Files owned by the selected user';
      }
      return 'Everything that has been uploaded across the workspace';
    }
    return 'All of the files and folders you own';
  }, [folderFilter, resolveFolderName, canViewAll, ownerFilter, currentUserId]);

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
        crumbs.push({ label: resolveOwnerLabel(ownerId), folderId: null, ownerId });
      }
      stack.forEach((folder) => {
        crumbs.push({ label: folder.name, folderId: folder.id, ownerId: folder.ownerId ?? null });
      });
      return crumbs;
    }

    if (canViewAll && ownerFilter !== null) {
      crumbs.push({ label: resolveOwnerLabel(ownerFilter), folderId: null, ownerId: ownerFilter });
    }

    return crumbs;
  }, [folderFilter, ownerFilter, folderMap, canViewAll, resolveOwnerLabel]);

  const isAllScopeSelected = folderFilter === null && ownerFilter === null;

  const handleFolderOpen = (id: number) => {
    setFolderFilter(id);
    setOwnerFilter(null);
    setSelectedIds([]);
  };

  const handleNodeSelection = (node: FolderTreeNode) => {
    if (node.isSelectable === false) {
      return;
    }
    if (node.folderId !== null) {
      setFolderFilter(node.folderId);
      setOwnerFilter(null);
    } else {
      setOwnerFilter(canViewAll ? node.ownerId ?? null : null);
      setFolderFilter(null);
    }
    setSelectedIds([]);
    setIsSidebarOpen(false);
  };

  const toggleNodeExpansion = (node: FolderTreeNode) => {
    if (!node.children.length) {
      return;
    }
    setExpandedNodes((previous) => {
      const next = new Set(previous);
      if (next.has(node.key)) {
        next.delete(node.key);
      } else {
        next.add(node.key);
      }
      return next;
    });
  };

  const renderTreeNodes = (nodes: FolderTreeNode[]) =>
    nodes.map((node) => {
      const isFolder = node.folderId !== null;
      const isSelectable = node.isSelectable !== false;
      const ownerSelectionMatches = (() => {
        if (isFolder) {
          return false;
        }
        if (!canViewAll) {
          return node.key === 'scope-my-files';
        }
        if (node.key === 'scope-all-files') {
          return ownerFilter === null;
        }
        if (node.ownerId === null) {
          return false;
        }
        return ownerFilter === node.ownerId;
      })();
      const isSelected =
        isSelectable && (isFolder ? folderFilter === node.folderId : folderFilter === null && ownerSelectionMatches);
      const hasChildren = node.children.length > 0;
      const isExpanded = !hasChildren || expandedNodes.has(node.key);

      return (
        <div key={node.key} className="flex flex-col" style={{ marginLeft: `${node.depth * 12}px` }}>
          <div className="flex items-center gap-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleNodeExpansion(node);
                }}
                className="flex h-6 w-6 items-center justify-center rounded-md text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? '▾' : '▸'}
              </button>
            ) : (
              <span className="h-6 w-6" />
            )}
            <button
              type="button"
              onClick={() => handleNodeSelection(node)}
              disabled={!isSelectable}
              aria-disabled={!isSelectable}
              className={`flex min-h-[2.5rem] flex-1 items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                isSelected
                  ? 'bg-primary/10 text-primary'
                  : isSelectable
                    ? 'text-slate-600 hover:bg-slate-100'
                    : 'cursor-default text-slate-400'
              }`}
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
          </div>
          {hasChildren && isExpanded && <div className="ml-7 mt-1 flex flex-col gap-1">{renderTreeNodes(node.children)}</div>}
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
    setIsSidebarOpen(false);
  };


  const canDelete = canDeleteAll || canDeleteOwn;

  const isLoadingFiles = filesQuery.isFetching;

  const showEmptyState = !visibleFolders.length && !files.length && !isLoadingFiles;
  const totalVisibleItems = visibleFolders.length + files.length;

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

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="flex w-full items-center justify-between rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary hover:text-primary"
        >
          <span>Browse folders</span>
          <span className="text-lg">📁</span>
        </button>
      </div>

      <div className="relative flex flex-col gap-6 lg:flex-row">
        {isSidebarOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <aside
          className={`transform ${
            isSidebarOpen
              ? 'translate-x-0 opacity-100 pointer-events-auto'
              : '-translate-x-full opacity-0 pointer-events-none lg:translate-x-0 lg:opacity-100 lg:pointer-events-auto'
          } fixed inset-y-6 left-4 right-4 z-40 flex max-h-[80vh] flex-col gap-4 overflow-hidden overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-xl transition-all duration-200 lg:static lg:h-full lg:min-h-[26rem] lg:w-72 lg:max-h-none lg:overflow-visible lg:p-4 lg:shadow-sm`}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-800">Navigation</h2>
            <div className="flex items-center gap-2">
              {canUpload && (
                <button
                  type="button"
                  onClick={openFolderModal}
                  className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                >
                  New
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-primary hover:text-primary lg:hidden"
              >
                Close
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetSelection}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm transition ${
              isAllScopeSelected ? 'bg-primary/10 font-semibold text-primary' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="text-xl">🗂️</span>
            <span>All files</span>
          </button>
          <div className="flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
            {folderTree.length ? (
              renderTreeNodes(folderTree)
            ) : (
              <p className="px-3 py-6 text-sm text-slate-400">No folders yet. Create one to get started.</p>
            )}
          </div>
        </aside>

        <div className="flex-1 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">{headerTitle}</h1>
                <p className="text-sm text-slate-500">{headerSubtitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {canUpload && (
                  <button
                    type="button"
                    onClick={handleUploadButtonClick}
                    disabled={uploadFiles.isPending}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
                  >
                    <span className="text-lg">⬆️</span>
                    Upload
                  </button>
                )}
                {canUpload && (
                  <button
                    type="button"
                    onClick={openFolderModal}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary hover:text-primary"
                  >
                    <span className="text-lg">📁</span>
                    New folder
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    disabled={!selectedIds.length || deleteFiles.isPending}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <span className="text-lg">🗑️</span>
                    Delete selected
                  </button>
                )}
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-semibold text-slate-500">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`rounded-full px-3 py-1 transition ${viewMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'hover:text-slate-700'}`}
                  >
                    Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`rounded-full px-3 py-1 transition ${viewMode === 'list' ? 'bg-white text-primary shadow-sm' : 'hover:text-slate-700'}`}
                  >
                    List
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 lg:flex-row">
              <div className="flex-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search in drive</label>
                <div className="mt-1 flex items-center rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm focus-within:border-primary">
                  <span className="mr-2 text-lg text-slate-400">🔍</span>
                  <input
                    type="search"
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    placeholder="Search by file name, type, or owner"
                    className="w-full border-none text-sm outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="sm:w-48">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sort by</label>
                  <select
                    value={sortValue}
                    onChange={(event) => setSortValue(event.target.value as SortOptionValue)}
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {canViewAll && (
                  <div className="sm:w-64">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filter by uploader</label>
                    <input
                      type="text"
                      value={uploaderFilter}
                      onChange={(event) => setUploaderFilter(event.target.value)}
                      placeholder="Enter email or name"
                      className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <div key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleBreadcrumbClick(crumb.folderId, crumb.ownerId, isLast)}
                        className={`rounded-full px-3 py-1 transition ${
                          isLast ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-slate-100'
                        }`}
                        disabled={isLast}
                      >
                        {crumb.label}
                      </button>
                      {!isLast && <span className="text-slate-300">›</span>}
                    </div>
                  );
                })}
              </nav>
              {files.length > 0 && (
                <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                  Select all
                </label>
              )}
            </div>

            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-700">Items</h2>
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  {totalVisibleItems} item{totalVisibleItems === 1 ? '' : 's'}
                </span>
              </div>

              {viewMode === 'grid' ? (
                <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {visibleFolders.map((folder) => (
                    <button
                      key={`folder-${folder.id}`}
                      type="button"
                      onClick={() => handleFolderOpen(folder.id)}
                      className="group flex h-full flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-1 hover:border-primary hover:bg-white hover:shadow-lg"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-3xl">📁</span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
                          {resolveOwnerLabel(folder.ownerId ?? null)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{folder.name}</p>
                        <p className="truncate text-xs text-slate-500">{folder.path}</p>
                      </div>
                      <span className="text-xs font-semibold text-primary opacity-0 transition group-hover:opacity-100">
                        Open folder →
                      </span>
                    </button>
                  ))}
                  {files.map((file) => {
                    const isOwner = currentUserId !== null && currentUserId === (file.uploadedById ?? null);
                    const canDeleteFile = canDeleteAll || (canDeleteOwn && isOwner);
                    const isSelected = selectedIds.includes(file.id);
                    const extension = file.extension.toLowerCase();
                    const isImage = IMAGE_EXTENSIONS.has(extension);
                    const icon = EXTENSION_ICONS[extension] ?? '📄';
                    return (
                      <div
                        key={file.id}
                        className={`group relative flex h-full flex-col rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                          isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'
                        }`}
                      >
                        <div className={`relative overflow-hidden rounded-xl ${isImage ? 'bg-slate-900/5' : 'bg-slate-900/90'}`}>
                          <div className="aspect-[4/3] w-full">
                            {isImage ? (
                              <img
                                src={getFileUrl(file.id)}
                                alt={file.displayName}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-5xl text-white">
                                {icon}
                              </div>
                            )}
                          </div>
                          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-slate-700">
                            {file.extension.toUpperCase()}
                          </span>
                          <span className="absolute bottom-3 left-3 rounded-full bg-slate-900/70 px-2 py-1 text-xs font-semibold text-white">
                            {formatFileSize(file.sizeBytes)}
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setActiveMenuId((previous) => (previous === file.id ? null : file.id));
                            }}
                            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg text-slate-600 shadow-sm transition hover:bg-white"
                          >
                            ⋮
                          </button>
                          {activeMenuId === file.id && (
                            <div
                              className="absolute right-3 top-12 z-20 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {renderFileMenu(file, canDeleteFile)}
                            </div>
                          )}
                        </div>
                        <div className="mt-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{file.displayName}</p>
                            <p className="truncate text-xs text-slate-500">{file.originalFilename}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(file.id)}
                            className="mt-1"
                          />
                        </div>
                        <p className="mt-2 truncate text-xs uppercase tracking-wide text-slate-400">{resolveFolderName(file.folderId)}</p>
                      </div>
                    );
                  })}
                  {!visibleFolders.length && !files.length && (
                    <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center text-sm text-slate-500">
                      {isLoadingFiles ? 'Loading items…' : 'Drop files here or use the upload button to get started.'}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
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
                      {visibleFolders.map((folder) => (
                        <tr key={`folder-${folder.id}`} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3 text-center text-slate-400">—</td>
                          <td className="max-w-[18rem] px-4 py-3">
                            <button
                              type="button"
                              onClick={() => handleFolderOpen(folder.id)}
                              className="flex w-full items-center gap-3 text-left"
                            >
                              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-2xl">📁</span>
                              <span className="min-w-0">
                                <span className="block truncate font-semibold text-slate-800">{folder.name}</span>
                                <span className="block truncate text-xs text-slate-500">{folder.path}</span>
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Folder</td>
                          <td className="px-4 py-3 text-slate-500">—</td>
                          <td className="px-4 py-3 text-slate-600">{resolveOwnerLabel(folder.ownerId ?? null)}</td>
                          <td className="px-4 py-3 text-slate-500">—</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleFolderOpen(folder.id)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      ))}
                      {files.map((file) => {
                        const isOwner = currentUserId !== null && currentUserId === (file.uploadedById ?? null);
                        const canDeleteFile = canDeleteAll || (canDeleteOwn && isOwner);
                        const isSelected = selectedIds.includes(file.id);
                        const extension = file.extension.toLowerCase();
                        const isImage = IMAGE_EXTENSIONS.has(extension);
                        const icon = EXTENSION_ICONS[extension] ?? '📄';
                        return (
                          <tr
                            key={`file-${file.id}`}
                            className={`${isSelected ? 'bg-primary/5' : ''} hover:bg-slate-50/60`}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(file.id)}
                              />
                            </td>
                            <td className="max-w-[18rem] px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                                  {isImage ? (
                                    <img
                                      src={getFileUrl(file.id)}
                                      alt={file.displayName}
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <span className="text-xl">{icon}</span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate font-medium text-slate-800">{file.displayName}</div>
                                  <div className="truncate text-xs text-slate-500">{file.originalFilename}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              {file.extension.toUpperCase()}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{formatFileSize(file.sizeBytes)}</td>
                            <td className="px-4 py-3 text-slate-600">{resolveFolderName(file.folderId)}</td>
                            <td className="px-4 py-3 text-slate-600">
                              <div className="min-w-0">
                                <p className="truncate">{file.uploadedByName ?? file.uploadedByEmail ?? '—'}</p>
                                <p className="text-xs text-slate-400">{formatDateTime(file.uploadedAt)}</p>
                              </div>
                            </td>
                            <td className="relative px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setActiveMenuId((previous) => (previous === file.id ? null : file.id));
                                }}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg text-slate-500 transition hover:border-primary hover:text-primary"
                              >
                                ⋮
                              </button>
                              {activeMenuId === file.id && (
                                <div
                                  className="absolute right-4 top-12 z-20 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {renderFileMenu(file, canDeleteFile)}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {!visibleFolders.length && !files.length && (
                        <tr>
                          <td colSpan={7} className="px-4 py-16 text-center text-sm text-slate-500">
                            {isLoadingFiles ? 'Loading files…' : 'No files found for the selected filters.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
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

          {showEmptyState && (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center text-sm text-slate-500">
              Nothing to show here yet. Create a folder or upload a file to start building your drive.
            </div>
          )}
        </div>
      </div>
      {detailsModal && (() => {
        const file = detailsModal.file;
        const extension = file.extension.toLowerCase();
        const isImage = IMAGE_EXTENSIONS.has(extension);
        const icon = EXTENSION_ICONS[extension] ?? '📄';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
              <div className={`relative ${isImage ? 'bg-slate-900/5' : 'bg-slate-900/90'}`}>
                <div className="aspect-[4/3] w-full">
                  {isImage ? (
                    <img
                      src={getFileUrl(file.id)}
                      alt={file.displayName}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-6xl text-white">{icon}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setDetailsModal(null)}
                  className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-slate-900/30 text-lg text-white backdrop-blur transition hover:bg-slate-900/60"
                >
                  ✕
                </button>
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700">
                  {file.extension.toUpperCase()}
                </span>
                <span className="absolute bottom-3 left-3 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-semibold text-white">
                  {formatFileSize(file.sizeBytes)}
                </span>
              </div>
              <div className="space-y-4 p-6 text-sm text-slate-600">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-slate-900">{file.displayName}</h2>
                    <p className="truncate text-xs uppercase tracking-wide text-slate-400">{resolveFolderName(file.folderId)}</p>
                  </div>
                  <a
                    href={getFileUrl(file.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                  >
                    Open
                    <span>↗</span>
                  </a>
                </div>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Original filename</dt>
                    <dd className="mt-1 truncate text-sm text-slate-700">{file.originalFilename}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">File type</dt>
                    <dd className="mt-1 text-sm text-slate-700">{file.mimeType ?? file.extension.toUpperCase()}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Uploaded by</dt>
                    <dd className="mt-1 text-sm text-slate-700">{file.uploadedByName ?? file.uploadedByEmail ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Uploaded on</dt>
                    <dd className="mt-1 text-sm text-slate-700">{formatDateTime(file.uploadedAt)}</dd>
                  </div>
                </dl>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setDetailsModal(null)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
