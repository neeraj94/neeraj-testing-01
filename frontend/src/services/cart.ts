import api from './http';
import type { AddCartItemPayload, Cart, UpdateCartItemPayload } from '../types/cart';

export const fetchOwnCart = async (): Promise<Cart> => {
  const { data } = await api.get<Cart>('/cart');
  return data;
};

export const addItemToOwnCart = async (payload: AddCartItemPayload): Promise<Cart> => {
  const { data } = await api.post<Cart>('/cart/items', payload);
  return data;
};

export const updateOwnCartItem = async (
  itemId: number,
  payload: UpdateCartItemPayload
): Promise<Cart> => {
  const { data } = await api.put<Cart>(`/cart/items/${itemId}`, payload);
  return data;
};

export const removeOwnCartItem = async (itemId: number): Promise<Cart> => {
  const { data } = await api.delete<Cart>(`/cart/items/${itemId}`);
  return data;
};

export const clearOwnCart = async (): Promise<Cart> => {
  const { data } = await api.delete<Cart>('/cart');
  return data;
};
