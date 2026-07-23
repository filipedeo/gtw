import React from 'react';
import { cn } from '../../lib/cn';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  /** Overrides the default active-segment classes (e.g. semantic tones). */
  activeClassName?: string;
  /** Overrides the default inactive-segment classes. */
  inactiveClassName?: string;
}

export interface SegmentedControlProps<T extends string | number> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible label for the group. */
  ariaLabel?: string;
  /** Compact segments (smaller touch target). */
  compact?: boolean;
  /** Full-width track with equal-width segments. */
  block?: boolean;
  className?: string;
}

/**
 * Segmented control — grouped mutually-exclusive options inside a single
 * rounded, inset-hairline track. The active segment is a filled, raised pill;
 * inactive segments are muted and lift on hover. Presentation only: callers
 * own the value + onChange. Reduced-motion is handled by the global opt-out.
 */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  compact = false,
  block = false,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'items-center gap-0.5 p-0.5 rounded-[var(--rad-md)]',
        'bg-surface-sunken border border-line',
        block ? 'flex w-full' : 'inline-flex',
        className,
      )}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={isActive}
            className={cn(
              'inline-flex items-center justify-center rounded-[var(--rad-sm)]',
              'text-[length:var(--fs-sm)] font-medium whitespace-nowrap cursor-pointer',
              'transition-[background-color,color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-standard)]',
              'active:translate-y-px',
              compact ? 'min-h-[var(--target-compact)] px-2.5 py-1' : 'min-h-[var(--target-min)] px-3 py-1.5',
              block && 'flex-1',
              isActive
                ? cn('bg-surface-raised text-fg-strong shadow-[var(--elev-1)]', opt.activeClassName)
                : cn('text-fg-muted hover:text-fg hover:bg-surface-hover', opt.inactiveClassName),
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
