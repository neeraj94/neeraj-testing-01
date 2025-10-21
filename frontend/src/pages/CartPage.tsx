import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
                      {formatCurrency(cart.subtotal ?? 0, currencyCode)}
                    </dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="mt-6 w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={cart.items.length === 0}
                  onClick={() => {
                    if (!auth.accessToken || auth.portal !== 'client') {
                      navigate('/login', { state: { from: '/checkout' } });
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
