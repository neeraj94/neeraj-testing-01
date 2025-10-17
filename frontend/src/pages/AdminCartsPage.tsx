import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../services/http';
import type { Cart, CartAdminListItem, CartItem } from '../types/cart';
import type { Pagination } from '../types/models';
import Spinner from '../components/Spinner';
import DataTable from '../components/DataTable';
import PaginationControls from '../components/PaginationControls';
import Button from '../components/Button';
import { extractErrorMessage } from '../utils/errors';
import { formatCurrency } from '../utils/currency';
import { useToast } from '../components/ToastProvider';
import { useAppSelector } from '../app/hooks';
import { selectBaseCurrency } from '../features/settings/selectors';

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const AdminCartsPage = () => {
  const { notify } = useToast();
  const currency = useAppSelector(selectBaseCurrency) ?? 'USD';
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<number, number>>({});
  const [productIdInput, setProductIdInput] = useState('');
  const [variantIdInput, setVariantIdInput] = useState('');
  const [quantityInput, setQuantityInput] = useState('1');

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 250);
    return () => window.clearTimeout(handle);
  }, [searchTerm]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, pageSize]);

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      page: page.toString(),
      size: pageSize.toString()
    };
    if (debouncedSearch) {
      params.search = debouncedSearch;
    }
    return params;
  }, [debouncedSearch, page, pageSize]);

  const cartsQuery = useQuery<Pagination<CartAdminListItem>>({
    queryKey: ['carts', 'admin', queryParams],
    queryFn: async () => {
      const searchParams = new URLSearchParams(queryParams);
      const { data } = await api.get<Pagination<CartAdminListItem>>(`/admin/carts?${searchParams.toString()}`);
      return data;
    }
  });

  const carts = cartsQuery.data?.content ?? [];
  const totalElements = cartsQuery.data?.totalElements ?? 0;

  useEffect(() => {
    if (!carts.length) {
      setSelectedUserId(null);
      return;
    }
    if (!carts.some((cart) => cart.userId === selectedUserId)) {
      setSelectedUserId(carts[0].userId);
    }
  }, [carts, selectedUserId]);

  const cartDetailQuery = useQuery<Cart>({
    queryKey: ['carts', 'admin', 'detail', selectedUserId],
    enabled: selectedUserId != null,
    queryFn: async () => {
      const { data } = await api.get<Cart>(`/admin/carts/${selectedUserId}`);
      return data;
    }
  });

  const createCartMutation = useMutation({
    mutationFn: async () => {
      if (selectedUserId == null) return null;
      const { data } = await api.post<Cart>(`/admin/carts/${selectedUserId}`);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Cart created for the user.' });
      cartDetailQuery.refetch();
      cartsQuery.refetch();
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to create cart.') });
    }
  });

  const addItemMutation = useMutation({
    mutationFn: async () => {
      if (selectedUserId == null) return null;
      const productId = Number(productIdInput);
      const quantity = Number(quantityInput);
      const variantId = variantIdInput ? Number(variantIdInput) : undefined;
      const payload: { productId: number; variantId?: number; quantity: number } = {
        productId,
        quantity
      };
      if (variantId != null && !Number.isNaN(variantId)) {
        payload.variantId = variantId;
      }
      const { data } = await api.post<Cart>(`/admin/carts/${selectedUserId}/items`, payload);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Item added to cart.' });
      setProductIdInput('');
      setVariantIdInput('');
      setQuantityInput('1');
      cartDetailQuery.refetch();
      cartsQuery.refetch();
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to add item to cart.') });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: number; quantity: number }) => {
      if (selectedUserId == null) return null;
      const { data } = await api.patch<Cart>(`/admin/carts/${selectedUserId}/items/${itemId}`, { quantity });
      return data;
    },
    onSuccess: (_, variables) => {
      notify({ type: 'success', message: 'Cart item updated.' });
      setQuantityDrafts((prev) => ({ ...prev, [variables.itemId]: variables.quantity }));
      cartDetailQuery.refetch();
      cartsQuery.refetch();
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to update item.') });
    }
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      if (selectedUserId == null) return null;
      const { data } = await api.delete<Cart>(`/admin/carts/${selectedUserId}/items/${itemId}`);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Item removed from cart.' });
      cartDetailQuery.refetch();
      cartsQuery.refetch();
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to remove item.') });
    }
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      if (selectedUserId == null) return null;
      const { data } = await api.delete<Cart>(`/admin/carts/${selectedUserId}`);
      return data;
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Cart cleared.' });
      cartDetailQuery.refetch();
      cartsQuery.refetch();
    },
    onError: (error) => {
      notify({ type: 'error', message: extractErrorMessage(error, 'Unable to clear cart.') });
    }
  });

  if (cartsQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (cartsQuery.isError) {
    const message = extractErrorMessage(cartsQuery.error, 'Unable to load carts.');
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200 bg-rose-50/80 p-10 text-center shadow">
        <h1 className="text-xl font-semibold text-rose-700">We couldn't load carts</h1>
        <p className="text-sm text-rose-600">{message}</p>
        <div className="flex justify-center">
          <Button onClick={() => cartsQuery.refetch()}>Try again</Button>
        </div>
      </div>
    );
  }

  const hasCarts = carts.length > 0;
  const cartDetail = cartDetailQuery.data;
  const cartItems = cartDetail?.items ?? [];
  const cartSubtotal = cartDetail?.subtotal ?? 0;

  useEffect(() => {
    if (!cartItems.length) {
      setQuantityDrafts({});
      return;
    }
    const drafts: Record<number, number> = {};
    cartItems.forEach((item) => {
      if (item.id != null && item.quantity != null) {
        drafts[item.id] = item.quantity;
      }
    });
    setQuantityDrafts(drafts);
  }, [cartItems]);

  const handleQuantityChange = (item: CartItem, value: string) => {
    const numeric = Number(value);
    setQuantityDrafts((prev) => ({ ...prev, [item.id ?? 0]: Number.isNaN(numeric) ? item.quantity ?? 1 : Math.max(1, numeric) }));
  };

  const handleQuantitySubmit = (item: CartItem) => {
    if (!item.id) return;
    const quantity = quantityDrafts[item.id];
    if (!quantity || quantity <= 0) {
      notify({ type: 'error', message: 'Quantity must be at least 1.' });
      return;
    }
    updateItemMutation.mutate({ itemId: item.id, quantity });
  };

  const handleAddItem = (event: FormEvent) => {
    event.preventDefault();
    if (!productIdInput.trim() || Number.isNaN(Number(productIdInput))) {
      notify({ type: 'error', message: 'Enter a valid product ID.' });
      return;
    }
    if (!quantityInput.trim() || Number.isNaN(Number(quantityInput))) {
      notify({ type: 'error', message: 'Enter a valid quantity.' });
      return;
    }
    addItemMutation.mutate();
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Carts</h1>
        <p className="text-sm text-slate-500">
          Monitor active shopping carts, adjust items, and keep customer baskets in sync with the storefront experience.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <div className="space-y-4">
          <DataTable
            title="Active carts"
            actions={
              <input
                type="search"
                placeholder="Search by customer or product"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            }
          >
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Products</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Quantity</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Subtotal</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Updated</th>
              </tr>
            </thead>
            <tbody>
              {hasCarts ? (
                carts.map((cart) => {
                  const isSelected = cart.userId === selectedUserId;
                  return (
                    <tr
                      key={cart.userId}
                      onClick={() => setSelectedUserId(cart.userId)}
                      className={`cursor-pointer border-t border-slate-200 transition ${
                        isSelected ? 'bg-primary/5 text-primary-900' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-4 py-3 text-sm">
                        <p className="font-semibold text-slate-900">{cart.userName ?? 'Customer'}</p>
                        {cart.userEmail && <p className="text-xs text-slate-500">{cart.userEmail}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <div className="flex flex-wrap gap-2">
                          {cart.products.length ? (
                            cart.products.map((product, index) => (
                              <span
                                key={`${cart.userId}-${product.productId ?? index}`}
                                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                              >
                                {product.productName ?? 'Product'}
                                {product.variantLabel && <span className="text-slate-400">· {product.variantLabel}</span>}
                                {product.quantity != null && <span className="text-slate-400">× {product.quantity}</span>}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">No items</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{cart.totalQuantity}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                        {formatCurrency(cart.subtotal ?? 0, currency)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-500">{formatDateTime(cart.updatedAt)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    No carts are active right now.
                  </td>
                </tr>
              )}
            </tbody>
          </DataTable>

          <PaginationControls
            page={page}
            pageSize={pageSize}
            totalElements={totalElements}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            isLoading={cartsQuery.isFetching}
          />
        </div>

        <div>
          {selectedUserId == null ? (
            <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              Select a customer to manage their cart contents.
            </section>
          ) : cartDetailQuery.isLoading ? (
            <section className="flex min-h-[200px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Spinner />
            </section>
          ) : cartDetailQuery.isError ? (
            <section className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-6 text-sm text-rose-600 shadow-sm">
              <p>{extractErrorMessage(cartDetailQuery.error, 'Unable to load cart details.')}</p>
              <div>
                <Button onClick={() => cartDetailQuery.refetch()} className="px-3 py-2 text-xs font-semibold">
                  Retry
                </Button>
              </div>
            </section>
          ) : (
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Cart details</h2>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {cartItems.length} item{cartItems.length === 1 ? '' : 's'} • {formatCurrency(cartSubtotal ?? 0, currency)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    disabled={createCartMutation.isPending || cartDetail?.id != null}
                    onClick={() => createCartMutation.mutate()}
                    className="px-3 py-2 text-xs"
                  >
                    {createCartMutation.isPending ? 'Creating…' : 'Create cart'}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={clearCartMutation.isPending || !cartItems.length}
                    onClick={() => clearCartMutation.mutate()}
                    className="px-3 py-2 text-xs text-rose-600 hover:text-rose-700"
                  >
                    {clearCartMutation.isPending ? 'Clearing…' : 'Clear cart'}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {cartItems.length ? (
                  cartItems.map((item) => (
                    <div
                      key={item.id ?? `${item.productId}-${item.variantId}`}
                      className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1 text-sm text-slate-700">
                        <p className="font-semibold text-slate-900">{item.productName}</p>
                        {item.variantLabel && <p className="text-xs text-slate-500">Variant: {item.variantLabel}</p>}
                        {item.sku && <p className="text-xs text-slate-400">SKU: {item.sku}</p>}
                        <p className="text-xs text-slate-400">Line total: {formatCurrency(item.lineTotal ?? 0, currency)}</p>
                      </div>
                      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                        <input
                          type="number"
                          min={1}
                          value={quantityDrafts[item.id ?? 0] ?? item.quantity ?? 1}
                          onChange={(event) => handleQuantityChange(item, event.target.value)}
                          className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            disabled={updateItemMutation.isPending}
                            onClick={() => handleQuantitySubmit(item)}
                            className="px-3 py-2 text-xs"
                          >
                            Update
                          </Button>
                          <Button
                            variant="ghost"
                            disabled={removeItemMutation.isPending}
                            onClick={() => item.id && removeItemMutation.mutate(item.id)}
                            className="px-3 py-2 text-xs text-rose-600 hover:text-rose-700"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                    This cart does not have any items yet.
                  </p>
                )}
              </div>

              <form className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={handleAddItem}>
                <h3 className="text-sm font-semibold text-slate-900">Add item</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Product ID
                    <input
                      type="number"
                      value={productIdInput}
                      onChange={(event) => setProductIdInput(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      min={1}
                      required
                    />
                  </label>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Variant ID
                    <input
                      type="number"
                      value={variantIdInput}
                      onChange={(event) => setVariantIdInput(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      min={1}
                    />
                  </label>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Quantity
                    <input
                      type="number"
                      value={quantityInput}
                      onChange={(event) => setQuantityInput(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      min={1}
                      required
                    />
                  </label>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={addItemMutation.isPending} className="px-3 py-2 text-xs">
                    {addItemMutation.isPending ? 'Adding…' : 'Add to cart'}
                  </Button>
                </div>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCartsPage;
