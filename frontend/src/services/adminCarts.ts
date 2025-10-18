import api from './http';
import type {
  AdminAddCartItemPayload,
  AdminCartSummary,
  AdminUpdateCartItemPayload,
  Cart
} from '../types/cart';
import type { Pagination } from '../types/models';

export const fetchAdminCarts = async ({
  page,
  size,
  search,
  sort
}: {
  page: number;
  size: number;
  search?: string;
  sort?: string;
}): Promise<Pagination<AdminCartSummary>> => {
  const { data } = await api.get<Pagination<AdminCartSummary>>('/admin/carts', {
    params: {
      page,
      size,
      search: search?.trim() || undefined,
      sort: sort || undefined
    }
  });
  return data;
};

export const fetchUserCartByAdmin = async (userId: number): Promise<Cart> => {
  const { data } = await api.get<Cart>(`/users/${userId}/cart`);
  return data;
};

export const addItemToUserCart = async (userId: number, payload: AdminAddCartItemPayload): Promise<Cart> => {
  const { data } = await api.post<Cart>(`/users/${userId}/cart/items`, payload);
  return data;
};

export const updateCartItemQuantity = async (
  userId: number,
  itemId: number,
  payload: AdminUpdateCartItemPayload
): Promise<Cart> => {
  const { data } = await api.patch<Cart>(`/users/${userId}/cart/items/${itemId}`, payload);
  return data;
};

export const removeCartItem = async (userId: number, itemId: number): Promise<Cart> => {
  const { data } = await api.delete<Cart>(`/users/${userId}/cart/items/${itemId}`);
  return data;
};

export const clearUserCart = async (userId: number): Promise<Cart> => {
  const { data } = await api.delete<Cart>(`/users/${userId}/cart`);
  return data;
};
