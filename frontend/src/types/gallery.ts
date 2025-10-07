import type { Pagination } from './models';

export interface GalleryFile {
  id: number;
  displayName: string;
  originalFilename: string;
  extension: string;
  mimeType?: string | null;
  sizeBytes: number;
  uploadedAt: string;
  uploadedById?: number | null;
  uploadedByName?: string | null;
  uploadedByEmail?: string | null;
  folderId?: number | null;
  folderPath: string;
}

export interface GalleryFolder {
  id: number | null;
  name: string;
  path: string;
  parentId: number | null;
  root: boolean;
}

export type GalleryFilePage = Pagination<GalleryFile>;
