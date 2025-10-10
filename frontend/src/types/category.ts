import type { Pagination } from './models';

export type CategoryType = 'PHYSICAL' | 'DIGITAL';

export interface Category {
  id: number;
  name: string;
  slug: string;
  type: CategoryType;
  parentId: number | null;
  parentName?: string | null;
  orderNumber: number | null;
  bannerUrl?: string | null;
  iconUrl?: string | null;
  coverUrl?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  metaCanonicalUrl?: string | null;
  metaRobots?: string | null;
  metaOgTitle?: string | null;
  metaOgDescription?: string | null;
  metaOgImage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CategoryPage = Pagination<Category>;

export interface CategoryOption {
  id: number;
  name: string;
  type: CategoryType;
}

export interface CategoryAssetUploadResponse {
  type: string;
  url: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}
