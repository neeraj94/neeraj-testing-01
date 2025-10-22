import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, createSearchParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { selectBaseCurrency } from '../features/settings/selectors';
import {
  removeCartItem,
  updateCartItem,
  removeGuestItem,
  updateGuestItemQuantity,
  selectCart,
  selectCartSource
} from '../features/cart/cartSlice';
import type { CartItem } from '../types/cart';
import { useToast } from '../components/ToastProvider';
import { formatCurrency } from '../utils/currency';
import { rememberPostLoginRedirect } from '../utils/postLoginRedirect';
import { api } from '../services/http';
import type { CheckoutOrderLine, OrderSummary } from '../types/checkout';
import { extractErrorMessage } from '../utils/errors';

const CartPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { notify } = useToast();
  const cart = useAppSelector(selectCart);
  const source = useAppSelector(selectCartSource);
  const auth = useAppSelector((state) => state.auth);
  const baseCurrency = useAppSelector(selectBaseCurrency);
  const currencyCode = baseCurrency ?? 'USD';
  const isAuthenticatedCart = source === 'authenticated';
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [cartSummary, setCartSummary] = useState<OrderSummary | null>(null);
  const [couponFeedback, setCouponFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const orderLines = useMemo<CheckoutOrderLine[]>(
    () =>
      cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? 0,
        variantId: item.variantId ?? undefined,
        variantSku: item.sku ?? undefined,
        variantLabel: item.variantLabel ?? undefined,
        productSlug: item.productSlug ?? undefined
      })),
    [cart.items]
  );

  const orderLinesKey = useMemo(
    () =>
      orderLines
        .map((line) => `${line.productId ?? 'p'}-${line.variantId ?? 'base'}:${line.quantity}`)
        .join('|'),
    [orderLines]
  );

  const {
    mutate: recalcSummary,
    isPending: summaryPending
  } = useMutation({
    mutationFn: async ({ coupon }: { coupon: string | null }) => {
      const payload = {
        lines: orderLines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: Number(line.unitPrice ?? 0),
          variantId: line.variantId ?? null,
          variantSku: line.variantSku ?? undefined,
          variantLabel: line.variantLabel ?? undefined
        })),
        couponCode: coupon ?? undefined
      };
      const { data } = await api.post<OrderSummary>('/checkout/summary', payload);
      return { data, coupon };
    },
    onSuccess: ({ data, coupon }) => {
      setCartSummary(data);
      const resolvedCode = data.appliedCoupon?.code ?? (coupon ? coupon.toUpperCase() : null);
      setAppliedCoupon(resolvedCode);
      setCouponCode(resolvedCode ?? '');
      setCouponFeedback({
        tone: 'success',
        text: coupon ? 'Coupon applied successfully.' : 'Coupon removed.'
      });
    },
    onError: (error) => {
      setCouponFeedback({
        tone: 'error',
        text: extractErrorMessage(error, 'Unable to update your coupon. Please try again later.')
      });
    }
  });

  useEffect(() => {
    if (!auth.accessToken || auth.portal !== 'client') {
      setCartSummary(null);
      return;
    }
    if (appliedCoupon) {
      recalcSummary({ coupon: appliedCoupon });
    }
  }, [appliedCoupon, auth.accessToken, auth.portal, orderLinesKey, recalcSummary]);

  const summaryTotals = useMemo(() => {
    if (cartSummary) {
      return {
        subtotal: cartSummary.productTotal ?? 0,
        tax: cartSummary.taxTotal ?? 0,
        shipping: cartSummary.shippingTotal ?? 0,
        discount: cartSummary.discountTotal ?? 0,
        total: cartSummary.grandTotal ?? cartSummary.productTotal ?? 0
      };
    }
    return {
      subtotal: cart.subtotal ?? 0,
      tax: null,
      shipping: null,
      discount: null,
      total: cart.subtotal ?? 0
    };
  }, [cart.subtotal, cartSummary]);

  const applyCoupon = () => {
    setCouponFeedback(null);
    const normalized = couponCode.trim().toUpperCase();
    if (!auth.accessToken || auth.portal !== 'client') {
      setCouponFeedback({ tone: 'error', text: 'Sign in to apply coupons to your cart.' });
      return;
    }
    if (!normalized) {
      setCouponFeedback({ tone: 'error', text: 'Enter a coupon code to apply.' });
      return;
    }
    setCouponCode(normalized);
    recalcSummary({ coupon: normalized });
  };

  const removeCoupon = () => {
    setCouponFeedback(null);
    if (!auth.accessToken || auth.portal !== 'client') {
      setCouponFeedback({ tone: 'error', text: 'Sign in to manage coupons.' });
      return;
    }
    recalcSummary({ coupon: null });
  };

  const handleQuantityChange = useCallback(
    (item: CartItem, quantity: number) => {
      const next = Math.max(1, quantity);
      if (isAuthenticatedCart && item.id) {
        dispatch(updateCartItem({ itemId: item.id, quantity: next }))
          .unwrap()
          .catch((error) => {
            notify({
              type: 'error',
              title: 'Unable to update cart',
              message: error instanceof Error ? error.message : String(error)
            });
          });
      } else {
        dispatch(
          updateGuestItemQuantity({
            productId: item.productId,
            variantId: item.variantId ?? null,
            quantity: next
          })
        );
      }
    },
    [dispatch, isAuthenticatedCart, notify]
  );

  const handleRemove = useCallback(
    (item: CartItem) => {
      if (isAuthenticatedCart && item.id) {
        dispatch(removeCartItem({ itemId: item.id }))
          .unwrap()
          .then(() => {
            notify({
              type: 'success',
              title: 'Removed from cart',
              message: `${item.productName} removed.`
            });
          })
          .catch((error) => {
            notify({
              type: 'error',
              title: 'Unable to remove item',
              message: error instanceof Error ? error.message : String(error)
            });
          });
      } else {
        dispatch(removeGuestItem({ productId: item.productId, variantId: item.variantId ?? null }));
        notify({ type: 'success', title: 'Removed from cart', message: `${item.productName} removed.` });
      }
    },
    [dispatch, isAuthenticatedCart, notify]
  );

  const increment = (item: CartItem) => {
    const max = item.availableQuantity ?? Number.MAX_SAFE_INTEGER;
    const next = Math.min(item.quantity + 1, max);
    handleQuantityChange(item, next);
  };

  const decrement = (item: CartItem) => {
    handleQuantityChange(item, Math.max(item.quantity - 1, 1));
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">My Cart</h1>
            <p className="text-sm text-slate-500">
              {cart.totalQuantity > 0
                ? `You have ${cart.totalQuantity} item${cart.totalQuantity === 1 ? '' : 's'} ready to review.`
                : 'Your cart is empty — browse our catalog to find something great.'}
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
          >
            Continue shopping
          </Link>
        </div>
      </header>

      <main className="mx-auto mt-10 max-w-5xl px-6">
        {cart.items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-10 py-16 text-center">
            <h2 className="text-xl font-semibold text-slate-800">Your cart is currently empty</h2>
            <p className="mt-2 text-sm text-slate-500">
              Explore featured collections or search for products to add them to your cart.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/categories"
                className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              >
                Browse categories
              </Link>
              <Link
                to="/coupons"
                className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              >
                View current offers
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
            <section className="space-y-4">
              {cart.items.map((item) => (
                <article
                  key={`${item.productId}-${item.variantId ?? 'base'}`}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:flex-row"
                >
                  <Link
                    to={`/product/${item.productSlug}`}
                    className="flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:w-32"
                  >
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.productName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-slate-500">No image</span>
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <Link to={`/product/${item.productSlug}`} className="text-lg font-semibold text-slate-900">
                            {item.productName}
                          </Link>
                          {item.variantLabel && (
                            <p className="text-sm text-slate-500">Variant: {item.variantLabel}</p>
                          )}
                          {item.sku && <p className="text-xs text-slate-400">SKU: {item.sku}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-slate-900">
                            {formatCurrency(item.unitPrice ?? 0, currencyCode)}
                          </p>
                          <p className="text-xs text-slate-500">Per unit</p>
                        </div>
                      </div>
                      {!item.inStock && (
                        <p className="mt-2 text-sm font-semibold text-rose-600">Currently out of stock.</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center rounded-full border border-slate-200 bg-white">
                        <button
                          type="button"
                          onClick={() => decrement(item)}
                          className="px-3 py-1 text-lg font-semibold text-slate-600 transition hover:text-slate-900"
                          aria-label={`Decrease quantity for ${item.productName}`}
                        >
                          –
                        </button>
                        <span className="min-w-[3rem] text-center text-lg font-semibold text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => increment(item)}
                          className="px-3 py-1 text-lg font-semibold text-slate-600 transition hover:text-slate-900"
                          aria-label={`Increase quantity for ${item.productName}`}
                          disabled={item.availableQuantity != null && item.quantity >= item.availableQuantity}
                        >
                          +
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-slate-900">
                          {formatCurrency(
                            item.lineTotal != null ? item.lineTotal : (item.unitPrice ?? 0) * item.quantity,
                            currencyCode
                          )}
                        </p>
                        {item.availableQuantity != null && (
                          <p className="text-xs text-slate-500">
                            {item.availableQuantity - item.quantity} of this item remaining in stock
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(item)}
                        className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
            <aside className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Order summary</h2>
                <dl className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <dt>Items</dt>
                    <dd>{cart.totalQuantity}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Subtotal</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatCurrency(summaryTotals.subtotal, currencyCode)}
                    </dd>
                  </div>
                  {summaryTotals.tax != null && (
                    <div className="flex items-center justify-between">
                      <dt>Tax</dt>
                      <dd>{formatCurrency(summaryTotals.tax, currencyCode)}</dd>
                    </div>
                  )}
                  {summaryTotals.shipping != null && (
                    <div className="flex items-center justify-between">
                      <dt>Shipping</dt>
                      <dd>{formatCurrency(summaryTotals.shipping, currencyCode)}</dd>
                    </div>
                  )}
                  {summaryTotals.discount != null && summaryTotals.discount > 0 && (
                    <div className="flex items-center justify-between text-emerald-600">
                      <dt>Discount</dt>
                      <dd>-{formatCurrency(summaryTotals.discount, currencyCode)}</dd>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
                    <dt>Total</dt>
                    <dd>{formatCurrency(summaryTotals.total, currencyCode)}</dd>
                  </div>
                </dl>
                <div className="mt-6 rounded-xl bg-slate-50 p-4">
                  <label className="text-sm font-semibold text-slate-700" htmlFor="cart-coupon-code">
                    Coupon code
                  </label>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      id="cart-coupon-code"
                      type="text"
                      value={couponCode}
                      onChange={(event) => {
                        setCouponCode(event.target.value);
                        setCouponFeedback(null);
                      }}
                      placeholder="Enter code"
                      className="w-full rounded-full border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none"
                      disabled={summaryPending || cart.items.length === 0}
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={summaryPending || cart.items.length === 0}
                    >
                      {summaryPending ? 'Applying…' : 'Apply'}
                    </button>
                    {appliedCoupon && (
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={summaryPending}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {appliedCoupon && cartSummary?.appliedCoupon && (
                    <p className="mt-2 text-xs text-emerald-600">
                      Savings: {formatCurrency(cartSummary.appliedCoupon.discountAmount ?? summaryTotals.discount ?? 0, currencyCode)}
                    </p>
                  )}
                  {couponFeedback && (
                    <p
                      className={`mt-2 text-xs ${
                        couponFeedback.tone === 'success' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {couponFeedback.text}
                    </p>
                  )}
                  {!auth.accessToken && (
                    <p className="mt-2 text-xs text-slate-500">Sign in during checkout to apply coupons.</p>
                  )}
                </div>
                <button
                  type="button"
                  className="mt-6 w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={cart.items.length === 0}
                  onClick={() => {
                    if (!auth.accessToken || auth.portal !== 'client') {
                      rememberPostLoginRedirect('/checkout', '/cart');
                      navigate(
                        {
                          pathname: '/login',
                          search: createSearchParams({ redirect: '/checkout', fallback: '/cart' }).toString()
                        },
                        { state: { from: '/checkout', fallback: '/cart' } }
                      );
                      return;
                    }
                    navigate('/checkout');
                  }}
                >
                  Proceed to checkout
                </button>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5 text-sm text-slate-600">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Helpful tips</h3>
                <ul className="mt-3 space-y-2">
                  <li>Items remain reserved for 30 minutes once you begin checkout.</li>
                  <li>Need a custom quote? Contact our support team any time.</li>
                </ul>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};

export default CartPage;
