import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { isProbablyImage, resolveMediaUrl } from '../utils/media';

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

  const sanitizedSrc = useMemo(() => resolveMediaUrl(src ?? null), [src]);
  const canRenderImage = useMemo(() => isProbablyImage(mimeType, sanitizedSrc), [mimeType, sanitizedSrc]);

  useEffect(() => {
    setHasError(false);
  }, [sanitizedSrc, canRenderImage]);

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

  const shouldRenderImage = Boolean(sanitizedSrc && !hasError && canRenderImage);

  return (
    <div className={containerClass} style={style}>
      {shouldRenderImage ? (
        <img
          key={sanitizedSrc ?? 'image-preview'}
          src={sanitizedSrc ?? undefined}
          alt={alt}
          className={`h-full w-full ${objectClass} object-center`}
          loading="lazy"
          onError={() => setHasError(true)}
          onLoad={() => setHasError(false)}
          draggable={false}
        />
      ) : (
        renderFallback()
      )}
      {children}
    </div>
  );
};

export default ImagePreview;
