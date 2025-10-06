const DEFAULT_CURRENCY = 'USD';

export const formatCurrency = (
  value: number,
  currency: string | undefined,
  locale?: string
) => {
  const safeCurrency = currency && currency.trim() ? currency.trim().toUpperCase() : DEFAULT_CURRENCY;
  const formatter = new Intl.NumberFormat(locale || undefined, {
    style: 'currency',
    currency: safeCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return formatter.format(Number.isFinite(value) ? value : 0);
};

export const formatCurrencyCompact = (
  value: number,
  currency: string | undefined,
  locale?: string
) => {
  const safeCurrency = currency && currency.trim() ? currency.trim().toUpperCase() : DEFAULT_CURRENCY;
  const formatter = new Intl.NumberFormat(locale || undefined, {
    style: 'currency',
    currency: safeCurrency,
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  });
  return formatter.format(Number.isFinite(value) ? value : 0);
};
