const FALLBACK_COLOR = '#2563EB';

export const normalizeHexColor = (value?: string | null, fallback = FALLBACK_COLOR): string => {
  if (!value) {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  const prefixed = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const upper = prefixed.toUpperCase();
  return /^#[0-9A-F]{6}$/.test(upper) ? upper : fallback;
};

export const hexToRgbTuple = (hex: string): [number, number, number] => {
  const normalized = normalizeHexColor(hex);
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return [r, g, b];
};

export const applyPrimaryColor = (hex: string) => {
  const normalized = normalizeHexColor(hex);
  const [r, g, b] = hexToRgbTuple(normalized);
  const root = document.documentElement;
  root.style.setProperty('--color-primary', `${r} ${g} ${b}`);
  root.style.setProperty('--color-primary-hex', normalized);
};
