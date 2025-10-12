import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';
import PageSection from '../components/PageSection';
import PaginationControls from '../components/PaginationControls';
import api from '../services/http';
import type {
  UploadedFile,
  UploadedFileModuleOption,
  UploadedFilePage,
  UploadedFileUploaderOption
} from '../types/uploaded-file';
import { formatFileSize } from '../utils/files';
import { useToast } from '../components/ToastProvider';
import { useConfirm } from '../components/ConfirmDialogProvider';
import { extractErrorMessage } from '../utils/errors';
import { useAppSelector } from '../app/hooks';
import { hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 50, 100];

const FILE_TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'IMAGE', label: 'Images' },
  { value: 'VIDEO', label: 'Videos' },
  { value: 'AUDIO', label: 'Audio' },
  { value: 'DOCUMENT', label: 'Documents' }
];

const filterLabelClass = 'text-[11px] font-semibold uppercase tracking-wide text-slate-500';
const filterInputClass =
  'h-9 rounded-lg border border-slate-200 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

const formatUploadedOn = (uploadedAt: string) =>
  new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(uploadedAt));

const UploadedFilesPage = () => {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const confirm = useConfirm();
  const permissions = useAppSelector((state) => state.auth.permissions);
  const canManageFiles = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['UPLOADED_FILE_MANAGE']),
    [permissions]
  );

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [fileType, setFileType] = useState('');
  const [module, setModule] = useState('');
  const [uploader, setUploader] = useState<number | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [menuFileId, setMenuFileId] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    if (menuFileId === null) {
      return undefined;
    }

    const handleDismiss = () => setMenuFileId(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuFileId(null);
      }
    };

    document.addEventListener('mousedown', handleDismiss);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleDismiss);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuFileId]);

  const moduleQuery = useQuery<UploadedFileModuleOption[]>({
    queryKey: ['uploaded-files', 'modules'],
    queryFn: async () => {
      const { data } = await api.get<UploadedFileModuleOption[]>('/uploaded-files/modules');
      return data;
    }
  });

  const uploaderQuery = useQuery<UploadedFileUploaderOption[]>({
    queryKey: ['uploaded-files', 'uploaders'],
    queryFn: async () => {
      const { data } = await api.get<UploadedFileUploaderOption[]>('/uploaded-files/uploaders');
      return data;
    }
  });

  const filesQuery = useQuery<UploadedFilePage>({
    queryKey: ['uploaded-files', { page, size, search, fileType, module, uploader, from, to }],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size };
      if (search) params.search = search;
      if (fileType) params.fileType = fileType;
      if (module) params.module = [module];
      if (uploader) params.uploadedBy = uploader;
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await api.get<UploadedFilePage>('/uploaded-files', { params });
      return data;
    }
  });

  const files = useMemo(() => filesQuery.data?.content ?? [], [filesQuery.data]);
  const totalElements = filesQuery.data?.totalElements ?? 0;

  useEffect(() => {
    if (!selection.size) {
      return;
    }
    const availableIds = new Set(files.map((file) => file.id));
    setSelection((previous) => {
      const next = new Set<number>();
      previous.forEach((id) => {
        if (availableIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [files, selection.size]);

  useEffect(() => {
    if (!canManageFiles && selection.size) {
      setSelection(new Set());
    }
  }, [canManageFiles, selection.size]);

  const moduleOptions = useMemo(() => moduleQuery.data ?? [], [moduleQuery.data]);
  const uploaderOptions = useMemo(() => uploaderQuery.data ?? [], [uploaderQuery.data]);

  const deleteFilesMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await api.post('/uploaded-files/delete', { ids });
    },
    onSuccess: (_data, ids) => {
      notify({
        type: 'success',
        message: ids.length === 1 ? 'File deleted.' : `${ids.length} files deleted.`
      });
      setSelection(new Set());
      setMenuFileId(null);
      queryClient.invalidateQueries({ queryKey: ['uploaded-files'] });
    },
    onError: (error: unknown) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Failed to delete file.') });
    }
  });

  const selectedCount = selection.size;
  const hasSelection = canManageFiles && selectedCount > 0;

  const handleToggleSelection = (fileId: number) => {
    if (!canManageFiles) {
      return;
    }
    setSelection((previous) => {
      const next = new Set(previous);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const handleSelectPage = () => {
    if (!canManageFiles) {
      return;
    }
    setSelection(new Set(files.map((file) => file.id)));
  };

  const handleClearSelection = () => setSelection(new Set());

  const handleDeleteSelected = async () => {
    if (!canManageFiles || !selectedCount) {
      return;
    }
    const ids = Array.from(selection);
    const confirmed = await confirm({
      title: 'Delete selected files?',
      description:
        ids.length === 1
          ? 'Delete the selected file? This action cannot be undone.'
          : `Delete ${ids.length} files? This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!confirmed) {
      return;
    }
    await deleteFilesMutation.mutateAsync(ids);
  };

  const handleDeleteFile = async (file: UploadedFile) => {
    if (!canManageFiles) {
      return;
    }
    const confirmed = await confirm({
      title: 'Delete file?',
      description: `Delete "${file.originalFilename ?? 'this file'}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!confirmed) {
      return;
    }
    await deleteFilesMutation.mutateAsync([file.id]);
  };

  const handleOpen = (file: UploadedFile) => {
    if (!file.publicUrl) {
      notify({ type: 'error', message: 'No public link is available for this file.' });
      return;
    }
    window.open(file.publicUrl, '_blank', 'noopener,noreferrer');
    setMenuFileId(null);
  };

  const handleDownload = (file: UploadedFile) => {
    if (!file.publicUrl) {
      notify({ type: 'error', message: 'No public link is available for this file.' });
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = file.publicUrl;
    anchor.download = file.originalFilename ?? undefined;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setMenuFileId(null);
  };

  const handleCopyLink = async (file: UploadedFile) => {
    if (!file.publicUrl) {
      notify({ type: 'error', message: 'No public link is available to copy.' });
      return;
    }
    try {
      await navigator.clipboard.writeText(file.publicUrl);
      notify({ type: 'success', message: 'Link copied to clipboard.' });
    } catch (error) {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to copy link.') });
    }
    setMenuFileId(null);
  };

  const handleResetFilters = () => {
    setSearchDraft('');
    setSearch('');
    setFileType('');
    setModule('');
    setUploader('');
    setFrom('');
    setTo('');
    setPage(0);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Uploaded files"
        description="Review and reuse the shared media library across modules."
        actions={
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex w-56 flex-col gap-1">
              <span className={filterLabelClass}>Search</span>
              <input
                type="search"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Search by name or URL"
                className={filterInputClass}
              />
            </label>
            <label className="flex w-40 flex-col gap-1">
              <span className={filterLabelClass}>File type</span>
              <select
                value={fileType}
                onChange={(event) => {
                  setFileType(event.target.value);
                  setPage(0);
                }}
                className={filterInputClass}
              >
                {FILE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {moduleOptions.length > 0 && (
              <label className="flex w-52 flex-col gap-1">
                <span className={filterLabelClass}>Module</span>
                <select
                  value={module}
                  onChange={(event) => {
                    setModule(event.target.value);
                    setPage(0);
                  }}
                  className={filterInputClass}
                >
                  <option value="">All modules</option>
                  {moduleOptions.map((option) => (
                    <option key={option.module} value={option.module}>
                      {option.featureName} · {option.contextLabel}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {uploaderOptions.length > 0 && (
              <label className="flex w-48 flex-col gap-1">
                <span className={filterLabelClass}>Uploaded by</span>
                <select
                  value={uploader}
                  onChange={(event) => {
                    const value = event.target.value;
                    setUploader(value ? Number(value) : '');
                    setPage(0);
                  }}
                  className={filterInputClass}
                >
                  <option value="">All users</option>
                  {uploaderOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex w-36 flex-col gap-1">
                <span className={filterLabelClass}>From</span>
                <input
                  type="date"
                  value={from}
                  onChange={(event) => {
                    setFrom(event.target.value);
                    setPage(0);
                  }}
                  className={filterInputClass}
                />
              </label>
              <label className="flex w-36 flex-col gap-1">
                <span className={filterLabelClass}>To</span>
                <input
                  type="date"
                  value={to}
                  onChange={(event) => {
                    setTo(event.target.value);
                    setPage(0);
                  }}
                  className={filterInputClass}
                />
              </label>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
            >
              Reset
            </button>
          </div>
        }
      />

      <PageSection
        padded={false}
        bodyClassName="flex flex-col gap-6 p-4 sm:p-6"
        footer={
          <PaginationControls
            page={page}
            pageSize={size}
            totalElements={totalElements}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={(value: number) => {
              setSize(value);
              setPage(0);
            }}
            isLoading={filesQuery.isLoading}
          />
        }
      >
        {hasSelection && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <span>
              {selectedCount === 1 ? '1 file selected' : `${selectedCount} files selected`}
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSelectPage}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Select page
              </button>
              <button
                type="button"
                onClick={handleClearSelection}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={deleteFilesMutation.isPending}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-400"
              >
                Delete selected
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filesQuery.isLoading
            ? Array.from({ length: size }, (_, index) => (
                <div
                  key={index}
                  className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
                />
              ))
            : files.length > 0
            ? files.map((file) => {
                const selected = selection.has(file.id);
                const cardClasses = [
                  'relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition',
                  canManageFiles ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg' : '',
                  selected ? 'border-primary ring-2 ring-primary/40' : 'border-slate-200 hover:border-primary/40'
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <div
                    key={file.id}
                    className={cardClasses}
                    onClick={canManageFiles ? () => handleToggleSelection(file.id) : undefined}
                    role={canManageFiles ? 'button' : undefined}
                    tabIndex={canManageFiles ? 0 : undefined}
                    onKeyDown={(event) => {
                      if (!canManageFiles) {
                        return;
                      }
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleToggleSelection(file.id);
                      }
                    }}
                  >
                    <div className="relative">
                      {canManageFiles && (
                        <label className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-slate-600 shadow-sm">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => handleToggleSelection(file.id)}
                            onClick={(event) => event.stopPropagation()}
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          Select
                        </label>
                      )}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setMenuFileId((current) => (current === file.id ? null : file.id));
                        }}
                        onMouseDown={(event) => event.stopPropagation()}
                        className="absolute right-3 top-3 rounded-full border border-slate-200 bg-white/90 p-2 text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700"
                        aria-haspopup="menu"
                        aria-expanded={menuFileId === file.id}
                      >
                        <span className="sr-only">Open actions for {file.originalFilename ?? 'file'}</span>
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M10 4a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                        </svg>
                      </button>
                      {menuFileId === file.id && (
                        <div
                          className="absolute right-3 top-12 z-20 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpen(file)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
                          >
                            Open in new tab
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownload(file)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
                          >
                            Download
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(file)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
                          >
                            Copy link
                          </button>
                          {canManageFiles && (
                            <button
                              type="button"
                              onClick={() => handleDeleteFile(file)}
                              disabled={deleteFilesMutation.isPending}
                              className="flex w-full items-center gap-2 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-rose-300"
                            >
                              Delete file
                            </button>
                          )}
                        </div>
                      )}
                      {file.fileType === 'IMAGE' && file.publicUrl ? (
                        <img
                          src={file.publicUrl}
                          alt={file.originalFilename ?? 'Preview'}
                          className="h-48 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-48 w-full items-center justify-center bg-slate-100 text-sm font-semibold uppercase tracking-wide text-slate-500">
                          {file.fileType ?? 'FILE'}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900" title={file.originalFilename ?? undefined}>
                          {file.originalFilename ?? 'Unnamed file'}
                        </p>
                        <p className="text-xs text-slate-500">{file.mimeType ?? 'Unknown type'}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        {file.featureName && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                            {file.featureName}
                            {file.contextLabel ? <span className="text-slate-400">· {file.contextLabel}</span> : null}
                          </span>
                        )}
                        {file.fileType && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">
                            {file.fileType.toLowerCase()}
                          </span>
                        )}
                      </div>
                      <div className="mt-auto space-y-1 text-xs text-slate-500">
                        <p>
                          <span className="font-medium text-slate-600">Uploaded by:</span>{' '}
                          {file.uploadedByName ?? 'Unknown user'}
                        </p>
                        <p>
                          <span className="font-medium text-slate-600">Uploaded on:</span>{' '}
                          {formatUploadedOn(file.uploadedAt)}
                        </p>
                        <p>
                          <span className="font-medium text-slate-600">Size:</span>{' '}
                          {file.sizeBytes ? formatFileSize(file.sizeBytes) : 'Unknown'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            : (
              <div className="col-span-full flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                No files found. Adjust your filters to see more results.
              </div>
            )}
        </div>
      </PageSection>
    </div>
  );
};

export default UploadedFilesPage;
