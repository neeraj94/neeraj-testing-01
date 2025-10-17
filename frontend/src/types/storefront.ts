export interface StorefrontProductListItem {
  id: number;
  name: string;
  slug: string;
  brandName?: string | null;
  thumbnailUrl?: string | null;
  unitPrice?: number | null;
  finalPrice?: number | null;
  taxInclusivePrice?: number | null;
  discountAmount?: number | null;
  discountPercentage?: number | null;
  discountType?: 'FLAT' | 'PERCENTAGE' | null;
  averageRating: number;
  reviewCount: number;
  inStock: boolean;
  stockStatus: string;
  hasVariants: boolean;
}

export interface StorefrontFilterValue {
  id?: number | null;
  name: string;
  slug: string;
  productCount: number;
}

export interface StorefrontPriceRange {
  minimum?: number | null;
  maximum?: number | null;
}

export interface StorefrontProductFilters {
  categories: StorefrontFilterValue[];
  brands: StorefrontFilterValue[];
  priceRange?: StorefrontPriceRange | null;
}

export interface StorefrontProductSearchResponse {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  items: StorefrontProductListItem[];
  filters: StorefrontProductFilters;
}
