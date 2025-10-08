import type { Pagination } from './models';

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPost {
  id: number;
  categoryId: number;
  categoryName: string;
  title: string;
  slug: string;
  description: string;
  bannerImage?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  metaImage?: string | null;
  published: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicBlogPost {
  title: string;
  slug: string;
  description: string;
  bannerImage?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  metaImage?: string | null;
  category: string;
  publishedAt?: string | null;
}

export interface BlogMediaUploadResponse {
  key: string;
  url: string;
}

export type BlogCategoryPage = Pagination<BlogCategory>;
export type BlogPostPage = Pagination<BlogPost>;
export type PublicBlogPostPage = Pagination<PublicBlogPost>;
