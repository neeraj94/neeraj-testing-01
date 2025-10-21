import { adminApi } from './http';
import type { AddCartItemPayload, AdminCartSummary, Cart, UpdateCartItemPayload } from '../types/cart';
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
  const { data } = await adminApi.get<Pagination<AdminCartSummary>>('/carts', {
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
  const { data } = await adminApi.get<Cart>(`/users/${userId}/cart`);
  return data;
};

export const addItemToUserCart = async (userId: number, payload: AddCartItemPayload): Promise<Cart> => {
  const { data } = await adminApi.post<Cart>(`/users/${userId}/cart/items`, payload);
  return data;
};

export const updateCartItemQuantity = async (
  userId: number,
  itemId: number,
  payload: UpdateCartItemPayload
): Promise<Cart> => {
  const { data } = await adminApi.patch<Cart>(`/users/${userId}/cart/items/${itemId}`, payload);
  return data;
};

export const removeCartItem = async (userId: number, itemId: number): Promise<Cart> => {
  const { data } = await adminApi.delete<Cart>(`/users/${userId}/cart/items/${itemId}`);
  return data;
};

export const clearUserCart = async (userId: number): Promise<Cart> => {
  const { data } = await adminApi.delete<Cart>(`/users/${userId}/cart`);
  return data;
};
