import type { Pagination } from './models';

export interface UploadedFile {
  id: number;
  module: string | null;
  featureName: string | null;
  contextLabel: string | null;
  storageKey?: string | null;
  publicUrl?: string | null;
  originalFilename?: string | null;
  mimeType?: string | null;
  fileType?: string | null;
  sizeBytes?: number | null;
  uploadedById?: number | null;
  uploadedByName?: string | null;
  uploadedAt: string;
}

export type UploadedFilePage = Pagination<UploadedFile>;

export interface UploadedFileModuleOption {
  module: string;
  featureName: string;
  contextLabel: string;
}

export interface UploadedFileUploaderOption {
  id: number;
  name: string;
}

export interface MediaSelection {
  url: string;
  storageKey?: string | null;
  originalFilename?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
}
