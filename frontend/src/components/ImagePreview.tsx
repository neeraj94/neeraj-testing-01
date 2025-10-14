import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';

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

  const sanitizedSrc = useMemo(() => {
    if (!src) {
      return null;
    }
    const trimmed = `${src}`.trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
      return trimmed;
    }
    try {
      return encodeURI(trimmed);
    } catch (error) {
      return trimmed.replace(/\s+/g, (match) => (match ? '%20' : match));
    }
  }, [src]);

  useEffect(() => {
    setHasError(false);
  }, [sanitizedSrc, mimeType]);

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
      {sanitizedSrc && !hasError ? (
        <img
          key={sanitizedSrc}
          src={sanitizedSrc}
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
