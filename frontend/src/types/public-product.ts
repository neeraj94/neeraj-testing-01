import type { DiscountType, ProductMediaAsset } from './product';

export interface PublicProductDetail {
  id: number;
  name: string;
  slug: string;
  brandName?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  primaryImage?: ProductMediaAsset | null;
  gallery: ProductMediaAsset[];
  pricing: PublicProductPricing;
  stock: PublicProductStock;
  minPurchaseQuantity?: number | null;
  maxPurchaseQuantity?: number | null;
  sku: string;
  categoryNames: string[];
  offers: PublicProductOffer[];
  variantAttributes: PublicProductVariantAttribute[];
  variants: PublicProductVariant[];
  expandableSections: PublicProductSection[];
  infoSections: PublicProductSection[];
  reviewSummary: PublicProductReviewSummary;
  reviews: PublicProductReview[];
  wedges: PublicProductWedge[];
  frequentlyBought: PublicProductRecommendation[];
  recentlyViewed: PublicProductRecommendation[];
}

export interface PublicProductPricing {
  unitPrice: number | null;
  finalPrice: number | null;
  discountAmount: number | null;
  discountType: DiscountType | null;
  discountValue: number | null;
  discountPercentage: number | null;
}

export interface PublicProductStock {
  inStock: boolean;
  availableQuantity: number | null;
  statusLabel: string;
}

export interface PublicProductOffer {
  id: number;
  name: string;
  code: string;
  shortDescription?: string | null;
  discountType: DiscountType;
  discountValue: number;
  minimumCartValue?: number | null;
  startDate: string;
  endDate: string;
  imageUrl?: string | null;
}

export interface PublicProductVariantAttribute {
  attributeId: number;
  attributeName: string;
  displayType: 'swatch' | 'choice' | string;
  values: PublicProductVariantAttributeValue[];
}

export interface PublicProductVariantAttributeValue {
  id: number;
  label: string;
  swatchColor?: string | null;
}

export interface PublicProductVariant {
  id: number;
  key: string;
  sku: string;
  quantity: number | null;
  inStock: boolean;
  priceAdjustment: number | null;
  finalPrice: number | null;
  selections: PublicProductVariantSelection[];
  media: ProductMediaAsset[];
}

export interface PublicProductVariantSelection {
  attributeId: number;
  attributeName: string;
  valueId: number;
  value: string;
}

export interface PublicProductSection {
  title?: string | null;
  content?: string | null;
  bulletPoints: string[];
}

export interface PublicProductReviewSummary {
  averageRating: number;
  totalReviews: number;
}

export interface PublicProductReview {
  id: number;
  reviewerName: string;
  customerAddress?: string | null;
  rating: number;
  comment?: string | null;
  reviewedAt: string;
  reviewerAvatar?: ProductMediaAsset | null;
  media: ProductMediaAsset[];
}

export interface PublicProductWedge {
  id: number;
  name: string;
  iconUrl?: string | null;
  shortDescription?: string | null;
}

export interface PublicProductRecommendation {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
  originalPrice: number | null;
  finalPrice: number | null;
}

export interface PublicProductSuggestion {
  id: number;
  name: string;
  slug: string;
  thumbnailUrl?: string | null;
}
