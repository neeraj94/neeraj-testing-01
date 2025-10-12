import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 50, 100];

const FILE_TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'IMAGE', label: 'Images' },
  { value: 'VIDEO', label: 'Videos' },
  { value: 'AUDIO', label: 'Audio' },
  { value: 'DOCUMENT', label: 'Documents' }
];

const UploadedFilesPage = () => {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [fileType, setFileType] = useState('');
  const [module, setModule] = useState('');
  const [uploader, setUploader] = useState<number | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<UploadedFile | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

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

  const files = filesQuery.data?.content ?? [];
  const totalElements = filesQuery.data?.totalElements ?? 0;

  useEffect(() => {
    if (!selected && files.length > 0) {
      setSelected(files[0]);
    }
  }, [files, selected]);

  const moduleOptions = useMemo(() => moduleQuery.data ?? [], [moduleQuery.data]);
  const uploaderOptions = useMemo(() => uploaderQuery.data ?? [], [uploaderQuery.data]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Uploaded files"
        description="Review every asset uploaded across the system, filter by module, and reuse files as needed."
      />
      <PageSection bodyClassName="flex flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-wrap gap-4">
            <div className="flex flex-col">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="uploaded-files-search">
                Search
              </label>
              <input
                id="uploaded-files-search"
                type="search"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Search by file name or URL"
                className="mt-1 w-56 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">File type</label>
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
            {moduleOptions.length > 0 && (
              <div className="flex flex-col">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Module</label>
                <select
                  value={module}
                  onChange={(event) => {
                    setModule(event.target.value);
                    setPage(0);
                  }}
                  className="mt-1 w-52 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">All modules</option>
                  {moduleOptions.map((option) => (
                    <option key={option.module} value={option.module}>
                      {option.featureName} · {option.contextLabel}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {uploaderOptions.length > 0 && (
              <div className="flex flex-col">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Uploaded by</label>
                <select
                  value={uploader}
                  onChange={(event) => {
                    const value = event.target.value;
                    setUploader(value ? Number(value) : '');
                    setPage(0);
                  }}
                  className="mt-1 w-52 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">From</label>
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
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">To</label>
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
        <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">File</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Module</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Uploaded</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Size</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
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
                        className={`cursor-pointer transition hover:bg-blue-50/40 ${selected?.id === file.id ? 'bg-blue-50/60' : ''}`}
                        onClick={() => setSelected(file)}
                      >
                        <td className="px-4 py-3">
                          {file.fileType === 'IMAGE' && file.publicUrl ? (
                            <img
                              src={file.publicUrl}
                              alt={file.originalFilename ?? 'Preview'}
                              className="h-12 w-12 rounded-lg border border-slate-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-500">
                              {file.fileType ?? 'FILE'}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800">{file.originalFilename ?? 'Unnamed file'}</span>
                            <span className="text-xs text-slate-500">{file.mimeType ?? 'Unknown type'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {file.featureName ? (
                            <span>
                              {file.featureName}
                              {file.contextLabel ? ` · ${file.contextLabel}` : ''}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col text-slate-600">
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
                        <td className="px-4 py-3 text-right text-slate-600">
                          {file.sizeBytes ? formatFileSize(file.sizeBytes) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {file.publicUrl ? (
                            <div className="flex flex-wrap justify-end gap-2">
                              <a
                                href={file.publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                              >
                                Open
                              </a>
                              <a
                                href={file.publicUrl}
                                download={file.originalFilename ?? undefined}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                              >
                                Download
                              </a>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">No link</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                        No files found. Adjust your filters to see more results.
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
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={(value: number) => {
                  setSize(value);
                  setPage(0);
                }}
              />
            </div>
          </div>
          <aside className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Details</h2>
            {selected ? (
              <div className="flex flex-col gap-4">
                {selected.fileType === 'IMAGE' && selected.publicUrl ? (
                  <img
                    src={selected.publicUrl}
                    alt={selected.originalFilename ?? 'Preview'}
                    className="max-h-60 w-full rounded-lg border border-slate-200 object-contain"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">
                    {selected.originalFilename ?? 'No preview available'}
                  </div>
                )}
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p>
                    <span className="font-medium text-slate-900">File:</span> {selected.originalFilename ?? 'Unnamed file'}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Type:</span> {selected.mimeType ?? 'Unknown'}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Module:</span>{' '}
                    {selected.featureName ? (
                      <span>
                        {selected.featureName}
                        {selected.contextLabel ? ` · ${selected.contextLabel}` : ''}
                      </span>
                    ) : (
                      '—'
                    )}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Size:</span>{' '}
                    {selected.sizeBytes ? formatFileSize(selected.sizeBytes) : 'Unknown'}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Uploaded by:</span> {selected.uploadedByName ?? 'Unknown user'}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Uploaded on:</span>{' '}
                    {new Intl.DateTimeFormat(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }).format(new Date(selected.uploadedAt))}
                  </p>
                </div>
                {selected.publicUrl && (
                  <div className="flex flex-col gap-2">
                    <a
                      href={selected.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Open in new tab
                    </a>
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <p className="break-all">{selected.publicUrl}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Select an uploaded file to inspect its metadata and reuse it elsewhere.</p>
            )}
          </aside>
        </div>
      </PageSection>
    </div>
  );
};

export default UploadedFilesPage;
