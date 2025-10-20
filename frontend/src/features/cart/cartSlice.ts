import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../services/http';
import type { Cart, CartItem, GuestCartLine } from '../../types/cart';
import type { RootState } from '../../app/store';
import { safeLocalStorage } from '../../utils/storage';

const guestCartKey = 'rbac.guestCart';

interface CartState {
  source: 'guest' | 'authenticated';
  cart: Cart;
  guestItems: GuestCartLine[];
  status: 'idle' | 'loading' | 'error';
  error?: string;
  syncing: boolean;
}

const emptyCart = (): Cart => ({ id: null, items: [], subtotal: 0, totalQuantity: 0, updatedAt: null });

const loadGuestItems = (): GuestCartLine[] => {
  const raw = safeLocalStorage.getItem(guestCartKey);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as GuestCartLine[];
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item?.productId === 'number' && typeof item?.quantity === 'number');
    }
  } catch (error) {
    console.warn('Unable to parse guest cart from storage', error);
  }
  return [];
};

const persistGuestItems = (items: GuestCartLine[]) => {
  if (!items || items.length === 0) {
    safeLocalStorage.removeItem(guestCartKey);
    return;
  }
  safeLocalStorage.setItem(guestCartKey, JSON.stringify(items));
};

const buildCartFromGuest = (items: GuestCartLine[]): Cart => {
  const cartItems: CartItem[] = items.map((item) => {
    const available = item.availableQuantity ?? null;
    const quantity = available != null ? Math.min(item.quantity, available) : item.quantity;
    const unitPrice = Number(item.unitPrice ?? 0);
    const lineTotal = Number((unitPrice * quantity).toFixed(2));
    return {
      id: undefined,
      productId: item.productId,
      productName: item.productName,
      productSlug: item.productSlug,
      sku: item.sku,
      variantId: item.variantId ?? null,
      variantLabel: item.variantLabel,
      quantity,
      availableQuantity: available,
      inStock: available == null ? true : available > 0,
      unitPrice,
      lineTotal,
      thumbnailUrl: item.thumbnailUrl ?? null
    };
  });
  const subtotal = Number(
    cartItems.reduce((total, current) => total + (current.lineTotal ?? 0), 0).toFixed(2)
  );
  const totalQuantity = cartItems.reduce((total, current) => total + (current.quantity ?? 0), 0);
  return {
    id: null,
    items: cartItems,
    subtotal,
    totalQuantity,
    updatedAt: null
  };
};

const initialGuestItems = loadGuestItems();

const initialState: CartState = {
  source: 'guest',
  cart: buildCartFromGuest(initialGuestItems),
  guestItems: initialGuestItems,
  status: 'idle',
  syncing: false
};

export const fetchCart = createAsyncThunk<Cart>('cart/fetch', async () => {
  const { data } = await api.get<Cart>('/cart');
  return data;
});

export const addCartItem = createAsyncThunk<Cart, { productId: number; variantId?: number | null; quantity: number }>(
  'cart/addItem',
  async (payload) => {
    const { data } = await api.post<Cart>('/cart/items', payload);
    return data;
  }
);

export const updateCartItem = createAsyncThunk<Cart, { itemId: number; quantity: number }>(
  'cart/updateItem',
  async ({ itemId, quantity }) => {
    const { data } = await api.put<Cart>(`/cart/items/${itemId}`, { quantity });
    return data;
  }
);

export const removeCartItem = createAsyncThunk<Cart, { itemId: number }>(
  'cart/removeItem',
  async ({ itemId }) => {
    const { data } = await api.delete<Cart>(`/cart/items/${itemId}`);
    return data;
  }
);

type SyncGuestCartResult = { cart: Cart; cleared: boolean };

export const syncGuestCart = createAsyncThunk<SyncGuestCartResult, void, { state: RootState }>(
  'cart/syncGuest',
  async (_, { getState }) => {
    const state = getState();
    const guestItems = state.cart.guestItems;
    if (!state.auth.user) {
      return { cart: state.cart.cart, cleared: false };
    }
    if (!guestItems || guestItems.length === 0) {
      const { data } = await api.get<Cart>('/cart');
      return { cart: data, cleared: false };
    }
    const payload = {
      items: guestItems.map((item) => ({
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: item.quantity
      }))
    };
    const { data } = await api.post<Cart>('/cart/merge', payload);
    return { cart: data, cleared: true };
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    initializeCart(state) {
      state.guestItems = loadGuestItems();
      state.cart = buildCartFromGuest(state.guestItems);
      state.source = 'guest';
    },
    addGuestItem(state, action: PayloadAction<GuestCartLine>) {
      const payload = action.payload;
      const existing = state.guestItems.find(
        (item) =>
          item.productId === payload.productId &&
          (item.variantId ?? null) === (payload.variantId ?? null)
      );
      const available = payload.availableQuantity ?? existing?.availableQuantity ?? null;
      if (existing) {
        const nextQuantity = existing.quantity + payload.quantity;
        existing.quantity = available != null ? Math.min(nextQuantity, available) : nextQuantity;
        existing.productName = payload.productName;
        existing.productSlug = payload.productSlug;
        existing.sku = payload.sku;
        existing.variantLabel = payload.variantLabel;
        existing.unitPrice = payload.unitPrice;
        existing.thumbnailUrl = payload.thumbnailUrl;
        existing.availableQuantity = available ?? undefined;
      } else {
        state.guestItems.push({
          ...payload,
          quantity: available != null ? Math.min(payload.quantity, available) : payload.quantity,
          availableQuantity: available ?? undefined
        });
      }
      persistGuestItems(state.guestItems);
      state.cart = buildCartFromGuest(state.guestItems);
      state.source = 'guest';
    },
    updateGuestItemQuantity(
      state,
      action: PayloadAction<{ productId: number; variantId?: number | null; quantity: number }>
    ) {
      const { productId, variantId, quantity } = action.payload;
      const target = state.guestItems.find(
        (item) => item.productId === productId && (item.variantId ?? null) === (variantId ?? null)
      );
      if (!target) {
        return;
      }
      const available = target.availableQuantity ?? null;
      const nextQuantity = available != null ? Math.min(Math.max(quantity, 1), available) : Math.max(quantity, 1);
      target.quantity = nextQuantity;
      persistGuestItems(state.guestItems);
      state.cart = buildCartFromGuest(state.guestItems);
    },
    removeGuestItem(state, action: PayloadAction<{ productId: number; variantId?: number | null }>) {
      const { productId, variantId } = action.payload;
      state.guestItems = state.guestItems.filter(
        (item) => !(item.productId === productId && (item.variantId ?? null) === (variantId ?? null))
      );
      persistGuestItems(state.guestItems);
      state.cart = buildCartFromGuest(state.guestItems);
    },
    clearGuestCart(state) {
      state.guestItems = [];
      persistGuestItems(state.guestItems);
      state.cart = buildCartFromGuest(state.guestItems);
    },
    resetCart(state) {
      state.cart = emptyCart();
      state.status = 'idle';
      state.error = undefined;
      state.source = 'guest';
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => {
        state.status = 'loading';
        state.error = undefined;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.status = 'idle';
        state.source = 'authenticated';
        state.cart = action.payload;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message;
      })
      .addCase(addCartItem.pending, (state) => {
        state.status = 'loading';
        state.error = undefined;
      })
      .addCase(addCartItem.fulfilled, (state, action) => {
        state.status = 'idle';
        state.source = 'authenticated';
        state.cart = action.payload;
      })
      .addCase(addCartItem.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message;
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.status = 'idle';
        state.source = 'authenticated';
        state.cart = action.payload;
      })
      .addCase(updateCartItem.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message;
      })
      .addCase(removeCartItem.fulfilled, (state, action) => {
        state.status = 'idle';
        state.source = 'authenticated';
        state.cart = action.payload;
      })
      .addCase(removeCartItem.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message;
      })
      .addCase(syncGuestCart.pending, (state) => {
        state.syncing = true;
      })
      .addCase(syncGuestCart.fulfilled, (state, action) => {
        state.syncing = false;
        state.source = 'authenticated';
        state.cart = action.payload.cart;
        if (action.payload.cleared) {
          state.guestItems = [];
          persistGuestItems(state.guestItems);
        }
      })
      .addCase(syncGuestCart.rejected, (state, action) => {
        state.syncing = false;
        state.error = action.error.message;
      });
  }
});

export const {
  initializeCart,
  addGuestItem,
  updateGuestItemQuantity,
  removeGuestItem,
  clearGuestCart,
  resetCart
} = cartSlice.actions;

export const selectCart = (state: RootState) => state.cart.cart;
export const selectCartItems = (state: RootState) => state.cart.cart.items;
export const selectCartSource = (state: RootState) => state.cart.source;
export const selectCartCount = (state: RootState) => state.cart.cart.totalQuantity;
export const selectGuestCartItems = (state: RootState) => state.cart.guestItems;

export default cartSlice.reducer;
