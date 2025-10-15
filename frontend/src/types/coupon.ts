import type { Pagination } from './models';
import type { DiscountType } from './product';
import type { MediaSelection } from './uploaded-file';

export type CouponType = 'PRODUCT' | 'CART_VALUE' | 'NEW_SIGNUP';

export type CouponStatus = 'ENABLED' | 'DISABLED';

export type CouponState = 'ENABLED' | 'DISABLED' | 'EXPIRED';

export interface CouponProductSummary {
  id: number;
  name: string;
  sku?: string | null;
  imageUrl?: string | null;
}

export interface CouponCategorySummary {
  id: number;
  name: string;
  imageUrl?: string | null;
}

export interface CouponUserSummary {
  id: number;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
}

export interface CouponSummary {
  id: number;
  name: string;
  code: string;
  type: CouponType;
  shortDescription?: string | null;
  longDescription?: string | null;
  discountType: DiscountType;
  discountValue: number;
  minimumCartValue?: number | null;
  startDate: string;
  endDate: string;
  status: CouponStatus;
  state: CouponState;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  applyToAllNewUsers: boolean;
  productCount: number;
  categoryCount: number;
  userCount: number;
}

export type CouponPage = Pagination<CouponSummary>;

export interface CouponDetail extends CouponSummary {
  products: CouponProductSummary[];
  categories: CouponCategorySummary[];
  users: CouponUserSummary[];
}

export interface SaveCouponPayload {
  type: CouponType;
  name: string;
  code: string;
  shortDescription?: string;
  longDescription?: string;
  discountType: DiscountType;
  discountValue: number;
  minimumCartValue?: number | null;
  startDate: string;
  endDate: string;
  status: CouponStatus;
  imageUrl?: string | null;
  productIds?: number[];
  categoryIds?: number[];
  userIds?: number[];
  applyToAllNewUsers?: boolean;
}

export interface CouponFormState {
  type: CouponType;
  name: string;
  code: string;
  shortDescription: string;
  longDescription: string;
  discountType: DiscountType;
  discountValue: string;
  minimumCartValue: string;
  startDate: string;
  endDate: string;
  status: CouponStatus;
  applyToAllNewUsers: boolean;
  productIds: number[];
  categoryIds: number[];
  userIds: number[];
  image: MediaSelection | null;
  imageUrl: string;
}

export interface PublicCoupon {
  id: number;
  type: CouponType;
  name: string;
  code: string;
  shortDescription?: string | null;
  longDescription?: string | null;
  discountType: DiscountType;
  discountValue: number;
  minimumCartValue?: number | null;
  startDate: string;
  endDate: string;
  imageUrl?: string | null;
  applyToAllNewUsers: boolean;
  products: CouponProductSummary[];
  categories: CouponCategorySummary[];
}

export type PublicCouponPage = Pagination<PublicCoupon>;
