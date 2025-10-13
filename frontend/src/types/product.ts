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
}
