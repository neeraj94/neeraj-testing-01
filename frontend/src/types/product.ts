import type { Pagination } from './models';
import type { MediaSelection } from './uploaded-file';

export type DiscountType = 'FLAT' | 'PERCENTAGE';

export type StockVisibilityState = 'SHOW_QUANTITY' | 'SHOW_TEXT' | 'HIDE';

export interface SelectedAttributePayload {
  attributeId: number;
  valueIds: number[];
}

export interface CreateProductVariantPayload {
  key: string;
  attributeValueIds: number[];
  priceAdjustment: number | null;
  sku: string;
  quantity: number | null;
  media: MediaSelection[];
}

export interface CreateProductPayload {
  name: string;
  brandId: number | null;
  unit: string;
  weightKg: number | null;
  minPurchaseQuantity: number | null;
  taxRateIds: number[];
  categoryIds: number[];
  featured: boolean;
  todaysDeal: boolean;
  description: string;
  shortDescription: string;
  gallery: MediaSelection[];
  thumbnail?: MediaSelection | null;
  videoProvider: string;
  videoUrl: string;
  pdfSpecification?: MediaSelection | null;
  seo: {
    title: string;
    description: string;
    image?: MediaSelection | null;
    keywords: string;
    canonicalUrl: string;
  };
  pricing: {
    unitPrice: number | null;
    discountType: DiscountType;
    discountValue: number | null;
    discountMinQuantity: number | null;
    discountMaxQuantity: number | null;
    priceTag: string;
    stockQuantity: number | null;
    sku: string;
    externalLink: string;
    externalLinkButton: string;
    lowStockWarning: number | null;
    stockVisibility: StockVisibilityState;
  };
  attributes: SelectedAttributePayload[];
  variants: CreateProductVariantPayload[];
  expandableSections: { title: string; content: string }[];
}

export interface ProductMediaAsset {
  url: string;
  storageKey?: string | null;
  originalFilename?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

export interface ProductSummary {
  id: number;
  name: string;
  unit: string;
  unitPrice?: number | null;
  sku: string;
  featured: boolean;
  todaysDeal: boolean;
  brandName?: string | null;
  categoryCount: number;
  variantCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ProductSummaryPage = Pagination<ProductSummary>;

export interface ProductDetailAttributeValue {
  id: number;
  value: string;
  sortOrder: number | null;
}

export interface ProductDetailAttribute {
  attributeId: number;
  attributeName: string;
  values: ProductDetailAttributeValue[];
}

export interface ProductDetailVariantValue {
  attributeId: number;
  attributeName: string;
  valueId: number;
  value: string;
}

export interface ProductDetailVariant {
  id: number;
  key: string;
  priceAdjustment: number | null;
  sku: string;
  quantity: number | null;
  values: ProductDetailVariantValue[];
  media: ProductMediaAsset[];
}

export interface ProductDetailPricing {
  unitPrice: number | null;
  discountType: DiscountType;
  discountValue: number | null;
  discountMinQuantity: number | null;
  discountMaxQuantity: number | null;
  priceTag: string;
  stockQuantity: number | null;
  sku: string;
  externalLink: string;
  externalLinkButton: string;
  lowStockWarning: number | null;
  stockVisibility: StockVisibilityState;
}

export interface ProductDetailSeo {
  title: string;
  description: string;
  image?: ProductMediaAsset | null;
  keywords: string;
  canonicalUrl: string;
}

export interface ProductDetail {
  id: number;
  name: string;
  brand: { id: number; name: string; logoUrl?: string | null } | null;
  unit: string;
  weightKg: number | null;
  minPurchaseQuantity: number | null;
  featured: boolean;
  todaysDeal: boolean;
  description: string;
  shortDescription: string;
  videoProvider: string;
  videoUrl: string;
  gallery: ProductMediaAsset[];
  thumbnail?: ProductMediaAsset | null;
  pdfSpecification?: ProductMediaAsset | null;
  seo: ProductDetailSeo;
  categories: { id: number; name: string }[];
  taxRates: { id: number; name: string; rateType: string; rateValue: number | null }[];
  attributes: ProductDetailAttribute[];
  pricing: ProductDetailPricing;
  variants: ProductDetailVariant[];
  expandableSections: { title: string; content: string }[];
  createdAt: string;
  updatedAt: string;
}
