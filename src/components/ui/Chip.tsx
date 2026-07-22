import React from 'react';
import { cn } from '../../lib/cn';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selected (active) state — also reflected via aria-pressed. */
  selected?: boolean;
}

/** Pill-shaped selectable chip (category filters, tags). */
export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ selected = false, className, type, children, ...rest }, ref) => (
    <button
      ref={ref}
      type={type ?? 'button'}
      aria-pressed={selected}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[var(--rad-full)] border',
        'px-3 min-h-[var(--target-compact)] text-[length:var(--fs-xs)] font-medium',
        'cursor-pointer transition-colors whitespace-nowrap',
        selected
          ? 'bg-accent text-on-accent border-transparent'
          : 'bg-surface text-fg-muted border-line hover:bg-surface-hover hover:text-fg',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  ),
);
Chip.displayName = 'Chip';
