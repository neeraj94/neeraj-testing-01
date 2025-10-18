import { Fragment, useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '../app/hooks';
import {
  addItemToUserCart,
  clearUserCart,
  fetchAdminCarts,
  fetchUserCartByAdmin,
  removeCartItem,
  updateCartItemQuantity
} from '../services/adminCarts';
import type { AdminAddCartItemPayload, AdminCartSummary, Cart } from '../types/cart';
import type { Pagination } from '../types/models';
import Spinner from '../components/Spinner';
import { formatCurrency } from '../utils/currency';
import { selectBaseCurrency } from '../features/settings/selectors';
import PaginationControls from '../components/PaginationControls';
import Button from '../components/Button';
import { extractErrorMessage } from '../utils/errors';
import { useToast } from '../components/ToastProvider';

const formatTimestamp = (value?: string | null) => {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
};

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'NEWEST', label: 'Newest first' },
  { value: 'OLDEST', label: 'Oldest first' },
  { value: 'HIGHEST_AMOUNT', label: 'Highest amount' },
  { value: 'LOWEST_AMOUNT', label: 'Lowest amount' }
];

const AdminCartsPage = () => {
  const baseCurrency = useAppSelector(selectBaseCurrency);
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<string>('NEWEST');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearchTerm(searchDraft.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchDraft]);

  useEffect(() => {
    setPage(0);
  }, [pageSize, sortOption]);

  const cartsQuery = useQuery<Pagination<AdminCartSummary>, Error>({
    queryKey: ['admin', 'carts', page, pageSize, searchTerm, sortOption] as const,
    queryFn: () =>
      fetchAdminCarts({
        page,
        size: pageSize,
        search: searchTerm,
        sort: sortOption
      }),
    placeholderData: keepPreviousData
  });

  const carts: AdminCartSummary[] = cartsQuery.data?.content ?? [];

  useEffect(() => {
    if (!carts.length) {
      setSelectedUserId(null);
      return;
    }
    if (selectedUserId == null || !carts.some((cart) => cart.userId === selectedUserId)) {
      setSelectedUserId(carts[0].userId);
    }
  }, [carts, selectedUserId]);

  const cartDetailQuery = useQuery<Cart>({
    queryKey: ['admin', 'carts', 'detail', selectedUserId],
    enabled: selectedUserId != null,
    queryFn: async () => {
      if (!selectedUserId) {
        throw new Error('No user selected');
      }
      return fetchUserCartByAdmin(selectedUserId);
    }
  });

  const invalidateCarts = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'carts'] });
    if (selectedUserId != null) {
      queryClient.invalidateQueries({ queryKey: ['admin', 'carts', 'detail', selectedUserId] });
    }
  };

  const addItemMutation = useMutation({
    mutationFn: async (payload: AdminAddCartItemPayload) => {
      if (selectedUserId == null) {
        throw new Error('No cart selected');
      }
      return addItemToUserCart(selectedUserId, payload);
    },
    onSuccess: () => {
      notify({ title: 'Item added', message: 'The product was added to the cart.', type: 'success' });
      invalidateCarts();
    },
    onError: (error) => {
      notify({
        title: 'Unable to add item',
        message: extractErrorMessage(error, 'Try again later.'),
        type: 'error'
      });
    }
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: number; quantity: number }) => {
      if (selectedUserId == null) {
        throw new Error('No cart selected');
      }
      return updateCartItemQuantity(selectedUserId, itemId, { quantity });
    },
    onSuccess: () => {
      notify({ title: 'Cart updated', message: 'The item quantity was updated.', type: 'success' });
      invalidateCarts();
    },
    onError: (error) => {
      notify({
        title: 'Unable to update item',
        message: extractErrorMessage(error, 'Try again later.'),
        type: 'error'
      });
    }
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      if (selectedUserId == null) {
        throw new Error('No cart selected');
      }
      return removeCartItem(selectedUserId, itemId);
    },
    onSuccess: () => {
      notify({ title: 'Item removed', message: 'The product was removed from the cart.', type: 'success' });
      invalidateCarts();
    },
    onError: (error) => {
      notify({
        title: 'Unable to remove item',
        message: extractErrorMessage(error, 'Try again later.'),
        type: 'error'
      });
    }
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      if (selectedUserId == null) {
        throw new Error('No cart selected');
      }
      return clearUserCart(selectedUserId);
    },
    onSuccess: () => {
      notify({ title: 'Cart cleared', message: 'All items were removed from the cart.', type: 'success' });
      invalidateCarts();
    },
    onError: (error) => {
      notify({
        title: 'Unable to clear cart',
        message: extractErrorMessage(error, 'Try again later.'),
        type: 'error'
      });
    }
  });

  const isMutating =
    addItemMutation.isPending ||
    updateQuantityMutation.isPending ||
    removeItemMutation.isPending ||
    clearCartMutation.isPending;

  const selection = useMemo(() => carts.find((cart) => cart.userId === selectedUserId) ?? null, [carts, selectedUserId]);

  const handleAddItem = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const productId = Number(form.get('productId'));
    const quantity = Number(form.get('quantity'));
    const variantIdValue = form.get('variantId');
    const variantId = variantIdValue ? Number(variantIdValue) : undefined;

    if (!Number.isFinite(productId) || productId <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
      notify({
        title: 'Invalid item details',
        message: 'Enter a product ID and quantity greater than zero.',
        type: 'error'
      });
      return;
    }

    addItemMutation.mutate({ productId, quantity, variantId: variantId ?? undefined });
    event.currentTarget.reset();
  };

  const renderTableBody = () => {
    if (cartsQuery.isLoading) {
      return (
        <tr>
          <td colSpan={6} className="px-6 py-10 text-center">
            <Spinner />
          </td>
        </tr>
      );
    }

    if (cartsQuery.isError) {
      return (
        <tr>
          <td colSpan={6} className="px-6 py-6 text-center text-sm text-rose-600">
            {extractErrorMessage(cartsQuery.error, 'Unable to load carts.')}
          </td>
        </tr>
      );
    }

    if (!carts.length) {
      return (
        <tr>
          <td colSpan={6} className="px-6 py-6 text-center text-sm text-slate-500">
            No carts with active items were found.
          </td>
        </tr>
      );
    }

    return carts.map((cart) => {
      const isSelected = cart.userId === selectedUserId;
      const primaryItem = cart.items[0];
      const additionalCount = Math.max(cart.items.length - 1, 0);

      return (
        <tr
          key={cart.cartId}
          className={`cursor-pointer transition ${
            isSelected ? 'bg-primary/5' : 'hover:bg-slate-50'
          }`}
          onClick={() => setSelectedUserId(cart.userId)}
        >
          <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-800">
            <div>{cart.userName}</div>
            <div className="text-xs text-slate-500">{cart.userEmail}</div>
          </td>
          <td className="px-6 py-4 text-sm text-slate-600">
            {primaryItem ? (
              <div className="space-y-1">
                <div className="font-medium text-slate-800">{primaryItem.productName}</div>
                {primaryItem.variantLabel && (
                  <div className="text-xs uppercase tracking-wide text-slate-400">{primaryItem.variantLabel}</div>
                )}
                {additionalCount > 0 && (
                  <div className="text-xs text-slate-500">+{additionalCount} more item(s)</div>
                )}
              </div>
            ) : (
              <span>—</span>
            )}
          </td>
          <td className="px-6 py-4 text-sm font-semibold text-slate-800">{cart.totalQuantity}</td>
          <td className="px-6 py-4 text-sm font-semibold text-slate-800">
            {formatCurrency(cart.subtotal ?? 0, baseCurrency)}
          </td>
          <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">{formatTimestamp(cart.updatedAt)}</td>
          <td className="px-6 py-4 text-sm">
            <Button
              onClick={(event) => {
                event.stopPropagation();
                setSelectedUserId(cart.userId);
              }}
              variant={isSelected ? 'primary' : 'ghost'}
              className="px-3 py-1.5 text-xs font-semibold"
            >
              {isSelected ? 'Selected' : 'Manage'}
            </Button>
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">Carts</h1>
          <p className="text-sm text-slate-500">
            Monitor customer carts, adjust quantities, and keep storefront sessions in sync with administrative updates.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search customers or products"
              className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-64"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
              🔍
            </span>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Sort
            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),360px]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Product(s)</th>
                  <th className="px-6 py-3">Quantity</th>
                  <th className="px-6 py-3">Subtotal</th>
                  <th className="px-6 py-3">Updated</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">{renderTableBody()}</tbody>
            </table>
          </div>
          <PaginationControls
            page={page}
            pageSize={pageSize}
            totalElements={cartsQuery.data?.totalElements ?? 0}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            isLoading={cartsQuery.isFetching}
            prefix={
              <span className="hidden sm:inline">Sorted by {SORT_OPTIONS.find((option) => option.value === sortOption)?.label}</span>
            }
          />
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Cart details</h2>
              <p className="text-sm text-slate-500">
                Adjust quantities, remove items, or clear the cart. Changes are reflected immediately for the customer.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {selection ? selection.items.length : 0} items
            </span>
          </header>

          {selectedUserId == null ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              Select a cart to manage its contents.
            </div>
          ) : cartDetailQuery.isLoading ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <Spinner />
            </div>
          ) : cartDetailQuery.isError ? (
            <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-600">
              <p>{extractErrorMessage(cartDetailQuery.error, 'Unable to load the selected cart.')}</p>
              <Button onClick={() => cartDetailQuery.refetch()} className="px-3 py-1.5 text-xs font-semibold">
                Retry
              </Button>
            </div>
          ) : cartDetailQuery.data ? (
            <Fragment>
              <div className="space-y-3">
                {cartDetailQuery.data.items.length ? (
                  cartDetailQuery.data.items.map((item) => (
                    <div key={item.id ?? `${item.productId}-${item.variantId ?? 'none'}`}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-slate-900">{item.productName}</div>
                          {item.variantLabel && (
                            <div className="text-xs uppercase tracking-wide text-slate-400">{item.variantLabel}</div>
                          )}
                          {item.sku && <div className="text-xs text-slate-400">SKU: {item.sku}</div>}
                        </div>
                        <div className="text-right text-sm font-semibold text-slate-900">
                          {formatCurrency(item.lineTotal ?? 0, baseCurrency)}
                        </div>
                      </div>
                      <form
                        className="mt-4 flex flex-wrap items-center gap-3 text-sm"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const form = new FormData(event.currentTarget);
                          const quantity = Number(form.get('quantity'));
                          if (!Number.isFinite(quantity) || quantity <= 0) {
                            notify({
                              title: 'Invalid quantity',
                              message: 'Quantity must be greater than zero.',
                              type: 'error'
                            });
                            return;
                          }
                          if (item.id == null) {
                            notify({
                              title: 'Unable to update item',
                              message: 'Missing item identifier.',
                              type: 'error'
                            });
                            return;
                          }
                          updateQuantityMutation.mutate({ itemId: item.id, quantity });
                        }}
                      >
                        <label className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quantity</span>
                          <input
                            type="number"
                            name="quantity"
                            defaultValue={item.quantity}
                            min={1}
                            className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="submit"
                            disabled={isMutating}
                            className="px-3 py-1.5 text-xs font-semibold"
                          >
                            Update
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={isMutating}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700"
                            onClick={() => {
                              if (item.id == null) {
                                notify({
                                  title: 'Unable to remove item',
                                  message: 'Missing item identifier.',
                                  type: 'error'
                                });
                                return;
                              }
                              removeItemMutation.mutate(item.id);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </form>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                    This cart has no items. Add a product below to start a basket for the customer.
                  </div>
                )}
              </div>

              <form onSubmit={handleAddItem} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-800">Add item</h3>
                <p className="text-xs text-slate-500">
                  Specify the product identifier, optional variant, and quantity to insert into the customer cart.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Product ID
                    <input
                      name="productId"
                      type="number"
                      min={1}
                      required
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Variant ID
                    <input
                      name="variantId"
                      type="number"
                      min={1}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Quantity
                    <input
                      name="quantity"
                      type="number"
                      min={1}
                      defaultValue={1}
                      required
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isMutating} className="px-3 py-1.5 text-xs font-semibold">
                    Add to cart
                  </Button>
                </div>
              </form>

              <div className="flex justify-between">
                <div className="text-sm text-slate-500">
                  Subtotal:{' '}
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(cartDetailQuery.data.subtotal ?? 0, baseCurrency)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  disabled={isMutating || cartDetailQuery.data.items.length === 0}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700"
                  onClick={() => clearCartMutation.mutate()}
                >
                  Clear cart
                </Button>
              </div>
            </Fragment>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default AdminCartsPage;
