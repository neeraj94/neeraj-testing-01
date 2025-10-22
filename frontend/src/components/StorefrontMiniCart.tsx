import { Link } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';
import { selectCart } from '../features/cart/cartSlice';
import { selectBaseCurrency } from '../features/settings/selectors';
import { formatCurrency } from '../utils/currency';

interface StorefrontMiniCartProps {
  open: boolean;
  onClose?: () => void;
}

const StorefrontMiniCart = ({ open, onClose }: StorefrontMiniCartProps) => {
  const cart = useAppSelector(selectCart);
  const baseCurrency = useAppSelector(selectBaseCurrency) ?? 'USD';

  if (!open) {
    return null;
  }

  const formatMoney = (value?: number | null) =>
    value == null ? null : formatCurrency(Number(value), baseCurrency);

  const subtotal = formatMoney(cart?.subtotal ?? 0) ?? formatMoney(0);

  return (
    <div
      className="absolute right-0 top-full mt-3 w-80 origin-top-right rounded-3xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl shadow-slate-900/10 ring-1 ring-black/5"
      role="dialog"
      aria-label="Cart preview"
      onMouseLeave={onClose}
    >
      <div className="flex items-center justify-between pb-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">Mini Cart</h3>
        <span className="text-xs text-slate-500">Subtotal</span>
      </div>
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-base font-semibold text-slate-900">{subtotal}</p>
        <Link
          to="/cart"
          onClick={onClose}
          className="text-xs font-semibold uppercase tracking-wide text-primary transition hover:text-primary/80"
        >
          View Cart
        </Link>
      </div>
      <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
        {cart?.items?.length ? (
          cart.items.map((item) => {
            const price = formatMoney(item.lineTotal ?? item.unitPrice ?? 0);
            return (
              <Link
                key={`${item.productId}-${item.variantId ?? 'base'}`}
                to={item.productSlug ? `/product/${item.productSlug}` : '/cart'}
                onClick={onClose}
                className="group flex items-center gap-3 rounded-2xl border border-transparent bg-slate-50/60 p-3 text-sm transition hover:border-primary/30 hover:bg-white"
              >
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.productName}
                    className="h-14 w-14 rounded-2xl object-cover shadow-sm transition group-hover:shadow"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xs font-semibold text-slate-500">
                    No Image
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 transition group-hover:text-primary">
                    {item.productName}
                  </p>
                  {item.variantLabel ? (
                    <p className="text-xs text-slate-500">{item.variantLabel}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-500">
                    Qty {item.quantity}
                    {price ? <span className="ml-2 font-semibold text-slate-700">{price}</span> : null}
                  </p>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
            Your cart is empty. Start exploring our catalog!
          </div>
        )}
      </div>
      <Link
        to={cart?.items?.length ? '/checkout' : '/cart'}
        onClick={onClose}
        className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-primary/30 transition hover:bg-primary/90"
      >
        {cart?.items?.length ? 'Checkout' : 'Start Shopping'}
      </Link>
    </div>
  );
};

export default StorefrontMiniCart;
