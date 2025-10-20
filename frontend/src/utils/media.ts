import { api } from '../services/http';

const WINDOW_ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';

const apiOrigin = (() => {
  const base = api.defaults.baseURL;
  if (!base) {
    return WINDOW_ORIGIN;
  }
  try {
    const resolved = new URL(base, WINDOW_ORIGIN || 'http://localhost');
    return resolved.origin;
  } catch (error) {
    if (WINDOW_ORIGIN) {
      try {
        return new URL(base, WINDOW_ORIGIN).origin;
      } catch (nestedError) {
        return WINDOW_ORIGIN;
      }
    }
    return '';
  }
})();

export const resolveMediaUrl = (value?: string | null): string | null => {
  if (value == null) {
    return null;
  }
  const trimmed = `${value}`.trim();
  if (!trimmed) {
    return null;
  }
  if (/^(data|blob):/i.test(trimmed)) {
    return trimmed;
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
    return `${protocol}${trimmed}`;
  }
  if (!apiOrigin) {
    if (trimmed.startsWith('/')) {
      return trimmed;
    }
    return `/${trimmed}`;
  }
  try {
    const base = apiOrigin.endsWith('/') ? apiOrigin : `${apiOrigin}/`;
    return new URL(trimmed, base).toString();
  } catch (error) {
    if (trimmed.startsWith('/')) {
      return `${apiOrigin}${trimmed}`;
    }
    return `${apiOrigin}/${trimmed}`;
  }
};

const imageExtensionRegex = /\.(avif|bmp|gif|heic|heif|ico|jpeg|jpg|png|svg|tif|tiff|webp)(?:$|\?)/i;

export const isProbablyImage = (mimeType?: string | null, source?: string | null): boolean => {
  if (mimeType) {
    const normalized = mimeType.trim().toLowerCase();
    if (!normalized) {
      return true;
    }
    if (
      normalized.startsWith('image/') ||
      normalized === 'application/octet-stream' ||
      normalized === 'binary/octet-stream'
    ) {
      return true;
    }
    if (normalized.includes('jpeg') || normalized.includes('jpg') || normalized.includes('png')) {
      return true;
    }
    if (normalized.includes('webp') || normalized.includes('gif') || normalized.includes('bmp')) {
      return true;
    }
    if (normalized.includes('svg') || normalized.includes('heic') || normalized.includes('heif')) {
      return true;
    }
  }

  if (source) {
    const trimmed = source.trim();
    if (!trimmed) {
      return !mimeType;
    }
    if (/^data:image\//i.test(trimmed) || /^blob:/i.test(trimmed)) {
      return true;
    }
    if (imageExtensionRegex.test(trimmed)) {
      return true;
    }
  }

  return !mimeType;
};
