import type { Pagination } from './models';

export interface BadgeCategoryOption {
  id: number;
  title: string;
}

export interface BadgeCategory {
  id: number;
  title: string;
  description?: string | null;
  iconUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Badge {
  id: number;
  name: string;
  iconUrl?: string | null;
  shortDescription?: string | null;
  longDescription?: string | null;
  defaultBadge: boolean;
  badgeCategory?: BadgeCategoryOption | null;
  createdAt: string;
  updatedAt: string;
}

export type BadgePage = Pagination<Badge>;
export type BadgeCategoryPage = Pagination<BadgeCategory>;

export interface BadgeIconUploadResponse {
  url: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface BadgeCategoryUploadResponse {
  url: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}
