import { useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react';

export interface StarRatingProps {
  id?: string;
  value: number;
  max?: number;
  min?: number;
  allowHalf?: boolean;
  onChange?: (value: number) => void;
  onHoverChange?: (value: number | null) => void;
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
}

const sizeClasses: Record<NonNullable<StarRatingProps['size']>, string> = {
  sm: 'h-4 w-4 text-base',
  md: 'h-5 w-5 text-lg',
  lg: 'h-6 w-6 text-xl'
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const StarRating = ({
  id,
  value,
  max = 5,
  min = 1,
  allowHalf = false,
  onChange,
  onHoverChange,
  readOnly = false,
  disabled = false,
  className = '',
  size = 'md',
  ariaLabel
}: StarRatingProps) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const step = allowHalf ? 0.5 : 1;
  const clampedValue = clamp(value || 0, min, max);
  const displayValue = hoverValue ?? clampedValue;
  const starClass = sizeClasses[size];

  const announceHover = (next: number | null) => {
    setHoverValue(next);
    onHoverChange?.(next);
  };

  const handleMouseMove = (event: MouseEvent<HTMLButtonElement>, index: number) => {
    if (readOnly || disabled) {
      return;
    }
    if (!allowHalf) {
      announceHover(index + 1);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const offset = event.clientX - rect.left;
    const fraction = offset <= rect.width / 2 ? 0.5 : 1;
    announceHover(index + fraction);
  };

  const handleMouseLeave = () => {
    if (readOnly || disabled) {
      return;
    }
    announceHover(null);
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>, index: number) => {
    if (readOnly || disabled) {
      return;
    }
    let nextValue = index + 1;
    if (allowHalf) {
      const rect = event.currentTarget.getBoundingClientRect();
      const offset = event.clientX - rect.left;
      const fraction = offset <= rect.width / 2 ? 0.5 : 1;
      nextValue = index + fraction;
    }
    const result = clamp(nextValue, min, max);
    onChange?.(result);
    announceHover(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (readOnly || disabled) {
      return;
    }
    let next = clampedValue;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = clamp(clampedValue + step, min, max);
        event.preventDefault();
        onChange?.(next);
        announceHover(null);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = clamp(clampedValue - step, min, max);
        event.preventDefault();
        onChange?.(next);
        announceHover(null);
        break;
      case 'Home':
        event.preventDefault();
        onChange?.(min);
        announceHover(null);
        break;
      case 'End':
        event.preventDefault();
        onChange?.(max);
        announceHover(null);
        break;
      case ' ':
      case 'Enter':
        event.preventDefault();
        onChange?.(hoverValue ?? clampedValue);
        announceHover(null);
        break;
      default:
        break;
    }
  };

  const stars = useMemo(() => Array.from({ length: max }), [max]);

  return (
    <div
      id={id}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(clampedValue * 10) / 10}
      tabIndex={readOnly || disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      className={`inline-flex items-center gap-1 ${readOnly ? 'cursor-default' : 'cursor-pointer'} ${className}`.trim()}
    >
      {stars.map((_, index) => {
        const filledPortion = clamp(displayValue - index, 0, 1);
        const percentage = Math.round(filledPortion * 100);
        return (
          <button
            key={index}
            type="button"
            className={`relative flex ${starClass} items-center justify-center text-slate-300 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              readOnly || disabled ? 'pointer-events-none' : 'hover:text-amber-400 focus-visible:text-amber-400'
            }`.trim()}
            onMouseMove={(event) => handleMouseMove(event, index)}
            onMouseLeave={handleMouseLeave}
            onClick={(event) => handleClick(event, index)}
            aria-hidden
          >
            <span aria-hidden className="pointer-events-none select-none text-current">
              ☆
            </span>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden text-amber-400"
              style={{ width: `${percentage}%` }}
            >
              ★
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
