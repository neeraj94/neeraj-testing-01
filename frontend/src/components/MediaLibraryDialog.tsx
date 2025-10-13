import { Fragment, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/http';
import type {
  MediaSelection,
  UploadedFile,
  UploadedFileModuleOption,
  UploadedFilePage,
  UploadedFileUploaderOption
} from '../types/uploaded-file';
import PaginationControls from './PaginationControls';
import { formatFileSize } from '../utils/files';

interface MediaLibraryDialogProps {
  open: boolean;
  onClose: () => void;
  moduleFilters?: string[];
  title?: string;
  onSelect: (selection: MediaSelection) => void;
  onUpload?: (file: File) => Promise<MediaSelection>;
}

const FILE_TYPE_OPTIONS = [
  { value: '', label: 'All file types' },
  { value: 'IMAGE', label: 'Images' },
  { value: 'VIDEO', label: 'Videos' },
  { value: 'AUDIO', label: 'Audio' },
  { value: 'DOCUMENT', label: 'Documents' }
];

const MediaLibraryDialog = ({
  open,
  onClose,
  moduleFilters,
  title = 'Uploaded files',
  onSelect,
  onUpload
}: MediaLibraryDialogProps) => {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(12);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [fileType, setFileType] = useState('');
  const [module, setModule] = useState<string>('');
  const [uploader, setUploader] = useState<number | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(0);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [searchDraft]);

  useEffect(() => {
    if (open) {
      setSelectedPreview(null);
      if (moduleFilters && moduleFilters.length === 1) {
        setModule(moduleFilters[0]);
      } else if (!moduleFilters || moduleFilters.length === 0) {
        setModule('');
      }
    } else {
      setSearchDraft('');
      setSearch('');
      setFileType('');
      setModule('');
      setUploader('');
      setFrom('');
      setTo('');
      setPage(0);
    }
  }, [open, moduleFilters]);

  const { data: moduleOptions } = useQuery<UploadedFileModuleOption[]>({
    queryKey: ['uploaded-files', 'modules'],
    queryFn: async () => {
      const { data } = await api.get<UploadedFileModuleOption[]>('/uploaded-files/modules');
      return data;
    },
    enabled: open
  });

  const { data: uploaderOptions } = useQuery<UploadedFileUploaderOption[]>({
    queryKey: ['uploaded-files', 'uploaders'],
    queryFn: async () => {
      const { data } = await api.get<UploadedFileUploaderOption[]>('/uploaded-files/uploaders');
      return data;
    },
    enabled: open
  });

  const filesQuery = useQuery<UploadedFilePage>({
    queryKey: [
      'uploaded-files',
      {
        page,
        size,
        search,
        fileType,
        module,
        uploader,
        from,
        to
      }
    ],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size };
      if (search) params.search = search;
      if (module) {
        params.module = [module];
      }
      if (fileType) params.fileType = fileType;
      if (uploader) params.uploadedBy = uploader;
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await api.get<UploadedFilePage>('/uploaded-files', { params });
      return data;
    },
    enabled: open
  });

  const files = filesQuery.data?.content ?? [];
  const totalElements = filesQuery.data?.totalElements ?? 0;

  const moduleFilterOptions = useMemo(() => moduleOptions ?? [], [moduleOptions]);

  const handleFilePick = (file: UploadedFile) => {
    if (!file.publicUrl) {
      return;
    }
    onSelect({
      url: file.publicUrl,
      storageKey: file.storageKey,
      originalFilename: file.originalFilename,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes ?? undefined
    });
    onClose();
  };

  const handleUploadClick = () => {
    if (!onUpload) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!onUpload) {
      return;
    }
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      setUploading(true);
      const result = await onUpload(file);
      await filesQuery.refetch();
      onSelect(result);
      onClose();
    } catch (error) {
      // errors handled by caller toast
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const dialogContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8">
      <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500">Browse previously uploaded files or add a new one.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onUpload && (
              <Fragment>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={handleUploadClick}
                  disabled={uploading}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploading ? 'Uploading…' : 'Upload new'}
                </button>
              </Fragment>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        </header>
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-wrap items-end gap-3">
            <div className="flex flex-1 flex-col">
              <label htmlFor="media-library-search" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Search
              </label>
              <input
                id="media-library-search"
                type="search"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Search file names"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">File type</label>
              <select
                value={fileType}
                onChange={(event) => {
                  setFileType(event.target.value);
                  setPage(0);
                }}
                className="mt-1 w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {FILE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {moduleFilterOptions.length > 0 && (
              <div className="flex flex-col">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Module</label>
                <select
                  value={module}
                  onChange={(event) => {
                    setModule(event.target.value);
                    setPage(0);
                  }}
                  className="mt-1 w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">All modules</option>
                  {moduleFilterOptions.map((option) => (
                    <option key={option.module} value={option.module}>
                      {option.featureName} · {option.contextLabel}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {uploaderOptions && uploaderOptions.length > 0 && (
              <div className="flex flex-col">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Uploaded by</label>
                <select
                  value={uploader}
                  onChange={(event) => {
                    const value = event.target.value;
                    setUploader(value ? Number(value) : '');
                    setPage(0);
                  }}
                  className="mt-1 w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">All users</option>
                  {uploaderOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">From</label>
              <input
                type="date"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPage(0);
                }}
                className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">To</label>
              <input
                type="date"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setPage(0);
                }}
                className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>
        <div className="grid flex-1 gap-4 overflow-hidden px-6 py-4 md:grid-cols-[2fr,1fr]">
          <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200">
            <div className="flex-1 overflow-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">File</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Module</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Uploaded</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Size</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filesQuery.isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                        Loading files…
                      </td>
                    </tr>
                  ) : files.length > 0 ? (
                    files.map((file) => (
                      <tr
                        key={file.id}
                        className="cursor-pointer transition hover:bg-blue-50/40"
                        onClick={() => {
                          setSelectedPreview(file);
                        }}
                      >
                        <td className="px-4 py-3">
                          {file.fileType === 'IMAGE' && file.publicUrl ? (
                            <img
                              src={file.publicUrl}
                              alt={file.originalFilename ?? 'Preview'}
                              className="h-12 w-12 rounded-md border border-slate-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-400">
                              {file.fileType ?? 'FILE'}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800">
                              {file.originalFilename ?? 'Unnamed file'}
                            </span>
                            <span className="text-xs text-slate-500">{file.mimeType ?? 'Unknown type'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {file.featureName ? (
                            <span>
                              {file.featureName}
                              {file.contextLabel ? ` · ${file.contextLabel}` : ''}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          <div className="flex flex-col">
                            <span>{file.uploadedByName ?? 'Unknown user'}</span>
                            <span className="text-xs text-slate-500">
                              {new Intl.DateTimeFormat(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }).format(new Date(file.uploadedAt))}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600">
                          {file.sizeBytes ? formatFileSize(file.sizeBytes) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleFilePick(file);
                            }}
                            className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
                          >
                            Use
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                        No files found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-200 px-4 py-3">
              <PaginationControls
                page={page}
                pageSize={size}
                totalElements={totalElements}
                onPageChange={setPage}
                onPageSizeChange={(value: number) => {
                  setSize(value);
                  setPage(0);
                }}
              />
            </div>
          </div>
          <aside className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-800">Preview</h3>
            {selectedPreview ? (
              <div className="flex flex-col gap-3">
                {selectedPreview.fileType === 'IMAGE' && selectedPreview.publicUrl ? (
                  <img
                    src={selectedPreview.publicUrl}
                    alt={selectedPreview.originalFilename ?? 'Preview'}
                    className="max-h-60 w-full rounded-lg border border-slate-200 object-contain"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">
                    {selectedPreview.originalFilename ?? 'No preview available'}
                  </div>
                )}
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">{selectedPreview.originalFilename ?? 'Unnamed file'}</p>
                  <p>Type: {selectedPreview.mimeType ?? 'Unknown'}</p>
                  <p>Size: {selectedPreview.sizeBytes ? formatFileSize(selectedPreview.sizeBytes) : 'Unknown'}</p>
                  <p>Uploaded by: {selectedPreview.uploadedByName ?? 'Unknown user'}</p>
                  <p>
                    Uploaded on:{' '}
                    {new Intl.DateTimeFormat(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }).format(new Date(selectedPreview.uploadedAt))}
                  </p>
                </div>
                {selectedPreview.publicUrl && (
                  <div className="flex gap-2">
                    <a
                      href={selectedPreview.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Open in new tab
                    </a>
                    <button
                      type="button"
                      onClick={() => handleFilePick(selectedPreview)}
                      className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600"
                    >
                      Use file
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Select a row to see more details.</p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );

  if (!open) {
    return null;
  }

  return createPortal(dialogContent, document.body);
};

export default MediaLibraryDialog;
