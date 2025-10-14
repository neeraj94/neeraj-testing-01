import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|bmp|webp|svg)$/i;

export interface ImagePreviewProps {
  src?: string | null;
  alt?: string;
  mode?: 'cover' | 'contain';
  className?: string;
  aspectClassName?: string;
  mimeType?: string | null;
  width?: number | string;
  height?: number | string;
  fallback?: ReactNode;
  children?: ReactNode;
}

const ImagePreview = ({
  src,
  alt = '',
  mode = 'cover',
  className = '',
  aspectClassName = 'aspect-square',
  mimeType,
  width,
  height,
  fallback,
  children
}: ImagePreviewProps) => {
  const style: CSSProperties = {};
  if (width != null) {
    style.width = typeof width === 'number' ? `${width}px` : width;
  }
  if (height != null) {
    style.height = typeof height === 'number' ? `${height}px` : height;
  }

  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src, mimeType]);

  const isExplicitlyNonImage = useMemo(() => {
    if (!src) {
      return false;
    }
    if (mimeType) {
      const normalizedMime = mimeType.toLowerCase();
      if (normalizedMime.startsWith('image/')) {
        return false;
      }
      if (normalizedMime === 'application/octet-stream' || normalizedMime === 'binary/octet-stream') {
        return false;
      }
      return true;
    }
    const normalized = src.trim().toLowerCase();
    if (normalized.startsWith('data:')) {
      if (normalized.startsWith('data:image')) {
        return false;
      }
      return true;
    }
    if (normalized.startsWith('blob:')) {
      return false;
    }
    const cleanSrc = src.split('?')[0] ?? '';
    if (IMAGE_EXTENSIONS.test(cleanSrc)) {
      return false;
    }
    return false;
  }, [src, mimeType]);

  const renderFallback = () =>
    fallback ?? (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs font-medium text-slate-400">
        No preview
      </div>
    );

  const containerClass = ['relative overflow-hidden', aspectClassName, className]
    .filter(Boolean)
    .join(' ')
    .trim();

  const objectClass = mode === 'contain' ? 'object-contain' : 'object-cover';

  return (
    <div className={containerClass} style={style}>
      {src && !isExplicitlyNonImage && !hasError ? (
        <img
          src={src}
          alt={alt}
          className={`h-full w-full ${objectClass} object-center`}
          onError={() => setHasError(true)}
          onLoad={() => setHasError(false)}
        />
      ) : (
        renderFallback()
      )}
      {children}
    </div>
  );
};

export default ImagePreview;
