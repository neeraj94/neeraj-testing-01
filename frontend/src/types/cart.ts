export interface CartItem {
  id?: number | null;
  productId: number;
  productName: string;
  productSlug: string;
  sku?: string | null;
  variantId?: number | null;
  variantLabel?: string | null;
  quantity: number;
  availableQuantity?: number | null;
  inStock: boolean;
  unitPrice: number;
  lineTotal: number;
  thumbnailUrl?: string | null;
}

export interface Cart {
  id?: number | null;
  items: CartItem[];
  totalQuantity: number;
  subtotal: number;
  updatedAt?: string | null;
}

export interface GuestCartLine {
  productId: number;
  productName: string;
  productSlug: string;
  sku?: string | null;
  variantId?: number | null;
  variantLabel?: string | null;
  quantity: number;
  availableQuantity?: number | null;
  unitPrice: number;
  thumbnailUrl?: string | null;
}

export interface MergeCartPayload {
  items: Array<{
    productId: number;
    variantId?: number | null;
    quantity: number;
  }>;
}
