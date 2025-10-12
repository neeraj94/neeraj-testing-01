import type { Pagination } from './models';
import type { CategoryOption } from './category';

export interface Wedge {
  id: number;
  name: string;
  iconUrl?: string | null;
  shortDescription?: string | null;
  longDescription?: string | null;
  defaultWedge: boolean;
  category?: CategoryOption | null;
  createdAt: string;
  updatedAt: string;
}

export type WedgePage = Pagination<Wedge>;

export interface WedgeIconUploadResponse {
  url: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}
