import type { Pagination } from './models';

export interface Brand {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
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

export type BrandPage = Pagination<Brand>;

export interface BrandLogoUploadResponse {
  url: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PublicBrand {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
}
